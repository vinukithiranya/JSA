from app.schemas.models import HazardOut

QUESTION_TO_HAZARDS: dict[str, list[int]] = {
    "q1": [1],
    "q2": [2],
    "q8": [8],
    "q12": [18, 14],
    "q15": [21],
    "q19": [22],
    "q20": [23],
}

KEYWORD_MAP: dict[int, list[str]] = {
    1: ["lift", "carry", "manual", "heavy"],
    5: ["crane", "hoist", "sling", "rigging"],
    8: ["ladder"],
    18: ["height", "mast", "climb", "aloft"],
    21: ["crane"],
    22: ["grind", "dust", "cut", "sand"],
    23: ["resin", "epoxy", "solvent", "chemical"],
    24: ["generator"],
    25: ["oven", "heat", "hot box"],
}

HAZARD_MASTER: dict[int, dict[str, str | int]] = {
    1: {"name": "Manual Handling", "controls": "Use team lifting and correct posture", "ppe": "Gloves; Safety footwear", "l": 2, "s": 2},
    2: {"name": "Hand Tools", "controls": "Inspect tools and use guards", "ppe": "Gloves; Eye protection", "l": 2, "s": 2},
    5: {"name": "Lifting Equipment", "controls": "Use certified slings and pre-lift checks", "ppe": "Helmet; Gloves; Safety footwear", "l": 3, "s": 3},
    8: {"name": "Ladder Use", "controls": "Secure ladder and maintain 3 points of contact", "ppe": "Helmet; Safety footwear", "l": 2, "s": 3},
    14: {"name": "Dropped Objects", "controls": "Use tool lanyards and exclusion zones", "ppe": "Helmet; Eye protection", "l": 2, "s": 3},
    18: {"name": "Working at Height", "controls": "Use fall arrest and permit-to-work", "ppe": "Harness; Helmet", "l": 3, "s": 3},
    21: {"name": "Cranes and Loads", "controls": "Banksman communication and load plans", "ppe": "Helmet; Gloves; Safety footwear", "l": 3, "s": 3},
    22: {"name": "Air Particulates", "controls": "Dust extraction and wet methods", "ppe": "Respirator; Eye protection", "l": 2, "s": 2},
    23: {"name": "Chemical Exposure", "controls": "SDS review and ventilation", "ppe": "Gloves; Respirator", "l": 2, "s": 3},
    24: {"name": "Portable Power", "controls": "RCD testing and cable checks", "ppe": "Gloves; Safety footwear", "l": 2, "s": 2},
    25: {"name": "Hot Surfaces", "controls": "Heat barriers and cool-down periods", "ppe": "Heat gloves; Eye protection", "l": 2, "s": 3},
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

        hazards.append(
            HazardOut(
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
            )
        )

    return hazards, sorted(list(ppe_set))
