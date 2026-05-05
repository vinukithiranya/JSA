import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppShell from "../components/AppShell";
import { api } from "../api";
import { enqueueOfflineJsa } from "../offlineQueue";
import type { JsaRecord, User } from "../types";

type Props = { user: User };

const QUESTIONS = Array.from({ length: 25 }, (_, i) => ({ id: `q${i + 1}`, label: `Safety question ${i + 1}` }));

export default function JsaWizardPage({ user }: Props) {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);

  const [jobNumber, setJobNumber] = useState("J-240157");
  const [boatName, setBoatName] = useState("Meridian II");
  const [serviceLog, setServiceLog] = useState("SL-001234");
  const [location, setLocation] = useState("Main Yard");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  const [jsa, setJsa] = useState<JsaRecord | null>(null);
  const [steps, setSteps] = useState<string[]>(["Rig mast lifting slings", "Operate crane to lift mast", "Grind composite joint"]);
  const [answers, setAnswers] = useState<Record<string, boolean>>({});
  const [message, setMessage] = useState("");

  const progress = useMemo(() => Math.round((Object.keys(answers).length / 25) * 100), [answers]);

  async function createDraft() {
    try {
      const data = await api<JsaRecord>("/api/jsa/draft", {
        method: "POST",
        body: JSON.stringify({
          job_number: jobNumber,
          boat_name: boatName,
          service_log_number: serviceLog,
          location,
          date,
        }),
      });
      setJsa(data);
      setStep(2);
      setMessage("");
    } catch {
      setMessage("Offline mode active. Continue and this JSA will be queued for sync.");
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
      enqueueOfflineJsa({
        job_number: jobNumber,
        boat_name: boatName,
        service_log_number: serviceLog,
        location,
        date,
        steps,
        answers,
      });
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
      enqueueOfflineJsa({
        job_number: jobNumber,
        boat_name: boatName,
        service_log_number: serviceLog,
        location,
        date,
        steps,
        answers,
      });
      setMessage("Network issue detected. JSA queued offline for sync.");
      navigate("/sync");
    }
  }

  return (
    <AppShell user={user} title="Create New JSA">
      <div className="glass-card rounded-3xl p-6 shadow-card">
        <p className="mb-4 text-sm text-brand-700">Step {step} of 4</p>
        {message ? <p className="mb-4 rounded-xl bg-brand-50 px-3 py-2 text-sm text-brand-800">{message}</p> : null}

        {step === 1 ? (
          <div className="grid gap-3 md:grid-cols-2">
            <Input label="Job Number" value={jobNumber} onChange={setJobNumber} />
            <Input label="Boat Name" value={boatName} onChange={setBoatName} />
            <Input label="Service Log" value={serviceLog} onChange={setServiceLog} />
            <Input label="Location" value={location} onChange={setLocation} />
            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-brand-800">Date</span>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full rounded-xl border border-brand-200 px-3 py-2" />
            </label>
            <div className="md:col-span-2">
              <button onClick={createDraft} className="rounded-xl bg-brand-700 px-5 py-2 font-semibold text-white">Next: Work Steps</button>
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <div>
            <h2 className="mb-3 font-display text-xl text-brand-900">Work Steps</h2>
            <div className="space-y-2">
              {steps.map((item, i) => (
                <input
                  key={i}
                  value={item}
                  onChange={(e) => setSteps((prev) => prev.map((x, idx) => (idx === i ? e.target.value : x)))}
                  className="w-full rounded-xl border border-brand-200 px-3 py-2"
                />
              ))}
            </div>
            <div className="mt-4 flex gap-3">
              <button onClick={() => setSteps((prev) => [...prev, ""])} className="rounded-xl bg-white px-4 py-2 font-semibold text-brand-800">Add Step</button>
              <button onClick={saveSteps} className="rounded-xl bg-brand-700 px-4 py-2 font-semibold text-white">Next: Questionnaire</button>
            </div>
          </div>
        ) : null}

        {step === 3 ? (
          <div>
            <h2 className="mb-1 font-display text-xl text-brand-900">Questionnaire</h2>
            <p className="mb-4 text-sm text-brand-700">Progress: {progress}%</p>
            <div className="grid gap-3 md:grid-cols-2">
              {QUESTIONS.map((q) => (
                <div key={q.id} className="rounded-xl bg-white p-3">
                  <p className="mb-2 text-sm text-brand-900">{q.label}</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setAnswers((prev) => ({ ...prev, [q.id]: true }))}
                      className={`rounded-lg px-3 py-1 ${answers[q.id] === true ? "bg-brand-700 text-white" : "bg-brand-100"}`}
                    >
                      Yes
                    </button>
                    <button
                      onClick={() => setAnswers((prev) => ({ ...prev, [q.id]: false }))}
                      className={`rounded-lg px-3 py-1 ${answers[q.id] === false ? "bg-brand-700 text-white" : "bg-brand-100"}`}
                    >
                      No
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <button onClick={saveQuestions} className="mt-4 rounded-xl bg-brand-700 px-4 py-2 font-semibold text-white">Analyze Hazards</button>
          </div>
        ) : null}
      </div>
    </AppShell>
  );
}

function Input({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-semibold text-brand-800">{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-xl border border-brand-200 px-3 py-2" />
    </label>
  );
}
