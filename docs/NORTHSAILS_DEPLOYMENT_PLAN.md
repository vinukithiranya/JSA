# RigPro → Northsails CI/CD & Engineering Standards — Deployment Plan

Source of truth for the target standard: `cicd-architecture.html` (North Intelligence CI/CD) and
`development-guide.html` (North Intelligence dev guide). This plan maps RigPro's **current state**
against that standard. Fully-resolved items have been removed from the gap list below — this document
now tracks **only what's partially done or not started yet**.

---

## 0. Already Resolved (for context only — not part of the remaining plan)

- Passwords are hashed with bcrypt (`passlib`) instead of compared as plaintext.
- CORS is locked to a configured origin list instead of `allow_origins=["*"]`.
- `GET /api/health` added with a real DB ping.
- `frontend/package.json` has a `build:deploy` script.
- Environment-driven configuration (`backend/app/core/config.py` + `.env.example`) replaces scattered `os.getenv` calls.
- A GitHub Actions workflow (`.github/workflows/ci.yml`) runs backend tests + frontend build on every push/PR to `main`/`dev`.
- Design-first doc templates exist at `docs/requirements/TEMPLATE.md` and `docs/design/TEMPLATE.md`.
- A `repositories/` layer now exists (`backend/app/repositories/`) — SQL for every domain (actions, issues, inspections, templates, schedules, notifications, teams, users, assets, contractors, credentials, investigations, headsup, documents, audit) is out of `services/*.py` and routers, verified with a full smoke test across all 17 routers plus the existing test suite (22/22 passing). Also fixed a pre-existing bug found along the way: `create_audit_log` never generated an `id`, so that endpoint was broken before this change.

---

## 1. Outstanding Gaps

### 1.1 Security — partially fixed, needs finishing

1. **Authentication not enforced on routes.** JWT issuance (`core/security.py`), the `get_current_user` dependency (`core/deps.py`), and a real `POST /api/auth/login` + `GET /api/auth/me` all exist and are verified working. **Still missing:** none of the other 17 routers require a token — every endpoint besides `/api/auth/me` still accepts unauthenticated requests. Wiring this in means deciding, per endpoint, which fields (e.g. `created_by`, `reported_by`, `conducted_by`) become derived from the authenticated user instead of client-supplied.
2. **Leaked GitHub PAT — only half-cleaned.** The token has been stripped from the local `github` remote URL (`git remote set-url`), and confirmed never committed to tracked history. **Still required:** the token itself must be revoked on GitHub (Settings → Developer settings → Personal access tokens) — that account (`jayaminivajira0-ship-it`) needs to be accessed by whoever owns it, since this can't be done from the repo.
3. **Example password in `AZURE_DEPLOYMENT_GUIDE.md` — only half-confirmed.** All 4 occurrences of `MySecurePassword123!` are now `<YOUR_SECURE_PASSWORD>` placeholders. **Still needed:** confirmation from you on whether that string was ever used as a real admin password on a deployed PostgreSQL server — if so, it needs rotating.

### 1.2 Git / branching — partially fixed

4. A local `dev` branch exists (created from `main`, not pushed, not switched to). **Still needed:** push it, add branch protection (PR + review required) on `dev` and `main`, delete the stray branches (`deploy3`, `fix-404`, `gh-pages-deploy2`, `gh-pages-local`) and leftover worktrees, and decide the canonical git host (see Open Decision 2).

### 1.3 Database migrations — not started

5. Still schema-managed via `Base.metadata.create_all()` + a hand-rolled `_run_migration()` in `main.py` that runs raw `ALTER TABLE` statements on every startup inside a bare `try/except: pass` (silently swallows real errors). Needs Alembic: `alembic init`, a baseline revision capturing current schema, each ad-hoc `ALTER TABLE` converted into its own versioned migration with `upgrade()`/`downgrade()` and `IF NOT EXISTS` guards, and removal of schema mutation from app startup entirely.

### 1.4 Azure DevOps CI/CD & environments — not started (blocked on Open Decisions 1 & 2)

6. No Azure-specific deploy pipeline yet — the GitHub Actions workflow added covers build+test only, not deployment. Still need: `azure-pipelines.yml` (or equivalent) with Build → Deploy DEV (auto) → Deploy PROD (manual approval); two separate resource groups/App Services/Postgres servers for DEV and PROD; ARM service connections scoped per environment; Azure DevOps (or GitHub) environments with an approval gate on PROD only; a secrets variable group for `DATABASE_URL`/`JWT_SECRET_KEY`/etc. per environment.

### 1.5 Layering & DB conventions

7. `db_models.py` has inconsistent `created_at`/`updated_at`/`created_by`/`updated_by` coverage across tables; still uses custom string PKs (e.g. `u-...`) rather than UUIDs (see Open Decision 4). Not started — blocked on Alembic existing (§1.3) to apply the migration.
8. RigPro remains single-tenant — no `company_id` anywhere (see Open Decision 3). Not started — blocked on stakeholder decision.
9. Design-first templates exist for new work, but no existing service has a backfilled requirements/design doc yet. Not started.

---

## 2. Verification Checklist (remaining, before any environment goes live)

- [ ] Every API endpoint (not just `/api/auth/me`) rejects requests without a valid token
- [ ] `alembic upgrade head` runs clean against a fresh DB and against a copy of current prod-shaped data
- [ ] DEV and PROD point at separate databases and storage
- [ ] PROD deploy pauses for manual approval and is not reachable via direct push to `main`
- [ ] No secrets present in YAML, docs, or source — only in variable groups / App Service settings
- [ ] Leaked PAT confirmed revoked on GitHub
- [ ] Confirmed whether the `AZURE_DEPLOYMENT_GUIDE.md` example password was ever live; rotated if so

---

## 3. Open Decisions (blocking §1.4 and parts of §1.5)

1. **Container (current Dockerfile) vs. ZIP Deploy (Northsails' App Service pattern).** The reference pipeline assumes a non-container App Service with `pip install` + ZIP deploy. RigPro currently builds a Docker image. Which do you want going forward?
2. **Azure DevOps vs. GitHub + Azure Pipelines.** Do you have (or want) a `northsails.visualstudio.com` project for this repo, or should the pipeline run from the existing GitHub repo?
3. **Single-tenant vs multi-company.** Should RigPro adopt `company_id` on all tables (Northsails' default rule), or is it intentionally single-tenant?
4. **UUID PKs.** Worth the migration effort to switch existing string IDs to UUIDs, or keep current IDs and treat that rule as non-binding for this app?
