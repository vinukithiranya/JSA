from pathlib import Path
import csv
import json
from io import BytesIO
from app.schemas.models import AnalyzeResponse, HazardOut

STORAGE = Path("storage")


def build_summary(jsa_out) -> dict:
    # jsa_out is Pydantic model/dict-like
    hazards = jsa_out.hazards or []
    # compute aggregates
    total_pre = 0
    total_post = 0
    count = 0
    counts_by_hazard = {}
    for h in hazards:
        hid = int(h.hazard_id)
        counts_by_hazard[hid] = counts_by_hazard.get(hid, 0) + 1
        total_pre += int(h.pre_score)
        total_post += int(h.post_score)
        count += 1

    avg_pre = (total_pre / count) if count else 0
    avg_post = (total_post / count) if count else 0

    summary = {
        "id": jsa_out.id,
        "job_number": jsa_out.job_number,
        "boat_name": jsa_out.boat_name,
        "service_log_number": jsa_out.service_log_number,
        "location": jsa_out.location,
        "date": str(jsa_out.date),
        "steps": jsa_out.steps,
        "answers": jsa_out.answers,
        "hazards": [h.model_dump() if hasattr(h, "model_dump") else h for h in hazards],
        "ppe_list": jsa_out.ppe_list,
        "aggregates": {
            "count_hazards": count,
            "avg_pre_score": avg_pre,
            "avg_post_score": avg_post,
            "counts_by_hazard": counts_by_hazard,
        },
    }
    return summary


def save_summary_files(jsa_out, summary: dict) -> tuple[str, str]:
    reports_dir = STORAGE / "summaries"
    reports_dir.mkdir(parents=True, exist_ok=True)
    json_path = reports_dir / f"{jsa_out.id}.summary.json"
    csv_path = reports_dir / f"{jsa_out.id}.summary.csv"

    # write json
    json_path.write_text(json.dumps(summary, indent=2), encoding="utf-8")

    # write csv for hazards
    hazards = summary.get("hazards", [])
    with open(csv_path, "w", newline="", encoding="utf-8") as fh:
        writer = csv.writer(fh)
        writer.writerow(["hazard_id", "hazard_name", "pre_likelihood", "pre_severity", "pre_score", "post_likelihood", "post_severity", "post_score", "controls", "ppe"])
        for h in hazards:
            writer.writerow([
                h.get("hazard_id"),
                h.get("hazard_name"),
                h.get("pre_likelihood"),
                h.get("pre_severity"),
                h.get("pre_score"),
                h.get("post_likelihood"),
                h.get("post_severity"),
                h.get("post_score"),
                h.get("controls"),
                h.get("ppe"),
            ])

    return str(json_path), str(csv_path)
