from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path

from app.core.db import Base, SessionLocal, engine
from app.models import db_models  # noqa: F401
from app.routers import auth, dashboard, documents, forms, jsa, sync, templates
from app.routers import analytics, teams, actions, notifications, audit
from app.services.seed import seed_defaults

app = FastAPI(title="RigPro JSA API", version="1.0.0")


@app.on_event("startup")
def on_startup() -> None:
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        seed_defaults(db)

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
Path("storage").mkdir(parents=True, exist_ok=True)
app.mount("/storage", StaticFiles(directory="storage"), name="storage")
