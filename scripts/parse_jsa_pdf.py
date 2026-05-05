from pathlib import Path
import re
from PyPDF2 import PdfReader

BASE_DIR = Path(__file__).resolve().parents[1]
PDF_PATH = BASE_DIR / "tmp" / "jsa-bbe8eedd.pdf"

# Load hazard master mapping from hazard_engine for name->id mapping
HAZARD_MASTER = {
    1: "Manual Handling",
    2: "Hand Tools",
    5: "Lifting Equipment",
    8: "Ladder Use",
    14: "Dropped Objects",
    18: "Working at Height",
    21: "Cranes and Loads",
    22: "Air Particulates",
    23: "Chemical Exposure",
    24: "Portable Power",
    25: "Hot Surfaces",
}
NAME_TO_ID = {v: k for k, v in HAZARD_MASTER.items()}

if not PDF_PATH.exists():
    print(f"PDF not found: {PDF_PATH}")
    raise SystemExit(1)

reader = PdfReader(str(PDF_PATH))
all_text = "\n".join(page.extract_text() or "" for page in reader.pages)

# Find question lines (e.g., "Safety question 1" or lines starting with "Question")
question_pattern = re.compile(r"(Safety question\s*\d+|Question\s*\d+|Q\d+)", re.IGNORECASE)
questions = question_pattern.findall(all_text)

# Also try to extract question + answer patterns like "Safety question 1: Yes"
qa_pattern = re.compile(r"(Safety question\s*\d+)[^A-Za-z0-9]{0,6}(Yes|No)", re.IGNORECASE)
qa_matches = qa_pattern.findall(all_text)

# Find hazard names present
found_hazards = []
for name in NAME_TO_ID.keys():
    if re.search(re.escape(name), all_text, re.IGNORECASE):
        hid = NAME_TO_ID[name]
        # find pre/post scores nearby
        # search for pattern like 'Pre: 3 x 3 = 9' and 'Post: 2 x 3 = 6' in vicinity of name
        loc = all_text.lower().find(name.lower())
        snippet = all_text[max(0, loc-200):loc+400]
        pre_match = re.search(r"Pre[:\s]*([0-9])\s*[x×]\s*([0-9])\s*=\s*([0-9]+)", snippet, re.IGNORECASE)
        post_match = re.search(r"Post[:\s]*([0-9])\s*[x×]\s*([0-9])\s*=\s*([0-9]+)", snippet, re.IGNORECASE)
        found_hazards.append({
            "hazard_id": hid,
            "name": name,
            "pre": {
                "likelihood": int(pre_match.group(1)) if pre_match else None,
                "severity": int(pre_match.group(2)) if pre_match else None,
                "score": int(pre_match.group(3)) if pre_match else None,
            },
            "post": {
                "likelihood": int(post_match.group(1)) if post_match else None,
                "severity": int(post_match.group(2)) if post_match else None,
                "score": int(post_match.group(3)) if post_match else None,
            },
            "controls_snippet": snippet[:200].strip()
        })

# Also try to capture PPE checklist items (simple heuristic)
ppe_section_match = re.search(r"PPE Checklist(.*?)(?:Submit for Supervisor|Back to Dashboard)", all_text, re.IGNORECASE | re.S)
ppe_items = []
if ppe_section_match:
    ppe_text = ppe_section_match.group(1)
    # find bullet-like lines
    ppe_items = [line.strip().strip('-•') for line in ppe_text.splitlines() if line.strip()][:10]

result = {
    "questions_found": list(dict.fromkeys(questions)),
    "qa_pairs_found": qa_matches,
    "hazards_found": found_hazards,
    "ppe_items": ppe_items,
}

import json
print(json.dumps(result, indent=2))
