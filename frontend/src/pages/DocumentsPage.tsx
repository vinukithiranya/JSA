import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import { api, authHeader, downloadFile } from "../api";
import type { DocumentItem, User } from "../types";

type Props = { user: User | null; onLogout: () => void };

/** Renders the documents library page with upload form and document listing. */
export default function DocumentsPage({ user, onLogout }: Props) {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [category, setCategory] = useState("SOP");
  const [folder, setFolder] = useState("General");

  /** Fetches the list of documents from the API and updates state. */
  async function load() {
    const data = await api<DocumentItem[]>("/api/documents");
    setDocuments(data);
  }

  useEffect(() => {
    load().catch(() => null);
  }, []);

  /** Uploads the selected file with category and folder metadata, then reloads the document list. */
  async function upload() {
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    formData.append("category", category);
    formData.append("folder", folder);
    formData.append("description", "Uploaded from app");

    await fetch("/api/documents/upload", {
      method: "POST",
      headers: authHeader(),
      body: formData,
    });

    setFile(null);
    await load();
  }

  return (
    <Layout user={user} title="Documents Library" onLogout={onLogout}>
      <div className="grid gap-4 md:grid-cols-3">
        <section className="glass-card rounded-2xl p-5 shadow-card md:col-span-1">
          <h2 className="mb-3 font-display text-xl text-brand-900">Upload Document</h2>
          <input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="mb-3 w-full" />
          <input value={category} onChange={(e) => setCategory(e.target.value)} className="mb-2 w-full rounded-xl border border-brand-200 px-3 py-2" />
          <input value={folder} onChange={(e) => setFolder(e.target.value)} className="mb-3 w-full rounded-xl border border-brand-200 px-3 py-2" />
          <button onClick={upload} className="w-full rounded-xl bg-brand-700 py-2 font-semibold text-white">Upload</button>
        </section>

        <section className="glass-card rounded-2xl p-5 shadow-card md:col-span-2">
          <h2 className="mb-3 font-display text-xl text-brand-900">Documents</h2>
          <div className="space-y-2">
            {documents.map((doc) => (
              <article key={doc.id} className="rounded-xl bg-white p-3">
                <p className="font-semibold text-brand-900">{doc.original_filename}</p>
                <p className="text-sm text-brand-700">{doc.category} / {doc.folder}</p>
                <button
                  className="text-sm text-brand-800 underline"
                  onClick={() => downloadFile(`/api/documents/${doc.id}/download`)}
                >
                  Open file
                </button>
              </article>
            ))}
            {documents.length === 0 ? <p>No documents uploaded yet.</p> : null}
          </div>
        </section>
      </div>
    </Layout>
  );
}
