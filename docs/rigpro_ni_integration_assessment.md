# RigPro × North Intelligence — Integration Assessment

**Ask:** Integrate RigPro into the North Intelligence platform to lower development and maintenance cost.

**Recommendation: Do not fully integrate. Keep RigPro standalone, connected only via shared login and a navigation link.**

---

## Key Conflicts (from auditing the North Intelligence codebase directly)

- **Database layer:** North Intelligence bans ORMs by formal decision (ADR-001) — everything is raw SQL. RigPro is built entirely on SQLAlchemy ORM. Merging means rewriting RigPro's entire data layer.
- **Frontend stack:** North Intelligence runs Create React App + Material UI. RigPro runs Vite + React with no Material UI. Merging means rebuilding RigPro's UI to match.
- **Authentication:** North Intelligence trusts Azure Easy Auth headers with no token validation in code. RigPro uses its own JWT login. Merging means replacing RigPro's auth model entirely.
- **No plugin system:** Adding a "service" to North Intelligence means manually wiring code into ~7 separate places — there is no registry or framework support for it, even for their own existing services.
- **Shared blast radius:** One merged app means one deploy pipeline and one process — a bug in either app can take down the other.
- **Offline capability at risk:** RigPro supports offline data entry for field use. North Intelligence's frontend shows no equivalent offline support; porting this is a data-loss risk, not just extra effort.

---

## Why Full Integration Is Not Worth It

Full integration requires rewriting RigPro's database layer, authentication, and frontend framework — a multi-week-to-multi-month rewrite of a working production application (17 domains, ~35 active users). The infrastructure savings from merging (one database, one App Service instead of two) are modest — roughly **$30–70/month** based on RigPro's own hosting estimates. That saving does not come close to justifying the engineering cost and risk of the rewrite, particularly the risk to offline data capture for field inspections.

---

## Best Method: Lightweight Integration

1. Put RigPro behind the same Azure AD / SSO tenant North Intelligence uses, so staff log in once.
2. Add a tile or link for RigPro on North Intelligence's home page, pointing to RigPro's own URL.
3. Keep RigPro's own database, backend, and frontend exactly as they are.

This delivers the "one login, one place to find our tools" outcome the integration request is really after, without the cost or risk of rewriting a working application.
