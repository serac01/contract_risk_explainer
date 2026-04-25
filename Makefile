# Contract Risk Explainer — dev tasks
#
# Usage:
#   make install   # install backend + web deps
#   make dev       # run backend + web together (Ctrl-C stops both)
#   make backend   # run only the FastAPI backend on :8000
#   make web       # run only the Next.js app on :3000
#   make stop      # kill anything bound to :8000 or :3000

# --- Config (override on the command line, e.g. `make dev PYTHON=python3.12`) ---
PYTHON      ?= /opt/anaconda3/envs/tfmac/bin/python
UVICORN     ?= /opt/anaconda3/envs/tfmac/bin/uvicorn
NPM         ?= npm
BACKEND_PORT ?= 8000
WEB_PORT     ?= 3000

.PHONY: help install install-backend install-web dev backend web stop clean

help:
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN{FS=":.*?## "}{printf "  \033[36m%-14s\033[0m %s\n", $$1, $$2}'

install: install-backend install-web ## install all deps

install-backend: ## install backend Python deps
	$(PYTHON) -m pip install fastapi "uvicorn[standard]" python-multipart python-dotenv pypdf openai

install-web: ## install web npm deps
	cd web && $(NPM) install

dev: ## run backend + web together (Ctrl-C stops both)
	@echo "→ backend on :$(BACKEND_PORT) · web on :$(WEB_PORT)"
	@trap 'kill 0' EXIT INT TERM; \
	  ( cd backend && $(UVICORN) app.main:app --reload --port $(BACKEND_PORT) ) & \
	  ( cd web && $(NPM) run dev -- -p $(WEB_PORT) ) & \
	  wait

backend: ## run only the FastAPI backend
	cd backend && $(UVICORN) app.main:app --reload --port $(BACKEND_PORT)

web: ## run only the Next.js app
	cd web && $(NPM) run dev -- -p $(WEB_PORT)

stop: ## kill anything bound to backend/web ports
	-@lsof -ti tcp:$(BACKEND_PORT) | xargs -r kill -9 2>/dev/null && echo "stopped :$(BACKEND_PORT)" || true
	-@lsof -ti tcp:$(WEB_PORT)     | xargs -r kill -9 2>/dev/null && echo "stopped :$(WEB_PORT)"     || true

clean: ## remove build artifacts (web/.next, __pycache__)
	rm -rf web/.next web/.turbo
	find backend -type d -name __pycache__ -exec rm -rf {} +
