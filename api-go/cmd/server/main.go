package main

import (
	"log"
	"net/http"
	"os"

	analyticsstore "cdn-demo/api-go/internal/analytics"
	"cdn-demo/api-go/internal/db"
	httpapi "cdn-demo/api-go/internal/http"
	"cdn-demo/api-go/internal/state"
)

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "4001"
	}
	addr := ":" + port
	databaseURL := os.Getenv("DATABASE_URL")
	if databaseURL == "" {
		databaseURL = "postgres://postgres:postgres@127.0.0.1:5433/cdn_demo?sslmode=disable"
	}

	client, err := db.Open(databaseURL)
	if err != nil {
		log.Fatalf("failed to connect to postgres: %v", err)
	}
	defer client.Close()

	store := state.NewStore(client, analyticsstore.OpenFromEnv())
	server := httpapi.NewServer(store)
	mux := http.NewServeMux()
	server.Register(mux)
	log.Printf("go control API listening on %s", addr)
	if err := http.ListenAndServe(addr, mux); err != nil {
		log.Fatal(err)
	}
}
