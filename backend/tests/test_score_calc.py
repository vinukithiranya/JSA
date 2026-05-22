"""
Tests for inspection score calculation.
Verifies the fixed _calc_score formula uses earned/max_points × 100.
"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.routers.inspections import _calc_score


# ── Basic scoring ─────────────────────────────────────────────────────────────

def test_perfect_score_all_yes():
    schema = {"sections": [{"questions": [
        {"id": "q1", "type": "multiple_choice", "score_map": {"Yes": 10, "No": 0}},
        {"id": "q2", "type": "multiple_choice", "score_map": {"Yes": 10, "No": 0}},
    ]}]}
    answers = {
        "q1": {"value": "Yes"},
        "q2": {"value": "Yes"},
    }
    assert _calc_score(schema, answers) == 100.0


def test_zero_score_all_no():
    schema = {"sections": [{"questions": [
        {"id": "q1", "type": "multiple_choice", "score_map": {"Yes": 10, "No": 0}},
        {"id": "q2", "type": "multiple_choice", "score_map": {"Yes": 10, "No": 0}},
    ]}]}
    answers = {
        "q1": {"value": "No"},
        "q2": {"value": "No"},
    }
    assert _calc_score(schema, answers) == 0.0


def test_partial_score_mixed_answers():
    schema = {"sections": [{"questions": [
        {"id": "q1", "type": "multiple_choice", "score_map": {"Yes": 10, "No": 0}},
        {"id": "q2", "type": "multiple_choice", "score_map": {"Yes": 10, "No": 0}},
        {"id": "q3", "type": "multiple_choice", "score_map": {"Yes": 10, "No": 0}},
        {"id": "q4", "type": "multiple_choice", "score_map": {"Yes": 10, "No": 0}},
    ]}]}
    answers = {
        "q1": {"value": "Yes"},
        "q2": {"value": "Yes"},
        "q3": {"value": "No"},
        "q4": {"value": "No"},
    }
    assert _calc_score(schema, answers) == 50.0


def test_unequal_weights():
    """Questions with different max points — formula must use points not question count."""
    schema = {"sections": [{"questions": [
        {"id": "q1", "type": "multiple_choice", "score_map": {"Yes": 10, "No": 0}},
        {"id": "q2", "type": "multiple_choice", "score_map": {"Good": 5, "Poor": 0}},
    ]}]}
    answers = {
        "q1": {"value": "Yes"},   # 10 / 15 total
        "q2": {"value": "Poor"},  # 0
    }
    # 10 / 15 = 66.7
    assert _calc_score(schema, answers) == 66.7


def test_partial_answers_unanswered_count_as_zero():
    schema = {"sections": [{"questions": [
        {"id": "q1", "type": "multiple_choice", "score_map": {"Yes": 10, "No": 0}},
        {"id": "q2", "type": "multiple_choice", "score_map": {"Yes": 10, "No": 0}},
    ]}]}
    answers = {"q1": {"value": "Yes"}}  # q2 unanswered
    # earned=10, max=20 → 50%
    assert _calc_score(schema, answers) == 50.0


def test_no_scored_questions_returns_100():
    """Template with no score_map questions → 100% (nothing to fail)."""
    schema = {"sections": [{"questions": [
        {"id": "q1", "type": "text"},
        {"id": "q2", "type": "checkbox"},
    ]}]}
    answers = {"q1": {"value": "some text"}, "q2": {"value": True}}
    assert _calc_score(schema, answers) == 100.0


def test_empty_schema_returns_100():
    assert _calc_score({}, {}) == 100.0


def test_na_option_with_null_score_excluded_from_max():
    """N/A with null score should not add to max_pts."""
    schema = {"sections": [{"questions": [
        {"id": "q1", "type": "multiple_choice", "score_map": {"Yes": 10, "No": 0, "N/A": None}},
    ]}]}
    answers = {"q1": {"value": "Yes"}}
    # max = 10 (N/A null excluded), earned = 10
    assert _calc_score(schema, answers) == 100.0


def test_score_below_70_threshold():
    """Verify the 70% critical alert threshold is reachable."""
    schema = {"sections": [{"questions": [
        {"id": f"q{i}", "type": "multiple_choice", "score_map": {"Yes": 10, "No": 0}}
        for i in range(10)
    ]}]}
    # 3 Yes out of 10 = 30%
    answers = {f"q{i}": {"value": "Yes" if i < 3 else "No"} for i in range(10)}
    score = _calc_score(schema, answers)
    assert score == 30.0
    assert score < 70


def test_score_above_70_threshold():
    schema = {"sections": [{"questions": [
        {"id": f"q{i}", "type": "multiple_choice", "score_map": {"Yes": 10, "No": 0}}
        for i in range(10)
    ]}]}
    # 8 Yes = 80%
    answers = {f"q{i}": {"value": "Yes" if i < 8 else "No"} for i in range(10)}
    score = _calc_score(schema, answers)
    assert score == 80.0
    assert score >= 70
