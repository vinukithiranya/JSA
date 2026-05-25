import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import { api } from "../api";
import type { InspectionRecord, JsaRecord, User } from "../types";

type Props = { user: User | null; onLogout: () => void };

type ApprovedInfo = { id: string; label: string; type: "jsa" | "inspection" };
type PendingItem =
  | { kind: "jsa"; data: JsaRecord }
  | { kind: "inspection"; data: InspectionRecord };

export default function SupervisorPage({ user, onLogout }: Props) {
  const navigate                        = useNavigate();
  const [items, setItems]               = useState<PendingItem[]>([]);
  const [signingItem, setSigningItem]   = useState<PendingItem | null>(null);
  const [approved, setApproved]         = useState<ApprovedInfo | null>(null);
  const [isEmpty, setIsEmpty]           = useState(true);
  const [approving, setApproving]       = useState(false);
  const canvasRef                       = useRef<HTMLCanvasElement>(null);
  const drawing                         = useRef(false);

  async function load() {
    const [jsas, inspections] = await Promise.all([
      api<JsaRecord[]>("/api/jsa"),
      api<InspectionRecord[]>("/api/inspections"),
    ]);
    const pending: PendingItem[] = [
      ...jsas
        .filter((x) => x.status === "pending_approval")
        .map((d): PendingItem => ({ kind: "jsa", data: d })),
      ...inspections
        .filter((x) => x.status === "pending_approval" || x.status === "completed")
        .map((d): PendingItem => ({ kind: "inspection", data: d })),
    ];
    setItems(pending);
  }

  useEffect(() => { load().catch(() => null); }, []);

  /* ── canvas helpers ─────────────────────────────────────────────────────── */

  function initCanvas() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setIsEmpty(true);
  }

  function openSignModal(item: PendingItem) {
    setSigningItem(item);
    setIsEmpty(true);
    setTimeout(initCanvas, 60);
  }

  function getPos(e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) {
    const rect   = canvas.getBoundingClientRect();
    const scaleX = canvas.width  / rect.width;
    const scaleY = canvas.height / rect.height;
    if ("touches" in e) {
      const t = e.touches[0];
      return { x: (t.clientX - rect.left) * scaleX, y: (t.clientY - rect.top) * scaleY };
    }
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  }

  function startDraw(e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) {
    e.preventDefault();
    drawing.current = true;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const { x, y } = getPos(e, canvas);
    ctx.beginPath();
    ctx.moveTo(x, y);
  }

  function draw(e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) {
    e.preventDefault();
    if (!drawing.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const { x, y } = getPos(e, canvas);
    ctx.lineWidth   = 3;
    ctx.lineCap     = "round";
    ctx.lineJoin    = "round";
    ctx.strokeStyle = "#1e3a5f";
    ctx.lineTo(x, y);
    ctx.stroke();
    setIsEmpty(false);
  }

  function stopDraw() { drawing.current = false; }

  /* ── approve ────────────────────────────────────────────────────────────── */

  async function confirmApprove() {
    if (!signingItem || isEmpty) return;
    setApproving(true);
    try {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const signature = canvas.toDataURL("image/png");
      const supervisorName = user?.full_name ?? "Supervisor";

      if (signingItem.kind === "jsa") {
        const jsa = signingItem.data;
        await api(`/api/jsa/${jsa.id}/approve`, {
          method: "POST",
          body: JSON.stringify({ signature, supervisor_name: supervisorName }),
        });
        setApproved({ id: jsa.id, label: `${jsa.job_number} — ${jsa.boat_name}`, type: "jsa" });
      } else {
        const insp = signingItem.data;
        await api(`/api/inspections/${insp.id}/approve`, {
          method: "POST",
          body: JSON.stringify({ approved_by: supervisorName, signature }),
        });
        setApproved({ id: insp.id, label: insp.title || insp.template_name, type: "inspection" });
      }

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

  const totalCount = items.length;
  const jsaCount   = items.filter((i) => i.kind === "jsa").length;
  const inspCount  = items.filter((i) => i.kind === "inspection").length;

  /* ── helpers ────────────────────────────────────────────────────────────── */

  function itemLabel(item: PendingItem): string {
    if (item.kind === "jsa") return `${item.data.job_number} — ${item.data.boat_name}`;
    return item.data.title || item.data.template_name;
  }

  function signingLabel(): string {
    if (!signingItem) return "";
    return itemLabel(signingItem);
  }

  /* ── render ─────────────────────────────────────────────────────────────── */

  return (
    <Layout user={user} title="Approval Queue" onLogout={onLogout}>

      {/* ── Header row ─────────────────────────────────────────────────────── */}
      <div className="mb-4 flex items-center justify-between">
        <div className="text-sm text-brand-600 space-x-3">
          <span>
            <span className="font-bold text-brand-900">{totalCount}</span>
            {" "}item{totalCount !== 1 ? "s" : ""} pending approval
          </span>
          {totalCount > 0 && (
            <span className="text-brand-400">
              ({jsaCount} JSA{jsaCount !== 1 ? "s" : ""}, {inspCount} inspection{inspCount !== 1 ? "s" : ""})
            </span>
          )}
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
          {items.map((item) =>
            item.kind === "jsa" ? (
              /* ── JSA card ── */
              <article
                key={`jsa-${item.data.id}`}
                className="rounded-xl border border-brand-100 bg-white p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded bg-purple-100 px-2 py-0.5 text-xs font-bold text-purple-700">JSA</span>
                      <h3 className="text-sm font-bold text-brand-900">{item.data.job_number}</h3>
                      <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700">Pending</span>
                    </div>
                    <p className="mt-0.5 text-sm text-brand-700">{item.data.boat_name}</p>
                    <div className="mt-1.5 flex flex-wrap gap-3 text-xs text-brand-500">
                      <span>SL: {item.data.service_log_number}</span>
                      <span>📍 {item.data.location}</span>
                      <span>📅 {String(item.data.date)}</span>
                      <span>{item.data.hazards.length} hazard{item.data.hazards.length !== 1 ? "s" : ""}</span>
                      <span>{item.data.steps.length} steps</span>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
                    <button
                      onClick={() => navigate(`/jsa/report/${item.data.id}`)}
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
            ) : (
              /* ── Inspection card ── */
              <article
                key={`insp-${item.data.id}`}
                className="rounded-xl border border-brand-100 bg-white p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded bg-blue-100 px-2 py-0.5 text-xs font-bold text-blue-700">Inspection</span>
                      <h3 className="text-sm font-bold text-brand-900">
                        {item.data.title || item.data.template_name}
                      </h3>
                      <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700">Pending</span>
                    </div>
                    <p className="mt-0.5 text-sm text-brand-700">{item.data.template_name}</p>
                    <div className="mt-1.5 flex flex-wrap gap-3 text-xs text-brand-500">
                      {item.data.site && <span>📍 {item.data.site}</span>}
                      {item.data.completed_at && (
                        <span>📅 {new Date(item.data.completed_at).toLocaleDateString("en-AU")}</span>
                      )}
                      {item.data.score !== null && (
                        <span className={`font-semibold ${item.data.score >= 70 ? "text-green-600" : "text-red-600"}`}>
                          Score: {item.data.score}%
                        </span>
                      )}
                      {(item.data.flagged_items as unknown[]).length > 0 && (
                        <span className="text-red-500">
                          ⚑ {(item.data.flagged_items as unknown[]).length} flag{(item.data.flagged_items as unknown[]).length !== 1 ? "s" : ""}
                        </span>
                      )}
                      <span>{item.data.answered_questions}/{item.data.total_questions} answered</span>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
                    <button
                      onClick={() => navigate(`/inspections/report/${item.data.id}`)}
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
            )
          )}
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
              <p className="text-xs text-green-100">{signingLabel()}</p>
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
              <p className="text-xs font-bold uppercase tracking-wider text-brand-500 mb-2">
                {signingItem.kind === "jsa" ? "JSA Summary" : "Inspection Summary"}
              </p>
              {signingItem.kind === "jsa" ? (
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-brand-700 sm:grid-cols-3">
                  <div><span className="font-semibold">Job:</span> {signingItem.data.job_number}</div>
                  <div><span className="font-semibold">Vessel:</span> {signingItem.data.boat_name}</div>
                  <div><span className="font-semibold">Location:</span> {signingItem.data.location}</div>
                  <div><span className="font-semibold">Date:</span> {String(signingItem.data.date)}</div>
                  <div><span className="font-semibold">Steps:</span> {signingItem.data.steps.length}</div>
                  <div><span className="font-semibold">Hazards:</span> {signingItem.data.hazards.length}</div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-brand-700 sm:grid-cols-3">
                  <div><span className="font-semibold">Title:</span> {signingItem.data.title || signingItem.data.template_name}</div>
                  <div><span className="font-semibold">Template:</span> {signingItem.data.template_name}</div>
                  {signingItem.data.site && <div><span className="font-semibold">Site:</span> {signingItem.data.site}</div>}
                  {signingItem.data.score !== null && (
                    <div><span className="font-semibold">Score:</span> {signingItem.data.score}%</div>
                  )}
                  <div><span className="font-semibold">Answered:</span> {signingItem.data.answered_questions}/{signingItem.data.total_questions}</div>
                  <div><span className="font-semibold">Flags:</span> {(signingItem.data.flagged_items as unknown[]).length}</div>
                </div>
              )}
            </div>

            {/* Signature pad */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-bold text-brand-800">Draw your signature below</p>
                <button
                  onClick={initCanvas}
                  className="rounded-lg border border-brand-200 px-3 py-1 text-xs font-semibold text-brand-600 hover:bg-brand-50"
                >
                  Clear
                </button>
              </div>
              <div
                className="relative overflow-hidden rounded-2xl border-2 border-brand-300 bg-white shadow-inner"
                style={{ minHeight: 200 }}
              >
                <canvas
                  ref={canvasRef}
                  width={900}
                  height={240}
                  className="w-full touch-none cursor-crosshair"
                  style={{ display: "block" }}
                  onMouseDown={startDraw}
                  onMouseMove={draw}
                  onMouseUp={stopDraw}
                  onMouseLeave={stopDraw}
                  onTouchStart={startDraw}
                  onTouchMove={draw}
                  onTouchEnd={stopDraw}
                />
                {isEmpty && (
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2">
                    <span className="text-4xl opacity-20">✍</span>
                    <p className="text-sm font-medium text-brand-300">Sign here using your finger or stylus</p>
                  </div>
                )}
              </div>
              <p className="mt-2 text-center text-xs text-brand-400">
                Your signature will be embedded in the record
              </p>
            </div>

            {/* Legal acknowledgement */}
            <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-xs text-amber-800">
              {signingItem.kind === "jsa"
                ? "By signing above you confirm that you have reviewed this Job Safety Assessment and approve it for execution. This approval is legally binding under the applicable safety management system."
                : "By signing above you confirm that you have reviewed this Inspection report and approve it. This approval is recorded in the safety management system."}
            </div>
          </div>

          {/* ── Fixed bottom action bar ──────────────────────────────────── */}
          <div className="border-t border-brand-100 bg-white px-5 py-4 shadow-lg">
            <button
              onClick={confirmApprove}
              disabled={isEmpty || approving}
              className="w-full rounded-xl py-4 text-base font-bold text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: isEmpty || approving ? undefined : "#377133" }}
            >
              {approving
                ? "Saving approval…"
                : isEmpty
                  ? "Draw your signature to continue"
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
              <h2 className="text-xl font-bold text-white">
                {approved.type === "jsa" ? "JSA" : "Inspection"} Approved!
              </h2>
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
                  const path = approved.type === "jsa"
                    ? `/jsa/report/${approved.id}`
                    : `/inspections/report/${approved.id}`;
                  setApproved(null);
                  navigate(path);
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
