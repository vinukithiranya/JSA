from app.core.db import engine
from sqlalchemy import text

with engine.connect() as conn:
    cols = [r[1] for r in conn.execute(text("PRAGMA table_info('jsa_records')")).all()]
    if 'summary_json_url' not in cols:
        conn.execute(text("ALTER TABLE jsa_records ADD COLUMN summary_json_url TEXT"))
        print('Added summary_json_url')
    else:
        print('summary_json_url exists')

    if 'summary_csv_url' not in cols:
        conn.execute(text("ALTER TABLE jsa_records ADD COLUMN summary_csv_url TEXT"))
        print('Added summary_csv_url')
    else:
        print('summary_csv_url exists')
