.PHONY: help
.PHONY: up up-dev build up-full down ps logs logs-api logs-edge logs-ui logs-nginx
.PHONY: health health-all reset reseed reseed-pending reseed-ready
.PHONY: test test-go test-rust test-app build-go build-rust

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  %-20s %s\n", $$1, $$2}'

DEMO_RESET_TOKEN ?= demo-reset
INTERNAL_API_TOKEN ?= demo-internal-token
API_BASE ?= http://127.0.0.1:3000
NGINX_BASE ?= http://127.0.0.1:8080
COMPOSE := env DEMO_RESET_TOKEN=$(DEMO_RESET_TOKEN) INTERNAL_API_TOKEN=$(INTERNAL_API_TOKEN) docker compose

# --- Docker Compose full stack ---

up: ## Start full stack via Docker Compose in detached mode
	$(COMPOSE) up -d

up-full: up ## Alias for up

build: ## Build all service images (no start)
	$(COMPOSE) build

up-dev: ## Start full stack via Docker Compose in foreground with build output
	$(COMPOSE) up --build

down: ## Stop all containers
	$(COMPOSE) down

ps: ## Show container status
	$(COMPOSE) ps

restart: down up ## Restart all containers

# --- Logs ---

logs: ## Tail all service logs
	$(COMPOSE) logs -f

logs-api: ## Tail Go API logs
	$(COMPOSE) logs -f api

logs-edge: ## Tail Rust edge logs
	$(COMPOSE) logs -f edge

logs-ui: ## Tail UI logs
	$(COMPOSE) logs -f ui

logs-nginx: ## Tail Nginx logs
	$(COMPOSE) logs -f nginx

# --- Health checks ---

health: health-all ## Alias for health-all

health-all: ## Check health of all services
	@echo "=== Nginx ingress ===" && curl -sf $(NGINX_BASE)/ || echo "FAIL"
	@echo "=== UI ===" && curl -sf $(API_BASE)/ > /dev/null && echo "OK" || echo "FAIL"
	@echo "=== Rust edge ===" && curl -sf $(NGINX_BASE)/edge/health || echo "FAIL"
	@echo "=== Go API ===" && $(COMPOSE) exec -T api wget -qO- http://127.0.0.1:4001/health || echo "FAIL"
	@echo "=== PostgreSQL ===" && $(COMPOSE) exec -T postgres pg_isready -U postgres -d cdn_demo || echo "FAIL"
	@echo "=== Redis ===" && $(COMPOSE) exec -T redis redis-cli ping || echo "FAIL"
	@echo "=== ClickHouse ===" && $(COMPOSE) exec -T clickhouse wget -qO- http://127.0.0.1:8123/ping || echo "FAIL"

# --- Reset / Reseed ---

reset: ## Reset demo state (clears PG, ClickHouse, Redis, Rust cache)
	@curl -sf -X POST $(API_BASE)/api/reset \
		-H "x-reset-token: $(DEMO_RESET_TOKEN)" \
		| python3 -m json.tool 2>/dev/null || echo "reset failed (check token + health)"

reseed: reseed-ready ## Alias for reseed (defaults to ready mode)

reseed-ready: ## Reseed a fresh ready domain
	@curl -sf -X POST $(API_BASE)/api/reseed \
		-H "x-reset-token: $(DEMO_RESET_TOKEN)" \
		-H "content-type: application/json" \
		-d '{"mode":"ready"}' \
		| python3 -m json.tool 2>/dev/null || echo "reseed failed (check token + health)"

reseed-pending: ## Reseed a fresh pending domain
	@curl -sf -X POST $(API_BASE)/api/reseed \
		-H "x-reset-token: $(DEMO_RESET_TOKEN)" \
		-H "content-type: application/json" \
		-d '{"mode":"pending"}' \
		| python3 -m json.tool 2>/dev/null || echo "reseed failed (check token + health)"

# --- Build / Test ---

build-go: ## Build Go service
	cd api-go && go build ./...

build-rust: ## Build Rust edge (local, not container)
	cd edge-rust && cargo build

test: test-app test-go test-rust ## Run all tests

test-go: ## Run Go tests
	cd api-go && go test ./...

test-rust: ## Run Rust tests
	cd edge-rust && cargo test

test-app: ## Run frontend tests
	npm test

build-app: ## Build Next.js app
	npm run build

# --- Config validation ---

validate-compose: ## Validate docker compose config without starting services
	$(COMPOSE) config > /dev/null && echo "compose config valid"
