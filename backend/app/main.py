from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.core.db import Base, SessionLocal, engine
from app.models import db_models  # noqa: F401
from app.routers import analytics, teams, actions, notifications, audit
from app.routers import auth, dashboard, documents, forms, jsa, sync, templates
from app.routers import issues, scheduling, inspections
from app.routers import assets, contractors, investigations, headsup, credentials
from app.services.seed import seed_defaults


def _run_migration(sql: str) -> None:
    with engine.connect() as conn:
        try:
            conn.execute(__import__("sqlalchemy").text(sql))
            conn.commit()
        except Exception:
            pass


@asynccontextmanager
async def lifespan(_app: FastAPI):
    Base.metadata.create_all(bind=engine)
    _run_migration("ALTER TABLE jsa_records ADD COLUMN supervisor_signature TEXT")
    _run_migration("ALTER TABLE actions ADD COLUMN priority VARCHAR(20) DEFAULT 'medium'")
    _run_migration("ALTER TABLE actions ADD COLUMN due_date DATE")
    _run_migration("ALTER TABLE actions ADD COLUMN labels JSON DEFAULT '[]'")
    _run_migration("ALTER TABLE actions ADD COLUMN action_type VARCHAR(100) DEFAULT 'corrective'")
    _run_migration("ALTER TABLE actions ADD COLUMN linked_issue_id VARCHAR(64)")
    _run_migration("ALTER TABLE actions ADD COLUMN linked_jsa_id VARCHAR(64)")
    _run_migration("ALTER TABLE actions ADD COLUMN created_by VARCHAR(64) DEFAULT 'u-tech'")
    _run_migration("ALTER TABLE notifications ADD COLUMN event_type VARCHAR(50) DEFAULT 'info'")
    _run_migration("ALTER TABLE notifications ADD COLUMN link VARCHAR(500) DEFAULT ''")
    _run_migration("ALTER TABLE inspection_records ADD COLUMN supervisor_signature TEXT")
    with SessionLocal() as db:
        seed_defaults(db)
    yield


app = FastAPI(title="RigPro JSA API", version="2.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["dashboard"])
app.include_router(templates.router, prefix="/api/templates", tags=["templates"])
app.include_router(forms.router, prefix="/api/forms", tags=["forms"])
app.include_router(documents.router, prefix="/api/documents", tags=["documents"])
app.include_router(sync.router, prefix="/api/sync", tags=["sync"])
app.include_router(jsa.router, prefix="/api/jsa", tags=["jsa"])
app.include_router(analytics.router, prefix="/api", tags=["analytics"])
app.include_router(teams.router, prefix="/api/teams", tags=["teams"])
app.include_router(actions.router, prefix="/api/actions", tags=["actions"])
app.include_router(notifications.router, prefix="/api/notifications", tags=["notifications"])
app.include_router(audit.router, prefix="/api/audit", tags=["audit"])
app.include_router(issues.router, prefix="/api/issues", tags=["issues"])
app.include_router(scheduling.router, prefix="/api/schedules", tags=["schedules"])
app.include_router(inspections.router, prefix="/api/inspections", tags=["inspections"])
app.include_router(assets.router, prefix="/api/assets", tags=["assets"])
app.include_router(contractors.router, prefix="/api/contractors", tags=["contractors"])
app.include_router(investigations.router, prefix="/api/investigations", tags=["investigations"])
app.include_router(headsup.router, prefix="/api/headsup", tags=["headsup"])
app.include_router(credentials.router, prefix="/api/credentials", tags=["credentials"])

Path("storage").mkdir(parents=True, exist_ok=True)
app.mount("/storage", StaticFiles(directory="storage"), name="storage")

# ── Serve built React frontend (production / Docker) ──────────────────────────
# In local dev the Vite dev server handles the frontend instead.
_STATIC = Path("static")
if _STATIC.is_dir():
    from fastapi.responses import FileResponse as _FileResp

    _assets = _STATIC / "assets"
    if _assets.is_dir():
        app.mount("/assets", StaticFiles(directory=_assets), name="vite-assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_spa(full_path: str) -> _FileResp:
        candidate = _STATIC / full_path
        target = candidate if candidate.is_file() else _STATIC / "index.html"
        return _FileResp(str(target))
