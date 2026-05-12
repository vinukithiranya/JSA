import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import { api } from "../api";
import type { FormTemplate, User } from "../types";

type Props = { user: User | null; onLogout: () => void };

type FieldType = "text" | "number" | "date" | "dropdown" | "checkbox" | "signature";

export default function FormBuilderPage({ user, onLogout }: Props) {
  const [name, setName] = useState("Vessel Inspection Checklist");
  const [category, setCategory] = useState("Inspection");
  const [description, setDescription] = useState("Custom checklist for vessel inspection.");
  const [fields, setFields] = useState<Array<{ id: string; label: string; type: FieldType; required: boolean }>>([
    { id: "vessel_name", label: "Vessel Name", type: "text", required: true },
  ]);
  const [forms, setForms] = useState<FormTemplate[]>([]);

  async function loadForms() {
    const data = await api<FormTemplate[]>("/api/forms");
    setForms(data);
  }

  useEffect(() => {
    loadForms().catch(() => null);
  }, []);

  async function saveForm() {
    const schema = {
      sections: [
        {
          title: "Generated Section",
          fields: fields.map((f) => ({ id: f.id, type: f.type, label: f.label, required: f.required })),
        },
      ],
    };

    await api<FormTemplate>("/api/forms", {
      method: "POST",
      body: JSON.stringify({ name, category, description, form_schema: schema }),
    });

    await loadForms();
  }

  return (
    <Layout user={user} title="Form Builder" onLogout={onLogout}>
      <div className="grid gap-4 md:grid-cols-2">
        <section className="glass-card rounded-2xl p-5 shadow-card">
          <h2 className="mb-3 font-display text-xl text-brand-900">Create Custom Form</h2>
          <label className="mb-2 block text-sm font-semibold text-brand-800">Form Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className="mb-3 w-full rounded-xl border border-brand-200 px-3 py-2" />

          <label className="mb-2 block text-sm font-semibold text-brand-800">Category</label>
          <input value={category} onChange={(e) => setCategory(e.target.value)} className="mb-3 w-full rounded-xl border border-brand-200 px-3 py-2" />

          <label className="mb-2 block text-sm font-semibold text-brand-800">Description</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="mb-3 w-full rounded-xl border border-brand-200 px-3 py-2" />

          <div className="mb-3 rounded-xl bg-white p-3">
            <p className="mb-2 font-semibold text-brand-900">Fields</p>
            <div className="space-y-2">
              {fields.map((f, idx) => (
                <div key={f.id} className="grid gap-2 md:grid-cols-4">
                  <input
                    value={f.label}
                    onChange={(e) =>
                      setFields((prev) => prev.map((it, i) => (i === idx ? { ...it, label: e.target.value } : it)))
                    }
                    className="rounded-lg border border-brand-200 px-2 py-1"
                  />
                  <select
                    value={f.type}
                    onChange={(e) => setFields((prev) => prev.map((it, i) => (i === idx ? { ...it, type: e.target.value as FieldType } : it)))}
                    className="rounded-lg border border-brand-200 px-2 py-1"
                  >
                    <option value="text">Text</option>
                    <option value="number">Number</option>
                    <option value="date">Date</option>
                    <option value="dropdown">Dropdown</option>
                    <option value="checkbox">Checkbox</option>
                    <option value="signature">Signature</option>
                  </select>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={f.required}
                      onChange={(e) => setFields((prev) => prev.map((it, i) => (i === idx ? { ...it, required: e.target.checked } : it)))}
                    />
                    Required
                  </label>
                  <button
                    onClick={() => setFields((prev) => prev.filter((_, i) => i !== idx))}
                    className="rounded-lg bg-red-50 px-2 py-1 text-red-700"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() =>
                setFields((prev) => [...prev, { id: `field_${prev.length + 1}`, label: "New Field", type: "text", required: false }])
              }
              className="rounded-xl bg-white px-4 py-2 font-semibold text-brand-800"
            >
              Add Field
            </button>
            <button onClick={saveForm} className="rounded-xl bg-brand-700 px-4 py-2 font-semibold text-white">
              Publish Form
            </button>
          </div>
        </section>

        <section className="glass-card rounded-2xl p-5 shadow-card">
          <h2 className="mb-3 font-display text-xl text-brand-900">Published Forms</h2>
          <div className="space-y-2">
            {forms.map((form) => (
              <article key={form.id} className="rounded-xl bg-white p-3">
                <p className="font-semibold text-brand-900">{form.name}</p>
                <p className="text-sm text-brand-700">{form.category}</p>
                <p className="text-sm text-brand-800">{form.description}</p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </Layout>
  );
}
