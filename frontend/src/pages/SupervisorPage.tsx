import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import SignaturePad from "../components/SignaturePad";
import { api } from "../api";
import type { InspectionRecord, User } from "../types";

type Props = { user: User | null; onLogout: () => void };

/** Renders the supervisor approval queue page for reviewing and signing pending inspection records. */
export default function SupervisorPage({ user, onLogout }: Props) {
  const navigate                        = useNavigate();
  const [items, setItems]               = useState<InspectionRecord[]>([]);
  const [signingItem, setSigningItem]   = useState<InspectionRecord | null>(null);
  const [signature, setSignature]       = useState<string | null>(null);
  const [approved, setApproved]         = useState<{ id: string; label: string } | null>(null);
  const [approving, setApproving]       = useState(false);

  /** Fetches pending inspection records from the API and updates the items list. */
  async function load() {
    const inspections = await api<InspectionRecord[]>("/api/inspections");
    setItems(
      inspections.filter((x) => x.status === "pending_approval" || x.status === "completed")
    );
  }

  useEffect(() => { load().catch(() => null); }, []);

  /** Opens the signature modal for the given inspection. */
  function openSignModal(item: InspectionRecord) {
    setSigningItem(item);
    setSignature(null);
  }

  /* ── approve ────────────────────────────────────────────────────────────── */

  /** Submits the supervisor signature and approves the currently selected inspection record. */
  async function confirmApprove() {
    if (!signingItem || !signature) return;
    setApproving(true);
    try {
      const supervisorName = user?.full_name ?? "Supervisor";

      await api(`/api/inspections/${signingItem.id}/approve`, {
        method: "POST",
        body: JSON.stringify({ approved_by: supervisorName, signature }),
      });
      setApproved({ id: signingItem.id, label: signingItem.title || signingItem.template_name });
      setSigningItem(null);
      await load();
    } finally {
      setApproving(false);
    }
  }

  const approvalTimestamp = new Date().toLocaleString("en-AU", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

  /* ── render ─────────────────────────────────────────────────────────────── */

  return (
    <Layout user={user} title="Approval Queue" onLogout={onLogout}>

      {/* ── Header row ─────────────────────────────────────────────────────── */}
      <div className="mb-4 flex items-center justify-between">
        <div className="text-sm text-brand-600">
          <span className="font-bold text-brand-900">{items.length}</span>
          {" "}inspection{items.length !== 1 ? "s" : ""} pending approval
        </div>
        <button
          onClick={() => load().catch(() => null)}
          className="rounded-lg border border-brand-200 px-3 py-1.5 text-xs font-semibold text-brand-700 hover:bg-brand-50"
        >
          ↻ Refresh
        </button>
      </div>

      {/* ── Approval list ─────────────────────────────────────────────────── */}
      {items.length === 0 ? (
        <div className="rounded-xl border border-brand-100 bg-white p-10 text-center shadow-sm">
          <p className="text-2xl mb-2">✓</p>
          <p className="font-semibold text-brand-700">All clear — no pending approvals</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <article
              key={item.id}
              className="rounded-xl border border-brand-100 bg-white p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded bg-blue-100 px-2 py-0.5 text-xs font-bold text-blue-700">Inspection</span>
                    <h3 className="text-sm font-bold text-brand-900">
                      {item.title || item.template_name}
                    </h3>
                    <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700">Pending</span>
                  </div>
                  <p className="mt-0.5 text-sm text-brand-700">{item.template_name}</p>
                  <div className="mt-1.5 flex flex-wrap gap-3 text-xs text-brand-500">
                    {item.site && <span>📍 {item.site}</span>}
                    {item.completed_at && (
                      <span>📅 {new Date(item.completed_at).toLocaleDateString("en-AU")}</span>
                    )}
                    {item.score !== null && (
                      <span className={`font-semibold ${item.score >= 70 ? "text-green-600" : "text-red-600"}`}>
                        Score: {item.score}%
                      </span>
                    )}
                    {(item.flagged_items as unknown[]).length > 0 && (
                      <span className="text-red-500">
                        ⚑ {(item.flagged_items as unknown[]).length} flag{(item.flagged_items as unknown[]).length !== 1 ? "s" : ""}
                      </span>
                    )}
                    <span>{item.answered_questions}/{item.total_questions} answered</span>
                  </div>
                </div>
                <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
                  <button
                    onClick={() => navigate(`/inspections/report/${item.id}`)}
                    className="rounded-lg border border-brand-200 bg-white px-3 py-2 text-center text-xs font-semibold text-brand-800 transition-colors hover:bg-brand-50"
                  >
                    View Report
                  </button>
                  <button
                    onClick={() => openSignModal(item)}
                    className="rounded-lg bg-brand-700 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-brand-800"
                  >
                    Sign &amp; Approve
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          SIGNATURE MODAL
      ════════════════════════════════════════════════════════════════════ */}
      {signingItem && (
        <div className="fixed inset-0 z-50 flex flex-col bg-white">

          {/* ── Top bar ─────────────────────────────────────────────────── */}
          <div
            className="flex items-center justify-between border-b border-brand-100 px-5 py-3"
            style={{ background: "#377133" }}
          >
            <div>
              <h2 className="text-base font-bold text-white">Supervisor Approval</h2>
              <p className="text-xs text-green-100">{signingItem.title || signingItem.template_name}</p>
            </div>
            <button
              onClick={() => setSigningItem(null)}
              className="rounded-lg bg-white/20 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/30"
            >
              Cancel
            </button>
          </div>

          {/* ── Scrollable body ─────────────────────────────────────────── */}
          <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">

            {/* Who is approving */}
            <div className="rounded-xl border border-brand-200 bg-brand-50 px-4 py-3">
              <p className="text-xs font-bold uppercase tracking-wider text-brand-500 mb-2">Approving As</p>
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-700 text-sm font-bold text-white">
                  {(user?.full_name ?? "S")[0].toUpperCase()}
                </div>
                <div>
                  <p className="font-bold text-brand-900">{user?.full_name}</p>
                  <p className="text-xs text-brand-500 capitalize">{user?.role}</p>
                </div>
                <div className="ml-auto text-right text-xs text-brand-500">
                  <p className="font-semibold text-brand-700">{approvalTimestamp}</p>
                  <p>This name appears on the record</p>
                </div>
              </div>
            </div>

            {/* Item summary */}
            <div className="rounded-xl border border-brand-100 bg-white px-4 py-3 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-wider text-brand-500 mb-2">Inspection Summary</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-brand-700 sm:grid-cols-3">
                <div><span className="font-semibold">Title:</span> {signingItem.title || signingItem.template_name}</div>
                <div><span className="font-semibold">Template:</span> {signingItem.template_name}</div>
                {signingItem.site && <div><span className="font-semibold">Site:</span> {signingItem.site}</div>}
                {signingItem.score !== null && (
                  <div><span className="font-semibold">Score:</span> {signingItem.score}%</div>
                )}
                <div><span className="font-semibold">Answered:</span> {signingItem.answered_questions}/{signingItem.total_questions}</div>
                <div><span className="font-semibold">Flags:</span> {(signingItem.flagged_items as unknown[]).length}</div>
              </div>
            </div>

            {/* Signature pad */}
            <div>
              {signature ? (
                <div className="flex items-center gap-3 rounded-2xl border-2 border-brand-300 bg-white p-3 shadow-inner">
                  <img src={signature} alt="Signature preview" className="h-24 flex-1 object-contain" />
                  <button
                    onClick={() => setSignature(null)}
                    className="shrink-0 rounded-lg border border-brand-200 px-3 py-1.5 text-xs font-semibold text-brand-600 hover:bg-brand-50"
                  >
                    Redo
                  </button>
                </div>
              ) : (
                <SignaturePad onSave={setSignature} height={240} />
              )}
              <p className="mt-2 text-center text-xs text-brand-400">
                Your signature will be embedded in the record
              </p>
            </div>

            {/* Legal acknowledgement */}
            <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-xs text-amber-800">
              By signing above you confirm that you have reviewed this Inspection report and approve it. This approval is recorded in the safety management system.
            </div>
          </div>

          {/* ── Fixed bottom action bar ──────────────────────────────────── */}
          <div className="border-t border-brand-100 bg-white px-5 py-4 shadow-lg">
            <button
              onClick={confirmApprove}
              disabled={!signature || approving}
              className="w-full rounded-xl py-4 text-base font-bold text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: !signature || approving ? undefined : "#377133" }}
            >
              {approving
                ? "Saving approval…"
                : !signature
                  ? "Draw and save your signature to continue"
                  : "Confirm & Approve  ✓"}
            </button>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          SUCCESS MODAL
      ════════════════════════════════════════════════════════════════════ */}
      {approved && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden">
            <div className="px-6 py-8 text-center" style={{ background: "#377133" }}>
              <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-white/20 text-3xl">✓</div>
              <h2 className="text-xl font-bold text-white">Inspection Approved!</h2>
              <p className="mt-1 text-sm text-green-100">{approved.label}</p>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="rounded-lg bg-brand-50 border border-brand-200 px-4 py-3 text-xs text-brand-700 space-y-1">
                <p><span className="font-semibold">Approved by:</span> <span className="font-bold text-brand-900">{user?.full_name}</span></p>
                <p><span className="font-semibold">Date / Time:</span> {approvalTimestamp}</p>
                <p className="text-brand-500">Approval details are now recorded in the system.</p>
              </div>
              <button
                onClick={() => {
                  setApproved(null);
                  navigate(`/inspections/report/${approved.id}`);
                }}
                className="flex items-center justify-center gap-2 w-full rounded-xl py-4 text-sm font-bold text-white transition-colors"
                style={{ background: "#377133" }}
              >
                <span className="text-lg">🖨</span>
                Open &amp; Export Signed PDF
              </button>
              <button
                onClick={() => setApproved(null)}
                className="w-full rounded-xl border border-brand-200 py-3 text-sm font-semibold text-brand-700 hover:bg-brand-50"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
