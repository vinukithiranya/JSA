from app.schemas.models import HazardOut

# Maps question ID → hazard IDs triggered when answered "Yes"
QUESTION_TO_HAZARDS: dict[str, list[int]] = {
    "q1":  [1],       "q2":  [2],       "q3":  [3],       "q4":  [5],
    "q5":  [6, 12],   "q6":  [7],       "q7":  [8],       "q8":  [9],
    "q9":  [10],      "q10": [11, 17],  "q11": [13],      "q12": [18, 14],
    "q13": [19, 14],  "q14": [14],      "q15": [15],      "q16": [16],
    "q17": [17],      "q18": [20],      "q19": [21, 14],  "q20": [21, 5],
    "q21": [5, 21],   "q22": [22],
    "q23": [23],      "q24": [24],      "q25": [25],
}

# Low = l:1 s:2 (score 2), Medium = l:2 s:2 (score 4), High = l:3 s:3 (score 9)
HAZARD_MASTER: dict[int, dict] = {
    1:  {"name": "Manual Handling",              "controls": "Correct lifting techniques; Team lift >20kg or awkward; Gloves; Safety footwear",                          "ppe": "Gloves; Safety footwear",                             "l": 1, "s": 2},
    2:  {"name": "Hand Tools",                   "controls": "Safe operation; Safe storage; Correct PPE; Do not use damaged tools",                                     "ppe": "Gloves; Eye protection; Safety footwear",             "l": 1, "s": 2},
    3:  {"name": "Trip Hazards",                 "controls": "Good housekeeping; Safe stacking/storage; Remove rubbish; Safety footwear",                               "ppe": "Safety footwear",                                     "l": 1, "s": 2},
    4:  {"name": "Pinch and Nip Hazards",        "controls": "Competent assembly; Trained removal; Gloves",                                                             "ppe": "Gloves; Safety footwear",                             "l": 2, "s": 2},
    5:  {"name": "Lifting Equipment",            "controls": "Certified slings/shackles; No damage",                                                                    "ppe": "Helmet; Gloves; Eye protection; Safety footwear",     "l": 3, "s": 3},
    6:  {"name": "Feet Hazards",                 "controls": "Awareness of hazards; Enclosed footwear; Avoid under-height work",                                        "ppe": "Safety footwear",                                     "l": 1, "s": 2},
    7:  {"name": "Slip Hazards",                 "controls": "Awareness; Tidy area; Wipe spills; Remove rubbish; Footwear/overshoes; Lifelines",                        "ppe": "Safety footwear; Overshoes",                          "l": 2, "s": 2},
    8:  {"name": "Ladder",                       "controls": "Trained users; Correct type; Certified; Correct positioning; Isolate below",                              "ppe": "Safety footwear; Helmet",                             "l": 2, "s": 2},
    9:  {"name": "Forklift",                     "controls": "Trained operators; Approved attachments; Signage",                                                        "ppe": "Hi-Vis; Safety footwear",                             "l": 3, "s": 3},
    10: {"name": "Hydraulics",                   "controls": "Report issues; Trained workers",                                                                          "ppe": "Gloves; Safety footwear",                             "l": 2, "s": 2},
    11: {"name": "Traffic",                      "controls": "Cordon with cones; Hi-Vis",                                                                               "ppe": "Hi-Vis; Safety footwear",                             "l": 1, "s": 2},
    12: {"name": "Open Hatches",                 "controls": "Advise personnel; Close hatches; Trained only",                                                           "ppe": "Safety footwear; Helmet",                             "l": 2, "s": 2},
    13: {"name": "Weather/Environment",          "controls": "Sun protection; Lightning stop; Dust mask",                                                               "ppe": "Sun protection; Dust mask; Safety footwear",          "l": 2, "s": 2},
    14: {"name": "Items Dropped from Height",    "controls": "Lanyards; Clear below; Helmets/footwear",                                                                 "ppe": "Helmet; Safety footwear",                             "l": 3, "s": 3},
    15: {"name": "High Load Equipment",          "controls": "Trained only; Assess area; Notify",                                                                       "ppe": "Gloves; Safety footwear",                             "l": 2, "s": 2},
    16: {"name": "Winches",                      "controls": "Trained operators; No loose clothing",                                                                    "ppe": "No loose clothing; Safety footwear; Gloves",          "l": 2, "s": 2},
    17: {"name": "Pedestrians",                  "controls": "Load/unload away; Cordon; Escort pedestrians; Hi-Vis",                                                    "ppe": "Hi-Vis; Safety footwear",                             "l": 1, "s": 2},
    18: {"name": "Working at Height (>2m)",      "controls": "Trained only; Working Aloft procedures; Helmet/harness; Radios; Suspension trauma plan",                  "ppe": "Helmet; Harness + Lanyard; Radios; Safety footwear",  "l": 3, "s": 3},
    19: {"name": "Working at Height (<2m)",      "controls": "Trained only; Edge awareness; 3 points of contact; Short ladder work",                                    "ppe": "Safety footwear; Helmet",                             "l": 2, "s": 2},
    20: {"name": "Electricity",                  "controls": "Use near power; RCDs; Keep dry; Report damage",                                                           "ppe": "Gloves; Safety footwear; RCD device",                 "l": 2, "s": 2},
    21: {"name": "Cranes",                       "controls": "Qualified operator; Certified crane; Outriggers; Clear slew area; Hook latch; Taglines; No one under load","ppe": "Helmet; Gloves; Safety footwear; Hi-Vis",             "l": 3, "s": 3},
    22: {"name": "Air Particulates (Dust)",      "controls": "Extraction/ventilation; Enclose area; Respiratory+eye protection",                                        "ppe": "Respirator; Eye protection; Gloves; Safety footwear", "l": 2, "s": 2},
    23: {"name": "Resins/Solvents",              "controls": "Ventilation; PPE; Eyewash; Safe containers",                                                              "ppe": "Gloves; Respirator; Eye protection; Safety footwear", "l": 2, "s": 2},
    24: {"name": "Carbon Monoxide (Generators)", "controls": "Use outdoors; Avoid enclosed spaces; Airflow control",                                                    "ppe": "Respirator; Safety footwear",                         "l": 3, "s": 3},
    25: {"name": "Fire from Ovens (Curing)",     "controls": "Temperature control; Keep combustibles away; Heat PPE",                                                   "ppe": "Heat-resistant gloves; Eye protection; Safety footwear","l": 3, "s": 3},
}

KEYWORD_MAP: dict[int, list[str]] = {
    1:  ["lift", "carry", "manual", "heavy", "handling"],
    5:  ["sling", "shackle", "rigging", "hoist"],
    8:  ["ladder"],
    9:  ["forklift", "fork lift"],
    14: ["drop", "overhead"],
    18: ["mast", "climb", "aloft", "scaffold"],
    21: ["crane"],
    22: ["grind", "dust", "cut", "sand", "composite"],
    23: ["resin", "epoxy", "solvent", "chemical"],
    24: ["generator", "exhaust"],
    25: ["oven", "curing", "hot box"],
}


def detect_hazards(steps: list[str], answers: dict[str, bool]) -> tuple[list[HazardOut], list[str]]:
    triggered: set[int] = set()

    for qid, value in answers.items():
        if value:
            for hazard_id in QUESTION_TO_HAZARDS.get(qid, []):
                triggered.add(hazard_id)

    for step in steps:
        text = step.lower()
        for hazard_id, keywords in KEYWORD_MAP.items():
            if any(word in text for word in keywords):
                triggered.add(hazard_id)

    hazards: list[HazardOut] = []
    ppe_set: set[str] = set()

    for hazard_id in sorted(triggered):
        source = HAZARD_MASTER.get(hazard_id)
        if not source:
            continue
        pre_l = int(source["l"])
        pre_s = int(source["s"])
        post_l = max(1, pre_l - 1)
        post_s = pre_s

        ppe_items = [item.strip() for item in str(source["ppe"]).split(";")]
        ppe_set.update(item for item in ppe_items if item)

        hazards.append(HazardOut(
            hazard_id=hazard_id,
            hazard_name=str(source["name"]),
            controls=str(source["controls"]),
            ppe=str(source["ppe"]),
            pre_likelihood=pre_l,
            pre_severity=pre_s,
            pre_score=pre_l * pre_s,
            post_likelihood=post_l,
            post_severity=post_s,
            post_score=post_l * post_s,
        ))

    return hazards, sorted(list(ppe_set))
