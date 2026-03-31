CREATE DATABASE IF NOT EXISTS cdn_demo;

CREATE TABLE IF NOT EXISTS cdn_demo.request_events (
  request_id String,
  trace_id String,
  domain_id String,
  hostname String,
  path String,
  revision_id String,
  cache_status String,
  final_disposition String,
  bytes_served Int32,
  quota_used_bytes Int32,
  quota_limit_bytes Int32,
  message String,
  timestamp DateTime64(3, 'UTC')
) ENGINE = MergeTree
ORDER BY (domain_id, timestamp, request_id);
