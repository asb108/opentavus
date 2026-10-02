.PHONY: plan-check plan-status plan-render setup check format demo base-check models doctor run dev

PYTHON_PATHS = packages/core packages/runtime plugins/fixtures/demo plugins/local apps/api scripts

setup:
	uv sync --locked --group app --group fixtures
	npm ci

check: plan-check
	python3 scripts/plugin_manifests.py --check
	uv run --no-sync ruff check $(PYTHON_PATHS)
	uv run --no-sync ruff format --check $(PYTHON_PATHS)
	uv run --no-sync mypy
	uv run --no-sync pytest -q
	npm run contracts:check
	npm run typecheck
	npm run lint
	npm run format:check
	npm run build
	npm test

format:
	uv run --no-sync ruff format $(PYTHON_PATHS)
	uv run --no-sync ruff check $(PYTHON_PATHS) --fix
	uv run --no-sync ruff format $(PYTHON_PATHS)
	python3 scripts/plugin_manifests.py
	npm run format

demo:
	uv run --no-sync python scripts/demo.py

base-check:
	UV_PROJECT_ENVIRONMENT=.cache/base-env uv sync --locked
	UV_PROJECT_ENVIRONMENT=.cache/base-env uv run --no-sync pytest -q packages/core/tests -m 'not installed_fixture'
	UV_PROJECT_ENVIRONMENT=.cache/base-env uv run --no-sync python -c 'from opentavus_core.registry import discover_installed; assert discover_installed() == []'

models:
	uv sync --locked --group app --group models --group fixtures
	uv run --no-sync opentavus setup

doctor:
	uv run --no-sync opentavus doctor

run:
	npm run build
	uv run --no-sync opentavus serve

dev:
	npm run dev --workspace @opentavus/web

plan-check:
	python3 scripts/plan.py check

plan-status:
	python3 scripts/plan.py status

plan-render:
	python3 scripts/plan.py render
