# RigPro JSA — Template Builder System Documentation

## Overview

The Template Builder is a full-stack, SafetyCulture-style template creation and editing system built into the RigPro JSA platform. It allows supervisors and admins to create structured inspection forms with dynamic logic, multiple response types, and nested conditional questions.

---

## System Architecture

```
Frontend (React 18 + TypeScript + Vite + Tailwind CSS)
  └── /templates               → TemplatesPage.tsx      (template list)
  └── /templates/new           → TemplateBuilderPage.tsx (create new)
  └── /templates/edit/:id      → TemplateBuilderPage.tsx (edit existing)

Backend (FastAPI + SQLAlchemy + PostgreSQL)
  └── GET    /api/templates           → list all active templates
  └── POST   /api/templates           → create new template
  └── GET    /api/templates/:id       → get single template
  └── PUT    /api/templates/:id       → update template (auto-save)
  └── DELETE /api/templates/:id       → archive template (soft delete)
  └── POST   /api/templates/:id/duplicate → duplicate template
```

---

## Database Schema

| Field         | Type    | Description                                      |
|--------------|---------|--------------------------------------------------|
| id           | String  | Unique ID (e.g. `tpl_abc123`)                   |
| name         | String  | Template name (editable inline in builder)       |
| category     | String  | Category label (Safety, Quality, JSA, etc.)      |
| description  | String  | Optional description text                        |
| form_schema  | JSON    | Full schema (sections, questions, logic rules)   |
| is_active    | Boolean | False when archived (soft delete)                |
| created_by   | String  | User ID of creator                               |
| created_at   | DateTime| Creation timestamp                               |

---

## form_schema JSON Structure

```json
{
  "sections": [
    {
      "id": "abc123",
      "title": "Title Page",
      "description": "Optional section description",
      "collapsed": false,
      "is_title_page": true,
      "is_completion": false,
      "questions": [
        {
          "id": "q1",
          "text": "Site",
          "type": "site",
          "required": true,
          "multiple_selection": false,
          "options": ["Yes", "No", "N/A"],
          "option_meta": [
            { "id": "om1", "label": "Yes", "color": "green", "is_flagged": false, "score": 1 },
            { "id": "om2", "label": "No",  "color": "red",   "is_flagged": true,  "score": 0 },
            { "id": "om3", "label": "N/A", "color": "gray",  "is_flagged": false, "score": null }
          ],
          "flagged_responses": ["No"],
          "score_map": { "Yes": 1, "No": 0, "N/A": null },
          "logic_rules": [
            {
              "id": "r1",
              "op": "is",
              "value": "No",
              "trigger": "ask_questions",
              "evidence_notes": false,
              "evidence_media": false,
              "notify_msg": "",
              "notify_timing": "immediately"
            }
          ],
          "nested_questions": [
            {
              "id": "nq1",
              "text": "What is the issue?",
              "type": "text",
              "required": true
            }
          ]
        }
      ]
    }
  ]
}
```

**Compatibility Note:** `options` (string array) and `flagged_responses` (string array) are kept in sync with `option_meta` so that `InspectionConductPage` can read them without knowing about the richer builder format.

---

## Page: Templates List (`/templates`)

### Features

| Feature | Status | Description |
|---------|--------|-------------|
| Template grid view | ✅ Done | Cards showing name, category, sections, questions count |
| Template list view | ✅ Done | Table with same data |
| Grid/List toggle | ✅ Done | Persists for session |
| Search bar | ✅ Done | Searches name, description, category |
| Category filter | ✅ Done | Dropdown of all existing categories |
| New Template button | ✅ Done | Navigates to `/templates/new` |
| Start Inspection | ✅ Done | Modal → POST /api/inspections → navigates to conduct |
| Edit template (3-dot) | ✅ Done | Navigates to `/templates/edit/:id` |
| Duplicate (3-dot) | ✅ Done | POST /api/templates/:id/duplicate |
| Archive (3-dot) | ✅ Done | DELETE /api/templates/:id with confirmation |
| Empty state | ✅ Done | Friendly message when no templates exist |
| Loading state | ✅ Done | Spinner while fetching |
| Error state | ✅ Done | Error message + retry button |

---

## Page: Template Builder (`/templates/new` and `/templates/edit/:id`)

### Layout

```
┌─────────────────────────────────────────────────────────────────┐
│ ← Templates  [Template Name]  [Category]  [Build|Access]  [Undo][Redo]  ● Saved  [Publish] │
├─────────────────────────────────────────────────────────────────┤
│ Left Sidebar   │  Center Canvas (scrollable)   │ Right Panel    │
│  (w-48)        │  (max-w-2xl, centered)        │ (w-80, slides) │
└─────────────────────────────────────────────────────────────────┘
```

---

## Top Bar

| Element | Status | How it works |
|---------|--------|--------------|
| Back to Templates | ✅ Done | Navigates to `/templates` |
| Template name | ✅ Done | Click to edit inline, Enter/blur to confirm, Escape to cancel |
| Category badge | ✅ Done | Click → dropdown with 7 categories |
| Build tab | ✅ Done | Shows template builder canvas |
| Manage Access tab | ✅ Done | Shows access rules + description editor |
| Undo button | ✅ Done | Reverts last schema change (up to 30 steps) |
| Redo button | ✅ Done | Re-applies undone changes |
| Save status indicator | ✅ Done | Shows "● Saved", "Saving…", or "● Unsaved" |
| Publish button | ✅ Done | Saves immediately and navigates back to `/templates` |
| Auto-save | ✅ Done | Debounced 800ms after any change — silently saves to backend |

---

## Left Sidebar

| Element | Status | How it works |
|---------|--------|--------------|
| Add Section button | ✅ Done | Inserts a new section before Completion |
| Section navigation list | ✅ Done | Lists all sections with question counts |
| Click to scroll | ✅ Done | `scrollIntoView({ behavior: "smooth" })` to that section |
| Section dot color coding | ✅ Done | Brand (title page), green (completion), gray (regular) |

---

## Sections

| Feature | Status | How it works |
|---------|--------|--------------|
| Title Page (fixed) | ✅ Done | First section, cannot be deleted/moved, shows "Fixed" badge |
| Named sections | ✅ Done | Can be added, renamed, reordered, deleted |
| Completion (fixed) | ✅ Done | Last section, cannot be deleted/moved |
| Rename section | ✅ Done | Click section title to edit inline |
| Section description | ✅ Done | Click "+ Add description…" to add, click to edit |
| Collapse / expand | ✅ Done | Chevron button toggles collapsed state |
| Move section up/down | ✅ Done | Arrow buttons (disabled at fixed section boundaries) |
| Delete section | ✅ Done | Trash icon, only on non-fixed sections |
| Question count badge | ✅ Done | Shows live count in section header |
| Empty section state | ✅ Done | Placeholder with icon when section has 0 questions |
| Add Section (canvas) | ✅ Done | Button at bottom of canvas |

---

## Questions

### Adding Questions

| Feature | Status | How it works |
|---------|--------|--------------|
| Add question button | ✅ Done | "Add question" button at bottom of each section |
| Type picker dropdown | ✅ Done | Click type button → dropdown of all types for that section |
| Title page types | ✅ Done | 7 types available only in Title Page section |
| Inspection types | ✅ Done | 11 types available in regular sections |

### Question Card Layout

| Element | Status | How it works |
|---------|--------|--------------|
| Move up/down arrows | ✅ Done | Visible on hover, disabled at boundaries |
| Question text (editable) | ✅ Done | Click to edit inline, Enter/blur to save, Escape to cancel |
| Required asterisk (*) | ✅ Done | Shown next to question text when Required is checked |
| Response type badge | ✅ Done | Click → type picker dropdown (changes type of question) |
| Required checkbox | ✅ Done | Toggles required flag |
| Multiple selection checkbox | ✅ Done | Only shown for Multiple choice questions |
| Flagged responses indicator | ✅ Done | Shows red pills for options marked as flagged |
| MC "X responses" button | ✅ Done | Opens right panel with MC option editor |
| MC color chips preview | ✅ Done | Shows all options as colored chips under question |
| Context menu (⋮) | ✅ Done | Move up, Move down, Add logic, Delete |
| Add logic link | ✅ Done | Adds a new empty logic rule inline |
| Delete question | ✅ Done | Via context menu or implicit in fixed-type protection |

---

## Response Types

### Title Page Types (only in Title Page section)

| Type | Description |
|------|-------------|
| Site | Site/location of inspection |
| Inspection date | Date and time picker |
| Person | Person conducting inspection |
| Inspection location | GPS or text location |
| Document number | Reference number field |
| Asset | Asset being inspected |
| Company | Company name field |

### Inspection Types (regular sections)

| Type | Description |
|------|-------------|
| Multiple choice | Custom options with color, flag, score |
| Text answer | Free-text response |
| Number | Numeric input |
| Checkbox | Single true/false tick |
| Date & Time | Date and time picker |
| Media | Photo/video upload |
| Slider | Range slider input |
| Annotation | Draw/mark on image |
| Signature | Digital signature capture |
| Location | GPS location picker |
| Instruction | Read-only informational text |

---

## Multiple Choice Options (Right Panel)

Opened by clicking the "X responses" button on any Multiple choice question.

| Feature | Status | How it works |
|---------|--------|--------------|
| Option label editor | ✅ Done | Text input per option |
| Color picker | ✅ Done | 7 color dots (red/orange/yellow/green/blue/purple/gray) |
| Mark as flagged (🚩) | ✅ Done | Red toggle button per option |
| Response score | ✅ Done | Number input per option (shown when Scoring toggle is ON) |
| Scoring toggle | ✅ Done | Toggle at top of panel enables/disables score column |
| Add Response button | ✅ Done | Adds new option row with default values |
| Remove option | ✅ Done | × button, visible on hover |
| Reorder options | ✅ Done | Up/down arrows on hover |
| Save and apply | ✅ Done | Closes panel and syncs options to question |
| Sync to InspectConductPage | ✅ Done | `options[]`, `flagged_responses[]`, `score_map{}` kept in sync |

---

## Logic Rules (Inline, per question)

Each question in a regular section (not Title Page) can have multiple logic rules. Each rule is displayed inline below the question.

### How Logic Rules Work

Each rule has this structure:
```
If answer  [condition operator ▼]  [condition value ▼]  then  [trigger ▼]  [trigger badge]  [×]
```

### Condition Operators by Question Type

| Question Type | Available Operators |
|--------------|---------------------|
| Multiple choice | is, is not, is selected, is not selected, is one of, is not one of |
| Checkbox | is checked, is not checked |
| Number / Slider | < less than, ≤ less than or equal, = equals, ≠ not equal, ≥ greater than or equal, > greater than, between |
| Text / Other | is, is not, exists, does not exist |

### Logic Triggers

| Trigger | Badge Color | Behavior |
|---------|-------------|----------|
| Ask questions | Indigo | Nested questions appear indented below rule |
| Require action | Amber | Inspector must create a follow-up action |
| Require evidence | Sky blue | Inspector must attach notes/media (configurable) |
| Notify | Teal | Sends notification (configurable: message, timing) |
| Skip to complete | Red | Skips all remaining questions and completes inspection |

### Logic Rule Features

| Feature | Status | How it works |
|---------|--------|--------------|
| Add logic rule | ✅ Done | "+ Add logic" link below question or via context menu |
| Condition operator selector | ✅ Done | Dropdown changes based on question type |
| Condition value selector | ✅ Done | Dropdown of options (for MC) or text input |
| Trigger selector | ✅ Done | Dropdown with all 5 trigger types |
| Trigger badge | ✅ Done | Color-coded badge shows selected trigger |
| Remove rule | ✅ Done | × button on right of rule row |
| Multiple rules per question | ✅ Done | Each rule evaluates independently |

---

## Nested Questions (Ask Questions Trigger)

When a logic rule uses "Ask questions" trigger, nested questions appear indented under the rule with a left blue border.

| Feature | Status | How it works |
|---------|--------|--------------|
| Nested question block | ✅ Done | Indented with `border-l-2 border-indigo-200` visual |
| Add nested question | ✅ Done | "+ Add question" button with type picker |
| Edit nested question text | ✅ Done | Click to edit inline |
| Change nested question type | ✅ Done | Type badge → dropdown |
| Required toggle on nested | ✅ Done | Same as regular questions |
| Delete nested question | ✅ Done | × on hover |
| Multiple nested questions | ✅ Done | Can add any number |

---

## Require Evidence Configuration (Right Panel)

Opened by clicking "Configure…" on a "Require evidence" logic rule.

| Feature | Status | How it works |
|---------|--------|--------------|
| Notes checkbox | ✅ Done | Require inspector to write a note |
| Media checkbox | ✅ Done | Require inspector to attach photo/video |
| Save and apply | ✅ Done | Saves evidence config back to rule |
| Cancel | ✅ Done | Closes without saving |

---

## Notify Configuration (Right Panel)

Opened by clicking "Configure…" on a "Notify" logic rule.

| Feature | Status | How it works |
|---------|--------|--------------|
| Notification message | ✅ Done | Text area for message content |
| Timing: Immediately | ✅ Done | Radio button — notify right when answer is given |
| Timing: On completion | ✅ Done | Radio button — notify only when inspection is submitted |
| Save and apply | ✅ Done | Saves notify config back to rule |

---

## Manage Access Tab

| Feature | Status | How it works |
|---------|--------|--------------|
| Access rules display | ✅ Done | Shows "All users" with active badge |
| Template description field | ✅ Done | Editable textarea, auto-saves |
| Granular access (future) | 🔜 Planned | "+ New access rule" shown but disabled |

---

## Auto-Save & State Management

| Feature | Status | How it works |
|---------|--------|--------------|
| Auto-save (debounced) | ✅ Done | 800ms after any schema/name/category/description change |
| Create on first save | ✅ Done | If new template, POST is made; subsequent changes use PUT |
| URL update after create | ✅ Done | `window.history.replaceState` updates URL to `/templates/edit/:id` |
| Undo (up to 30 steps) | ✅ Done | History stack of FormSchema snapshots |
| Redo | ✅ Done | Future stack cleared on new change |
| Save status indicator | ✅ Done | "● Saved" (green) / "Saving…" (gray) / "● Unsaved" (amber) |
| Publish | ✅ Done | Immediate save + navigate to `/templates` |

---

## Backend API Endpoints

| Method | Path | Description | Status |
|--------|------|-------------|--------|
| GET | /api/templates | List all active templates | ✅ Done |
| POST | /api/templates | Create new template | ✅ Done |
| GET | /api/templates/:id | Get single template by ID | ✅ Done |
| PUT | /api/templates/:id | Update template fields | ✅ Done |
| DELETE | /api/templates/:id | Archive template (soft delete) | ✅ Done |
| POST | /api/templates/:id/duplicate | Duplicate template | ✅ Done |

---

## Known Limitations / Not Yet Implemented

| Feature | Notes |
|---------|-------|
| Drag-and-drop reorder | Currently using up/down arrow buttons instead of DnD |
| Mobile preview pane | SC shows a live mobile preview — not yet built |
| Global Response Sets | SC has org-level shared MC response sets — not yet built |
| Approval workflow section | SC has a dedicated approval page type — not yet built |
| Template versioning | No version history yet — overwrite only |
| Granular access rules | Access tab shows structure but no real rule management |
| Template PDF download | Not yet implemented |
| AI template generation | "Build with AI" button not yet implemented |
| Template folders | SC supports moving templates to folders — not yet built |
| Scoring totals display | Individual scores stored but no aggregate display in builder |
| Repeat sections | SC supports sections that repeat rows — not built |

---

## File Reference

| File | Purpose |
|------|---------|
| `frontend/src/pages/TemplateBuilderPage.tsx` | Full template builder UI (3-panel layout) |
| `frontend/src/pages/TemplatesPage.tsx` | Template list with grid/list view |
| `frontend/src/App.tsx` | Route definitions for all pages |
| `backend/app/routers/templates.py` | All template API endpoints |
| `backend/app/schemas/models.py` | Pydantic models (TemplateCreate, TemplateOut, TemplateUpdate) |
| `backend/app/models/db_models.py` | SQLAlchemy TemplateDB model |
| `backend/app/services/mappers.py` | to_template_out mapper function |

---

## Component Tree (TemplateBuilderPage)

```
TemplateBuilderPage
├── Top Bar
│   ├── Back button
│   ├── Template name (inline edit)
│   ├── Category picker
│   ├── Tab switcher (Build / Manage Access)
│   ├── Undo / Redo
│   ├── Save status
│   └── Publish button
│
├── Left Sidebar (Build tab only)
│   ├── Add Section button
│   └── Section navigation list
│
├── Center Canvas
│   ├── SectionBlock (× N sections)
│   │   ├── Section header (title, description, collapse, delete, move)
│   │   └── QuestionCard (× N questions)
│   │       ├── Move arrows
│   │       ├── Question text (inline edit)
│   │       ├── Context menu (⋮)
│   │       ├── Type picker
│   │       ├── Required / Multiple selection checkboxes
│   │       ├── Flagged response badges
│   │       ├── MC color chips preview
│   │       └── LogicRuleRow (× N rules)
│   │           ├── Condition operator selector
│   │           ├── Condition value selector/input
│   │           ├── Trigger selector + badge
│   │           ├── Configure button (evidence/notify)
│   │           └── NestedQuestionCard (× N nested, when Ask questions)
│   └── Add Section button
│
└── Right Panel (slide-in, context-sensitive)
    ├── MCOptionsPanel (when MC question "responses" clicked)
    └── LogicConfigPanel (when "Configure…" clicked)
        ├── RequireEvidence view (notes + media checkboxes)
        └── Notify view (message + timing radio)
```

---

## Quick Feature Checklist

### Template List Page
- [x] Grid view with cards
- [x] List view with table
- [x] Search by name/description/category
- [x] Filter by category
- [x] New Template button
- [x] Start Inspection from template
- [x] Edit template (3-dot menu)
- [x] Duplicate template (3-dot menu)
- [x] Archive template (3-dot menu + confirmation)
- [x] Loading, empty, and error states

### Template Builder — Top Bar
- [x] Back to Templates navigation
- [x] Inline template name editing
- [x] Category picker dropdown
- [x] Build / Manage Access tab switching
- [x] Undo (30-step history)
- [x] Redo
- [x] Real-time save status indicator
- [x] Publish (save + exit)
- [x] Auto-save (800ms debounce)

### Template Builder — Left Sidebar
- [x] Add Section shortcut
- [x] Section navigation list
- [x] Click-to-scroll to section
- [x] Live question count per section

### Template Builder — Sections
- [x] Title Page (fixed, non-deletable)
- [x] Named sections (add/rename/delete/reorder)
- [x] Completion section (fixed, non-deletable)
- [x] Section description (click to add/edit)
- [x] Collapse/expand toggle
- [x] Move up/down
- [x] Delete section
- [x] Empty section state with placeholder

### Template Builder — Questions
- [x] Inline question text editing
- [x] 7 Title Page response types
- [x] 11 Inspection response types
- [x] Type picker dropdown
- [x] Required toggle (checkbox)
- [x] Multiple selection toggle (MC only)
- [x] Flagged responses display (red badges)
- [x] Move question up/down
- [x] Delete question
- [x] Context menu (⋮) with all actions

### Multiple Choice
- [x] Per-option color (7 colors)
- [x] Per-option flagged marker
- [x] Per-option score
- [x] Scoring toggle on/off
- [x] Add/remove/reorder options
- [x] Live chip preview in question card
- [x] Sync to InspectionConductPage format

### Logic Rules
- [x] Add multiple rules per question
- [x] Condition operators (type-aware)
- [x] Condition value (MC dropdown or text input)
- [x] Ask questions trigger
- [x] Require action trigger
- [x] Require evidence trigger + configure
- [x] Notify trigger + configure
- [x] Skip to complete trigger
- [x] Remove rule

### Nested Questions (Ask Questions)
- [x] Nested question block (indented, blue left border)
- [x] Add/edit/delete nested questions
- [x] Type picker for nested questions
- [x] Required toggle for nested questions

### Require Evidence Config
- [x] Notes checkbox
- [x] Media checkbox
- [x] Save and apply / Cancel

### Notify Config
- [x] Message field
- [x] Timing: Immediately
- [x] Timing: On inspection completion
- [x] Save and apply / Cancel

### Manage Access Tab
- [x] Access rules display
- [x] Template description editor
- [x] Granular access (UI placeholder — coming soon)

### Backend
- [x] GET /api/templates (list)
- [x] POST /api/templates (create)
- [x] GET /api/templates/:id (get)
- [x] PUT /api/templates/:id (update)
- [x] DELETE /api/templates/:id (archive)
- [x] POST /api/templates/:id/duplicate
- [x] TemplateUpdate schema (partial update)
