.PHONY: plan-check plan-status plan-render setup check format demo base-check

setup:
	uv sync --locked --group fixtures
	npm ci

check: plan-check
	uv run --no-sync ruff check packages/core plugins/fixtures/demo scripts/contracts.py scripts/demo.py
	uv run --no-sync ruff format --check packages/core plugins/fixtures/demo scripts/contracts.py scripts/demo.py
	uv run --no-sync mypy
	uv run --no-sync pytest -q
	npm run contracts:check
	npm run typecheck
	npm run build
	npm test

format:
	uv run --no-sync ruff check packages/core plugins/fixtures/demo scripts/contracts.py scripts/demo.py --fix
	uv run --no-sync ruff format packages/core plugins/fixtures/demo scripts/contracts.py scripts/demo.py

demo:
	uv run --no-sync python scripts/demo.py

base-check:
	uv sync --locked
	uv run --no-sync pytest -q -m 'not installed_fixture'
	uv run --no-sync python -c 'from opentavus_core.registry import discover_installed; assert discover_installed() == []'

plan-check:
	python3 scripts/plan.py check

plan-status:
	python3 scripts/plan.py status

plan-render:
	python3 scripts/plan.py render
