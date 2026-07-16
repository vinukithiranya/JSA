# RigPro JSA — Project Handover Document

**Prepared by:** Vinuki Thiranya (Intern)
**Date:** June 2026
**Recipient:** Next developer / system administrator

---

## 1. Project Overview

**RigPro JSA** (Job Safety Assessment) is a full-stack web application built for maritime and rigging operations. It enables field technicians and supervisors to create and manage Job Safety Assessments, conduct site inspections, report safety issues, track corrective actions, manage assets, and maintain compliance records.

**Live backend (Railway):** `https://rigpro-backend-production.up.railway.app`

**Version:** 2.0.0

---

## 2. Tech Stack

| Layer | Technology | Version |
|---|---|---|
| Frontend | React + TypeScript | 18.3.1 / 5.8.3 |
| Frontend build | Vite | 5.4.19 |
| Styling | Tailwind CSS | 3.4.17 |
| Routing | React Router | 6.30.1 |
| Backend | FastAPI | 0.115.12 |
| Server | Uvicorn | 0.34.2 |
| ORM | SQLAlchemy | 2.0.40 |
| Validation | Pydantic | 2.11.4 |
| PDF generation | ReportLab | 4.0.9 |
| Database (dev) | SQLite | — |
| Database (prod) | PostgreSQL | 15 |
| Container | Docker + Docker Compose | — |

---

## 3. Repository Layout

```
JAS/
├── backend/
│   ├── app/
│   │   ├── core/
│   │   │   └── db.py              # SQLAlchemy engine + session factory
│   │   ├── models/
│   │   │   └── db_models.py       # All 20 ORM table definitions
│   │   ├── routers/               # One file per API group (auth, jsa, issues, …)
│   │   ├── schemas/
│   │   │   └── models.py          # Pydantic request/response schemas
│   │   ├── services/
│   │   │   ├── hazard_engine.py   # Rule-based hazard detection
│   │   │   ├── pdf_service.py     # PDF report generation
│   │   │   ├── summary_service.py # JSON/CSV export builder
│   │   │   ├── notifications.py   # Notification helpers
│   │   │   ├── rbac.py            # Role-based access control
│   │   │   ├── mappers.py         # ORM ↔ Pydantic conversion
│   │   │   ├── store.py           # ID generator (prefix + random hex)
│   │   │   └── seed.py            # Default users + inspection templates
│   │   └── main.py                # FastAPI app entry, router registration
│   ├── tests/                     # pytest test files
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── pages/                 # One file per page (~24 pages)
│   │   ├── components/            # Shared UI components (Layout, etc.)
│   │   ├── api.ts                 # Axios-based API client
│   │   ├── offlineQueue.ts        # Offline JSA queue (IndexedDB)
│   │   └── App.tsx                # React Router configuration
│   ├── .env.production            # VITE_API_URL for Railway deployment
│   └── package.json
├── storage/                       # Generated PDFs and uploaded documents
│   ├── reports/                   # JSA and inspection PDFs
│   └── documents/                 # Uploaded document files
├── Dockerfile                     # Multi-stage: Node build → Python serve
├── docker-compose.yml             # One-command local stack
└── railway.toml                   # Railway deployment config
```

---

## 4. Environment Variables

### Backend

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | `sqlite:///./rigpro.db` | Database connection string |
| `PORT` | `8000` | Server port (injected automatically by Railway/Render) |

For PostgreSQL (production):
```
DATABASE_URL=postgresql+psycopg2://user:password@host:5432/dbname
```

The app automatically converts `postgres://` → `postgresql://` for Railway/Render compatibility.

### Frontend

| Variable | Example | Description |
|---|---|---|
| `VITE_API_URL` | `https://rigpro-backend-production.up.railway.app` | Backend API base URL |
| `VITE_BASE_URL` | `/JSA/` | Base path for the SPA |

These are set in `frontend/.env.production` for the deployed build.

---

## 5. Running Locally

### Option A — Docker Compose (recommended, full PostgreSQL stack)

```bash
# From the repo root
docker compose up --build
```

- App: http://localhost:8000
- API docs (Swagger): http://localhost:8000/docs
- Database: PostgreSQL on localhost:5432

### Option B — Development mode (hot-reload)

**Backend:**
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

**Frontend (separate terminal):**
```bash
cd frontend
npm install
npm run dev          # Vite dev server on http://localhost:5173
```

With Option B, Vite proxies `/api/` requests to the backend on port 8000.

---

## 6. Default Login Credentials

These are seeded automatically on the first run.

| Email | Password | Role |
|---|---|---|
| admin@rigpro.com | admin123 | Admin |
| supervisor@rigpro.com | super123 | Supervisor |
| tech@rigpro.com | tech123 | Technician |

> **Security note:** Passwords are stored in plain text in the seed. This must be changed before any production rollout to real users — hash passwords with bcrypt or argon2.

---

## 7. User Roles & Permissions

| Role | Capabilities |
|---|---|
| **technician** | Create/submit JSAs, conduct inspections, report issues, complete actions |
| **supervisor** | Everything above + approve JSAs & inspections, manage teams, create announcements |
| **admin** | Everything above + manage users, templates, credentials, contractors, assets |
| **view_only** | Read-only access |

Role checks are enforced in `backend/app/services/rbac.py` via `check_permission()`.

---

## 8. Core Workflows

### JSA Creation
1. Technician creates a **draft** JSA (job number, boat name, date, location)
2. Adds **work steps** (list of task descriptions)
3. Answers a **25-question safety checklist**
4. System runs the **hazard engine** — auto-detects hazards and required PPE from steps + answers
5. Technician reviews hazards and **submits** for approval
6. Supervisor reviews, adds comments, and **approves** with digital signature
7. System generates a **PDF report** and CSV/JSON summary exports

### Inspection
1. Admin/supervisor creates an **inspection schedule** linked to a template
2. System auto-generates 8 occurrence records based on frequency (daily/weekly/monthly)
3. Technician opens a pending occurrence and **conducts** the inspection (answers questions, flags items)
4. Answers auto-save on every change
5. On completion, supervisor **approves** with signature
6. PDF report generated

### Issue → Action flow
1. Anyone reports a **safety issue** (hazard, near-miss, observation, incident)
2. Supervisors are notified automatically if priority is **high**
3. Supervisor assigns issue; tech updates status (open → in_progress → resolved)
4. **Corrective/preventive actions** can be linked to issues and assigned to individuals
5. Assignee notified on creation; creator notified on completion

---

## 9. API Structure

All routes are prefixed with `/api/`. Interactive API docs at `/docs` (Swagger UI).

| Router file | Prefix | Responsibility |
|---|---|---|
| auth.py | `/api/auth` | Login |
| dashboard.py | `/api/dashboard` | KPI summary |
| jsa.py | `/api/jsa` | JSA CRUD + hazard analysis + PDF |
| templates.py | `/api/templates` | Form template management |
| forms.py | `/api/forms` | Form builder |
| inspections.py | `/api/inspections` | Inspection conduct + approval |
| scheduling.py | `/api/schedules` | Recurring schedules + occurrences |
| issues.py | `/api/issues` | Issue reporting + comments |
| actions.py | `/api/actions` | Corrective action tracking + comments |
| analytics.py | `/api` | Analytics summaries |
| teams.py | `/api/teams` | Team + member management |
| notifications.py | `/api/notifications` | In-app notification inbox |
| audit.py | `/api/audit` | Audit log |
| assets.py | `/api/assets` | Equipment inventory + readings |
| contractors.py | `/api/contractors` | Contractor management |
| investigations.py | `/api/investigations` | Incident investigations |
| headsup.py | `/api/headsup` | Broadcast announcements |
| credentials.py | `/api/credentials` | Worker licenses + certifications |
| documents.py | `/api/documents` | File uploads + versioning |
| sync.py | `/api/sync` | Offline JSA batch sync |

---

## 10. Key Services

| File | What it does |
|---|---|
| `hazard_engine.py` | Matches 25 maritime hazards against work steps (keyword matching) and questionnaire answers (trigger rules). Calculates pre/post risk scores (likelihood × severity, scale 1–3). |
| `pdf_service.py` | Generates formatted JSA and inspection PDF reports using ReportLab. Embeds base64-encoded digital signatures as images. Brand colours: green `#377133`. |
| `summary_service.py` | Exports a JSA's hazard data as structured JSON and CSV files saved to `storage/`. |
| `notifications.py` | `notify()` creates a single notification; `notify_supervisors()` broadcasts to all supervisors/admins. |
| `rbac.py` | `check_permission(user_id, required_role, db)` — raises HTTP 403 if the user lacks the required role. |
| `store.py` | `new_id(prefix)` — generates string IDs like `jsa-abc123def456`. |
| `seed.py` | On first boot seeds 3 default users and 4 inspection templates. |

---

## 11. Storage

Files are written to the `storage/` directory at the project root (or `/app/storage/` in Docker).

| Path | Contents |
|---|---|
| `storage/reports/` | Generated JSA and inspection PDFs |
| `storage/documents/` | User-uploaded document files |

In Docker Compose this directory is bind-mounted (`./storage:/app/storage`) so files persist between container restarts.

---

## 12. Database

The app uses **SQLAlchemy** with auto-migration on startup (`Base.metadata.create_all()`). Additional `ALTER TABLE` statements in `main.py` handle columns added after the initial schema.

- **Local dev:** SQLite (`rigpro.db` in the backend directory)
- **Production:** PostgreSQL 15 (Railway or Render)

See `DATABASE_DOCUMENT.md` in this repo for the full schema reference.

---

## 13. Seeded Inspection Templates

| ID | Name | Category |
|---|---|---|
| tpl-0 | Full Feature Test Template | Safety |
| tpl-1 | Marine Vessel Safety Inspection | Inspection |
| tpl-2 | Hot Work Permit | Inspection |
| tpl-3 | Equipment Pre-Use Inspection | Inspection |

---

## 14. Frontend Pages Reference

| Page file | Route | Description |
|---|---|---|
| LoginPage.tsx | `/login` | Authentication |
| DashboardPage.tsx | `/` | KPI overview |
| JsaWizardPage.tsx | `/jsa/new` | Multi-step JSA creation |
| JsaReportPage.tsx | `/jsa/:id` | JSA report + PDF |
| InspectionsPage.tsx | `/inspections` | Inspection list |
| InspectionConductPage.tsx | `/inspections/:id/conduct` | Conduct inspection |
| InspectionReportPage.tsx | `/inspections/:id/report` | Inspection report |
| TemplatesPage.tsx | `/templates` | Template list |
| TemplateBuilderPage.tsx | `/templates/:id/edit` | Visual form builder |
| IssuesPage.tsx | `/issues` | Issue reporting + tracking |
| ActionsPage.tsx | `/actions` | Corrective action tracking |
| SchedulingPage.tsx | `/scheduling` | Recurring inspection schedules |
| DocumentsPage.tsx | `/documents` | Document library |
| AssetsPage.tsx | `/assets` | Asset inventory |
| ContractorsPage.tsx | `/contractors` | Contractor management |
| CredentialsPage.tsx | `/credentials` | Worker certifications |
| InvestigationsPage.tsx | `/investigations` | Incident investigations |
| HeadsUpPage.tsx | `/headsup` | Broadcast announcements |
| AnalyticsPage.tsx | `/analytics` | Analytics dashboard |
| SyncPage.tsx | `/sync` | Offline JSA batch upload |

---

## 15. Known Limitations & Technical Debt

1. **Plain-text passwords** — Seed users have unhashed passwords (`admin123`, etc.). A real auth system should use bcrypt/argon2 and JWT tokens.
2. **No authentication middleware** — The current auth router issues a user object but there is no JWT guard on protected endpoints; any caller can pass any `user_id`.
3. **No foreign key constraints** — Related IDs (e.g. `team_id`, `issue_id`) are stored as plain strings with no database-level FK enforcement.
4. **SQLite in dev** — SQLite does not enforce column types or support all SQL features; test against PostgreSQL before deploying schema changes.
5. **CORS is open** — `allow_origins=["*"]` in production; should be restricted to the frontend domain.
6. **Storage is local filesystem** — Uploaded files and PDFs are stored on disk; in a multi-instance or serverless deployment this needs to be replaced with object storage (e.g. S3/Cloudflare R2).
7. **No pagination** — Most list endpoints return all records. Large datasets will cause slow responses.

---

## 16. Deployment (Railway)

The project is currently deployed on Railway.

- The backend is auto-deployed from the `main` branch via `railway.toml`
- PostgreSQL is provided as a Railway managed service
- Environment variable `DATABASE_URL` is injected by Railway
- The Docker multi-stage build compiles the React app and bundles it with the FastAPI server (served as static files under `/`)

To redeploy manually:
```bash
railway up
```

---

## 17. Running Tests

```bash
cd backend
pytest tests/
```

Test files:
- `tests/test_notifications.py` — notification creation and read flows
- `tests/test_score_calc.py` — hazard risk score calculation logic

---

## 18. Contacts / Handover Notes

This system was developed as an internship project. The codebase is self-contained and documented. For questions about design decisions or planned features, refer to the git commit history which contains detailed commit messages for each change.
