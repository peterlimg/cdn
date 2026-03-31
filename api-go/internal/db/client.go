package db

import (
	"context"
	"database/sql"
	"fmt"
	"os"
	"time"

	_ "github.com/lib/pq"
)

const migrationPath = "migrations/001_initial_control_plane.sql"

type Client struct {
	db *sql.DB
}

func Open(databaseURL string) (*Client, error) {
	database, err := sql.Open("postgres", databaseURL)
	if err != nil {
		return nil, err
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := database.PingContext(ctx); err != nil {
		return nil, err
	}

	schema, err := os.ReadFile(migrationPath)
	if err != nil {
		return nil, err
	}

	if _, err := database.ExecContext(ctx, string(schema)); err != nil {
		return nil, err
	}

	return &Client{db: database}, nil
}

func (c *Client) Ping(ctx context.Context) error {
	if c == nil || c.db == nil {
		return fmt.Errorf("database client is not configured")
	}
	return c.db.PingContext(ctx)
}

func (c *Client) Close() error {
	if c == nil || c.db == nil {
		return nil
	}
	return c.db.Close()
}

func (c *Client) UpsertDomain(id, hostname, status, activeRevision string, payload []byte) error {
	_, err := c.db.Exec(
		`INSERT INTO control_domains (id, hostname, status, active_revision, payload)
		 VALUES ($1, $2, $3, $4, $5::jsonb)
		 ON CONFLICT (id) DO UPDATE
		 SET hostname = EXCLUDED.hostname,
		     status = EXCLUDED.status,
		     active_revision = EXCLUDED.active_revision,
		     payload = EXCLUDED.payload,
		     updated_at = NOW()`,
		id,
		hostname,
		status,
		activeRevision,
		string(payload),
	)
	return err
}

func (c *Client) LoadDomains() ([][]byte, error) {
	rows, err := c.db.Query(`SELECT payload::text FROM control_domains ORDER BY hostname ASC, created_at ASC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var payloads [][]byte
	for rows.Next() {
		var raw string
		if err := rows.Scan(&raw); err != nil {
			return nil, err
		}
		payloads = append(payloads, []byte(raw))
	}
	return payloads, rows.Err()
}

func (c *Client) InsertEvent(requestID, domainID string, createdAt time.Time, payload []byte) error {
	_, err := c.db.Exec(
		`INSERT INTO request_events (request_id, domain_id, created_at, payload)
		 VALUES ($1, $2, $3, $4::jsonb)
		 ON CONFLICT (request_id) DO UPDATE
		 SET domain_id = EXCLUDED.domain_id,
		     created_at = EXCLUDED.created_at,
		     payload = EXCLUDED.payload`,
		requestID,
		domainID,
		createdAt,
		string(payload),
	)
	return err
}

func (c *Client) LoadEvents() ([][]byte, error) {
	rows, err := c.db.Query(`SELECT payload::text FROM request_events ORDER BY created_at DESC, request_id DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var payloads [][]byte
	for rows.Next() {
		var raw string
		if err := rows.Scan(&raw); err != nil {
			return nil, err
		}
		payloads = append(payloads, []byte(raw))
	}
	return payloads, rows.Err()
}

func (c *Client) InsertLog(id, domainID, service string, createdAt time.Time, payload []byte) error {
	_, err := c.db.Exec(
		`INSERT INTO service_logs (id, domain_id, service, created_at, payload)
		 VALUES ($1, $2, $3, $4, $5::jsonb)
		 ON CONFLICT (id) DO UPDATE
		 SET domain_id = EXCLUDED.domain_id,
		     service = EXCLUDED.service,
		     created_at = EXCLUDED.created_at,
		     payload = EXCLUDED.payload`,
		id,
		domainID,
		service,
		createdAt,
		string(payload),
	)
	return err
}

func (c *Client) LoadLogs() ([][]byte, error) {
	rows, err := c.db.Query(`SELECT payload::text FROM service_logs ORDER BY created_at DESC, id DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var payloads [][]byte
	for rows.Next() {
		var raw string
		if err := rows.Scan(&raw); err != nil {
			return nil, err
		}
		payloads = append(payloads, []byte(raw))
	}
	return payloads, rows.Err()
}

func (c *Client) Reset() error {
	_, err := c.db.Exec(`TRUNCATE TABLE service_logs, request_events, control_domains RESTART IDENTITY`)
	return err
}

func ParseTimestamp(value string) time.Time {
	timestamp, err := time.Parse(time.RFC3339, value)
	if err != nil {
		return time.Now().UTC()
	}
	return timestamp
}

func (c *Client) String() string {
	return fmt.Sprintf("postgres-backed client(%p)", c)
}
