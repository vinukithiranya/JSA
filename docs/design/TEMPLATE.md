# Design — [Service / Feature Name]

Linked requirements doc: `docs/requirements/[service].md`

## Data model
New/changed tables, columns, and relationships. Note primary key style, `created_at`/`updated_at`/`created_by`/`updated_by`, and any FK on existing tables.

## API surface
Endpoints (method + path), request/response shapes, auth requirements (`get_current_user`, role checks).

## Layering
- **Repository** (`backend/app/repositories/<domain>/`) — SQL only
- **Service** (`backend/app/services/<domain>/`) — business logic only
- **Router** — thin: auth check + delegate

## Migration plan
Alembic revision(s) needed, and whether the change is backward compatible with existing data.

## Frontend
Where new components live under `frontend/src/components/<service>/`, and which pages/routes change.

## Alternatives considered
Briefly note other approaches and why this one was chosen.
