import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import { api } from "../api";
import { enqueueOfflineJsa } from "../offlineQueue";
import type { JsaRecord, User } from "../types";

type Props = { user: User | null; onLogout: () => void };

const QUESTIONS = [
  { id: "q1",  label: "Is manual handling of heavy, large or awkward items required?" },
  { id: "q2",  label: "Will hand tools be used?" },
  { id: "q3",  label: "Are there housekeeping or trip hazards in the work area?" },
  { id: "q4",  label: "Will certified lifting equipment be used?" },
  { id: "q5",  label: "Are open hatches/locker lids/deck hardware present?" },
  { id: "q6",  label: "Are there slip hazards?" },
  { id: "q7",  label: "Will ladders be used?" },
  { id: "q8",  label: "Will a forklift be operated or nearby?" },
  { id: "q9",  label: "Will hydraulic equipment be operated or serviced?" },
  { id: "q10", label: "Is there vehicle/yard traffic interfacing with the area?" },
  { id: "q11", label: "Are environmental factors present (sun, lightning, wet, dust)?" },
  { id: "q12", label: "Will any work be carried out at height greater than 2 metres?" },
  { id: "q13", label: "Will any work be carried out at height below 2 metres?" },
  { id: "q14", label: "Is there a risk of items being dropped from height?" },
  { id: "q15", label: "Will equipment be operated under high load?" },
  { id: "q16", label: "Will winches be operated?" },
  { id: "q17", label: "Will pedestrians or public be present nearby?" },
  { id: "q18", label: "Will electrical equipment or temporary power be used?" },
  { id: "q19", label: "Will a crane be used for lifting?" },
  { id: "q20", label: "Will taglines be required to control load swing?" },
  { id: "q21", label: "Will slings/shackles/chain blocks be attached to loads?" },
  { id: "q22", label: "Will sanding/cutting/grinding of composites occur?" },
  { id: "q23", label: "Will resins or solvents be used, mixed, cleaned, or stored?" },
  { id: "q24", label: "Will portable generators be used?" },
  { id: "q25", label: "Will curing ovens or hot boxes be used?" },
];

const STEP_LABELS = ["Job Details", "Work Steps", "Questionnaire", "Analysis"];

export default function JsaWizardPage({ user, onLogout }: Props) {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);

  const [jobNumber, setJobNumber] = useState("J-240157");
  const [boatName,  setBoatName]  = useState("Meridian II");
  const [serviceLog, setServiceLog] = useState("SL-001234");
  const [location, setLocation]   = useState("Main Yard");
  const [date, setDate]           = useState(new Date().toISOString().slice(0, 10));

  const [jsa,     setJsa]     = useState<JsaRecord | null>(null);
  const [steps,   setSteps]   = useState<string[]>(["Rig mast lifting slings", "Operate crane to lift mast"]);
  const [answers, setAnswers] = useState<Record<string, boolean>>({});
  const [message, setMessage] = useState("");

  const progress = useMemo(
    () => Math.round((Object.keys(answers).length / QUESTIONS.length) * 100),
    [answers],
  );

  async function createDraft() {
    try {
      const data = await api<JsaRecord>("/api/jsa/draft", {
        method: "POST",
        body: JSON.stringify({ job_number: jobNumber, boat_name: boatName, service_log_number: serviceLog, location, date }),
      });
      setJsa(data);
      setStep(2);
      setMessage("");
    } catch {
      setMessage("Offline mode — continue and this JSA will be queued for sync.");
      setStep(2);
    }
  }

  async function saveSteps() {
    if (!jsa) return;
    const data = await api<JsaRecord>(`/api/jsa/${jsa.id}/steps`, {
      method: "POST",
      body: JSON.stringify({ steps }),
    });
    setJsa(data);
    setStep(3);
  }

  async function saveQuestions() {
    if (!jsa) {
      enqueueOfflineJsa({ job_number: jobNumber, boat_name: boatName, service_log_number: serviceLog, location, date, steps, answers });
      setMessage("Saved offline. Open Offline Sync later to upload this JSA.");
      navigate("/sync");
      return;
    }
    try {
      const data = await api<JsaRecord>(`/api/jsa/${jsa.id}/questionnaire`, {
        method: "POST",
        body: JSON.stringify({ answers }),
      });
      setJsa(data);
      setStep(4);
      await api(`/api/jsa/${jsa.id}/analyze`, { method: "POST" });
      navigate(`/jsa/review/${jsa.id}`);
    } catch {
      enqueueOfflineJsa({ job_number: jobNumber, boat_name: boatName, service_log_number: serviceLog, location, date, steps, answers });
      setMessage("Network issue. JSA queued offline.");
      navigate("/sync");
    }
  }

  return (
    <Layout user={user} title="Create New JSA" onLogout={onLogout}>
      {/* Step indicator */}
      <div className="mb-5 flex items-center">
        {STEP_LABELS.map((label, i) => {
          const n = i + 1;
          const done    = n < step;
          const current = n === step;
          return (
            <div key={n} className="flex flex-1 items-center">
              <div className="flex items-center gap-2">
                <div
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    current ? "bg-brand-700 text-white" :
                    done    ? "bg-brand-200 text-brand-700" :
                              "bg-brand-50 text-brand-300 border border-brand-200"
                  }`}
                >
                  {done ? "✓" : n}
                </div>
                <span className={`hidden text-xs font-medium sm:block ${current ? "text-brand-900" : "text-brand-400"}`}>
                  {label}
                </span>
              </div>
              {n < 4 && <div className={`mx-2 h-px flex-1 ${done ? "bg-brand-300" : "bg-brand-100"}`} />}
            </div>
          );
        })}
      </div>

      {message && (
        <p className="mb-4 rounded-lg bg-amber-50 border border-amber-200 px-4 py-2.5 text-sm text-amber-800">
          {message}
        </p>
      )}

      <div className="rounded-xl border border-brand-100 bg-white p-5 shadow-sm">
        {/* Step 1: Job Details */}
        {step === 1 && (
          <div>
            <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-brand-600">Job Details</h2>
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Job Number"   value={jobNumber}  onChange={setJobNumber} />
              <Field label="Boat Name"    value={boatName}   onChange={setBoatName} />
              <Field label="Service Log"  value={serviceLog} onChange={setServiceLog} />
              <Field label="Location"     value={location}   onChange={setLocation} />
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-brand-600">Date</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full rounded-lg border border-brand-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
                />
              </div>
            </div>
            <div className="mt-4">
              <button
                onClick={createDraft}
                className="rounded-lg bg-brand-700 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-brand-800"
              >
                Next: Work Steps →
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Work Steps */}
        {step === 2 && (
          <div>
            <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-brand-600">Work Steps</h2>
            <div className="space-y-2">
              {steps.map((item, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">
                    {i + 1}
                  </span>
                  <input
                    value={item}
                    onChange={(e) => setSteps((prev) => prev.map((x, idx) => (idx === i ? e.target.value : x)))}
                    className="flex-1 rounded-lg border border-brand-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
                  />
                  <button
                    onClick={() => setSteps((prev) => prev.filter((_, idx) => idx !== i))}
                    className="text-xs text-red-400 hover:text-red-600"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => setSteps((prev) => [...prev, ""])}
                className="rounded-lg border border-brand-200 bg-white px-4 py-2 text-sm font-semibold text-brand-800 hover:bg-brand-50"
              >
                + Add Step
              </button>
              <button
                onClick={saveSteps}
                className="rounded-lg bg-brand-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-brand-800"
              >
                Next: Questionnaire →
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Questionnaire */}
        {step === 3 && (
          <div>
            <div className="mb-4 flex items-center gap-3">
              <h2 className="text-sm font-bold uppercase tracking-wide text-brand-600">Safety Questionnaire</h2>
              <div className="flex flex-1 items-center gap-2">
                <div className="h-2 flex-1 rounded-full bg-brand-100">
                  <div
                    className="h-2 rounded-full bg-brand-500 transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <span className="text-xs font-bold text-brand-600">{progress}%</span>
              </div>
            </div>

            <div className="grid gap-2 md:grid-cols-2">
              {QUESTIONS.map((q, i) => (
                <div
                  key={q.id}
                  className={`rounded-lg border p-3 transition-colors ${
                    answers[q.id] !== undefined ? "border-brand-200 bg-brand-50" : "border-brand-100 bg-white"
                  }`}
                >
                  <p className="mb-2 text-xs text-brand-800">
                    <span className="mr-1 font-bold text-brand-500">Q{i + 1}.</span>
                    {q.label}
                  </p>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => setAnswers((prev) => ({ ...prev, [q.id]: true }))}
                      className={`rounded px-3 py-1 text-xs font-bold transition-colors ${
                        answers[q.id] === true
                          ? "bg-brand-700 text-white"
                          : "bg-brand-100 text-brand-700 hover:bg-brand-200"
                      }`}
                    >
                      Yes
                    </button>
                    <button
                      onClick={() => setAnswers((prev) => ({ ...prev, [q.id]: false }))}
                      className={`rounded px-3 py-1 text-xs font-bold transition-colors ${
                        answers[q.id] === false
                          ? "bg-brand-700 text-white"
                          : "bg-brand-100 text-brand-700 hover:bg-brand-200"
                      }`}
                    >
                      No
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4">
              <button
                onClick={saveQuestions}
                className="rounded-lg bg-brand-700 px-5 py-2.5 text-sm font-bold text-white hover:bg-brand-800"
              >
                Analyze Hazards →
              </button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-brand-600">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-brand-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
      />
    </div>
  );
}
