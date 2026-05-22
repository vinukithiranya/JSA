import { useState } from "react";
import Layout from "../components/Layout";
import type { User } from "../types";

type Props = { user: User | null; onLogout: () => void };

type CourseCategory = "Safety" | "Operations" | "Emergency" | "Compliance";

interface Lesson {
  title: string;
  type: "video" | "quiz" | "reading";
  duration: string;
}

interface Course {
  id: string;
  title: string;
  description: string;
  category: CourseCategory;
  duration: string;
  lessons: Lesson[];
  assigned_count: number;
  completion_rate: number;
}

interface MyTrainingEntry {
  course_id: string;
  course_title: string;
  category: CourseCategory;
  progress: "not_started" | "in_progress" | "completed";
  due_date: string;
}

const CAT_COLORS: Record<CourseCategory, string> = {
  Safety: "bg-red-100 text-red-700",
  Operations: "bg-purple-100 text-purple-700",
  Emergency: "bg-orange-100 text-orange-700",
  Compliance: "bg-blue-100 text-blue-700",
};

const MOCK_COURSES: Course[] = [
  {
    id: "c-1",
    title: "Fire Safety & Evacuation",
    description: "Comprehensive training on fire prevention, detection, and safe evacuation procedures for all site personnel. Covers fire classification, extinguisher types, and assembly point protocols.",
    category: "Safety",
    duration: "45 min",
    lessons: [
      { title: "Introduction to Fire Safety", type: "video", duration: "8 min" },
      { title: "Fire Classifications & Extinguishers", type: "reading", duration: "10 min" },
      { title: "Evacuation Procedures", type: "video", duration: "12 min" },
      { title: "Assembly Points & Headcounts", type: "reading", duration: "7 min" },
      { title: "Fire Safety Quiz", type: "quiz", duration: "8 min" },
    ],
    assigned_count: 24,
    completion_rate: 78,
  },
  {
    id: "c-2",
    title: "PPE Requirements",
    description: "Learn the mandatory personal protective equipment requirements for different work zones, how to correctly fit and inspect PPE, and reporting procedures for damaged equipment.",
    category: "Safety",
    duration: "30 min",
    lessons: [
      { title: "PPE Overview", type: "video", duration: "7 min" },
      { title: "Zone-Based PPE Requirements", type: "reading", duration: "8 min" },
      { title: "Fitting & Inspecting PPE", type: "video", duration: "9 min" },
      { title: "PPE Compliance Quiz", type: "quiz", duration: "6 min" },
    ],
    assigned_count: 30,
    completion_rate: 92,
  },
  {
    id: "c-3",
    title: "Hazardous Materials Handling",
    description: "Safe procedures for identifying, handling, storing and disposing of hazardous materials on-site. Covers MSDS interpretation, spill response and emergency contact procedures.",
    category: "Safety",
    duration: "60 min",
    lessons: [
      { title: "Hazard Identification", type: "video", duration: "10 min" },
      { title: "Reading Safety Data Sheets", type: "reading", duration: "10 min" },
      { title: "Safe Handling Techniques", type: "video", duration: "12 min" },
      { title: "Storage Requirements", type: "reading", duration: "8 min" },
      { title: "Spill Response Procedures", type: "video", duration: "10 min" },
      { title: "Disposal Protocols", type: "reading", duration: "5 min" },
      { title: "Hazmat Quiz", type: "quiz", duration: "5 min" },
    ],
    assigned_count: 18,
    completion_rate: 65,
  },
  {
    id: "c-4",
    title: "Forklift Operations",
    description: "Covers safe operation of forklifts, pre-start checks, load handling, pedestrian safety and emergency procedures. Mandatory for all operators prior to unsupervised operation.",
    category: "Operations",
    duration: "90 min",
    lessons: [
      { title: "Forklift Types & Controls", type: "video", duration: "12 min" },
      { title: "Pre-Start Inspection", type: "reading", duration: "10 min" },
      { title: "Load Handling Safety", type: "video", duration: "15 min" },
      { title: "Pedestrian Awareness", type: "video", duration: "12 min" },
      { title: "Ramp & Dock Operations", type: "reading", duration: "10 min" },
      { title: "Incident Procedures", type: "reading", duration: "10 min" },
      { title: "Refuelling & Battery Charging", type: "video", duration: "11 min" },
      { title: "Forklift Operations Quiz", type: "quiz", duration: "10 min" },
    ],
    assigned_count: 12,
    completion_rate: 45,
  },
  {
    id: "c-5",
    title: "Emergency First Aid",
    description: "Hands-on training for recognising and responding to medical emergencies including CPR, bleeding control, burns treatment, and use of AED devices. Suitable for all staff.",
    category: "Emergency",
    duration: "120 min",
    lessons: [
      { title: "DRSABCD Framework", type: "video", duration: "14 min" },
      { title: "CPR Technique", type: "video", duration: "16 min" },
      { title: "Using an AED", type: "video", duration: "12 min" },
      { title: "Bleeding Control", type: "video", duration: "14 min" },
      { title: "Burns & Scalds Treatment", type: "reading", duration: "12 min" },
      { title: "Choking Response", type: "video", duration: "10 min" },
      { title: "Shock & Unconsciousness", type: "reading", duration: "10 min" },
      { title: "Reporting Incidents", type: "reading", duration: "8 min" },
      { title: "Scenario Practice", type: "reading", duration: "14 min" },
      { title: "First Aid Knowledge Quiz", type: "quiz", duration: "10 min" },
    ],
    assigned_count: 20,
    completion_rate: 55,
  },
  {
    id: "c-6",
    title: "Site Induction",
    description: "Mandatory induction for all new staff and contractors. Covers site rules, emergency procedures, access restrictions, communication protocols, and reporting obligations.",
    category: "Compliance",
    duration: "45 min",
    lessons: [
      { title: "Site Rules & Access", type: "reading", duration: "8 min" },
      { title: "Emergency Procedures", type: "video", duration: "10 min" },
      { title: "Communication Protocols", type: "reading", duration: "7 min" },
      { title: "Reporting Obligations", type: "reading", duration: "8 min" },
      { title: "Environmental Responsibilities", type: "reading", duration: "7 min" },
      { title: "Site Induction Quiz", type: "quiz", duration: "5 min" },
    ],
    assigned_count: 32,
    completion_rate: 88,
  },
];

const MOCK_MY_TRAINING: MyTrainingEntry[] = [
  { course_id: "c-6", course_title: "Site Induction", category: "Compliance", progress: "completed", due_date: "2026-03-01" },
  { course_id: "c-1", course_title: "Fire Safety & Evacuation", category: "Safety", progress: "in_progress", due_date: "2026-06-01" },
  { course_id: "c-2", course_title: "PPE Requirements", category: "Safety", progress: "not_started", due_date: "2026-06-15" },
  { course_id: "c-5", course_title: "Emergency First Aid", category: "Emergency", progress: "not_started", due_date: "2026-05-10" },
];

const LESSON_TYPE_ICON = {
  video: (
    <svg className="h-3.5 w-3.5 text-brand-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  quiz: (
    <svg className="h-3.5 w-3.5 text-amber-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  reading: (
    <svg className="h-3.5 w-3.5 text-blue-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
  ),
};

const PROGRESS_COLORS = {
  not_started: "bg-gray-100 text-gray-600",
  in_progress: "bg-blue-100 text-blue-700",
  completed: "bg-green-100 text-green-700",
};

const PROGRESS_LABELS = {
  not_started: "Not Started",
  in_progress: "In Progress",
  completed: "Completed",
};

function isOverdue(entry: MyTrainingEntry): boolean {
  if (entry.progress === "completed") return false;
  return new Date(entry.due_date) < new Date();
}

export default function TrainingPage({ user, onLogout }: Props) {
  const [tab, setTab] = useState<"courses" | "my_training">("courses");
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);

  const isSup = user?.role === "supervisor" || user?.role === "admin";

  const fmt = (d: string) =>
    new Date(d).toLocaleDateString("en-AU", { day: "2-digit", month: "short", year: "numeric" });

  return (
    <Layout user={user} title="Training" onLogout={onLogout}>
      {/* Tab bar */}
      <div className="mb-5 flex gap-1 rounded-xl bg-brand-100 p-1 w-fit">
        {[
          { key: "courses" as const, label: "Courses" },
          { key: "my_training" as const, label: "My Training" },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`rounded-lg px-5 py-1.5 text-sm font-semibold transition-colors ${
              tab === t.key
                ? "bg-white text-brand-900 shadow-sm"
                : "text-brand-600 hover:text-brand-800"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Courses tab ───────────────────────────────────────────────── */}
      {tab === "courses" && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {MOCK_COURSES.map((course) => (
            <div
              key={course.id}
              className="flex flex-col rounded-xl border border-brand-100 bg-white p-4 shadow-sm transition hover:shadow-md"
            >
              {/* Category badge */}
              <div className="flex items-center justify-between">
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${CAT_COLORS[course.category]}`}>
                  {course.category}
                </span>
                <span className="text-xs text-brand-400">{course.lessons.length} lessons</span>
              </div>

              <h3 className="mt-3 font-display text-sm font-bold text-brand-900 leading-snug">{course.title}</h3>
              <p className="mt-1 flex-1 text-xs leading-relaxed text-brand-500 line-clamp-2">{course.description}</p>

              {/* Duration + assigned */}
              <div className="mt-3 flex items-center gap-4 text-xs text-brand-400">
                <span className="flex items-center gap-1">
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {course.duration}
                </span>
                <span className="flex items-center gap-1">
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {course.assigned_count} assigned
                </span>
              </div>

              {/* Completion rate */}
              <div className="mt-3 space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-brand-500">Completion</span>
                  <span className="font-semibold text-brand-700">{course.completion_rate}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-brand-100">
                  <div
                    className="h-2 rounded-full bg-brand-600 transition-all"
                    style={{ width: `${course.completion_rate}%` }}
                  />
                </div>
              </div>

              {/* Action buttons */}
              <div className="mt-4 flex gap-2">
                {isSup && (
                  <button className="flex-1 rounded-lg border border-brand-200 py-1.5 text-xs font-semibold text-brand-700 hover:bg-brand-50">
                    Assign
                  </button>
                )}
                <button
                  onClick={() => setSelectedCourse(course)}
                  className="flex-1 rounded-lg bg-brand-700 py-1.5 text-xs font-semibold text-white hover:bg-brand-800"
                >
                  Start
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── My Training tab ───────────────────────────────────────────── */}
      {tab === "my_training" && (
        <div className="space-y-3">
          {MOCK_MY_TRAINING.map((entry) => {
            const overdue = isOverdue(entry);
            return (
              <div
                key={entry.course_id}
                className={`flex items-center gap-4 rounded-xl border bg-white p-4 shadow-sm ${
                  overdue ? "border-red-200 bg-red-50" : "border-brand-100"
                }`}
              >
                {/* Category badge */}
                <div className="shrink-0">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${CAT_COLORS[entry.category]}`}>
                    {entry.category}
                  </span>
                </div>

                {/* Course info */}
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-brand-900">{entry.course_title}</p>
                  <div className="mt-0.5 flex flex-wrap items-center gap-3 text-xs text-brand-400">
                    <span className={overdue ? "font-semibold text-red-600" : ""}>
                      Due: {fmt(entry.due_date)}
                      {overdue && " — OVERDUE"}
                    </span>
                  </div>
                </div>

                {/* Progress badge */}
                <div className="shrink-0">
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${PROGRESS_COLORS[entry.progress]}`}>
                    {PROGRESS_LABELS[entry.progress]}
                  </span>
                </div>

                {/* Action */}
                {entry.progress !== "completed" && (
                  <button
                    onClick={() => {
                      const course = MOCK_COURSES.find((c) => c.id === entry.course_id);
                      if (course) setSelectedCourse(course);
                    }}
                    className="shrink-0 rounded-lg bg-brand-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-800"
                  >
                    {entry.progress === "in_progress" ? "Continue" : "Start"}
                  </button>
                )}
                {entry.progress === "completed" && (
                  <div className="shrink-0 flex h-7 w-7 items-center justify-center rounded-full bg-brand-100">
                    <svg className="h-4 w-4 text-brand-600" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Course Detail Modal ────────────────────────────────────────── */}
      {selectedCourse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl flex flex-col max-h-[85vh]">
            {/* Modal header */}
            <div className="flex items-start justify-between border-b border-brand-100 px-6 py-5">
              <div>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${CAT_COLORS[selectedCourse.category]}`}>
                  {selectedCourse.category}
                </span>
                <h2 className="mt-2 font-display text-lg font-bold text-brand-900">{selectedCourse.title}</h2>
                <div className="mt-1 flex gap-4 text-xs text-brand-400">
                  <span className="flex items-center gap-1">
                    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {selectedCourse.duration}
                  </span>
                  <span>{selectedCourse.lessons.length} lessons</span>
                </div>
              </div>
              <button onClick={() => setSelectedCourse(null)} className="text-xl text-brand-400 hover:text-brand-700">✕</button>
            </div>

            {/* Modal body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              <p className="text-sm leading-relaxed text-brand-600">{selectedCourse.description}</p>

              <div>
                <p className="mb-3 text-xs font-bold uppercase tracking-wider text-brand-500">Lessons</p>
                <div className="space-y-2">
                  {selectedCourse.lessons.map((lesson, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-3 rounded-xl border border-brand-100 bg-brand-50 px-4 py-2.5"
                    >
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-xs font-bold text-brand-500 shadow-sm">
                        {idx + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-brand-800 truncate">{lesson.title}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2 text-xs text-brand-400">
                        {LESSON_TYPE_ICON[lesson.type]}
                        <span className="capitalize">{lesson.type}</span>
                        <span>·</span>
                        <span>{lesson.duration}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal footer */}
            <div className="flex items-center justify-between border-t border-brand-100 px-6 py-4">
              <button
                onClick={() => setSelectedCourse(null)}
                className="rounded-lg border border-brand-200 px-4 py-2 text-sm font-medium text-brand-700 hover:bg-brand-50"
              >
                Close
              </button>
              <button className="rounded-lg bg-brand-700 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-800">
                Start Course
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
