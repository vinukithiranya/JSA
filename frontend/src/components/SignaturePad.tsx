import { useEffect, useRef, useState } from "react";

type Props = {
  onSave: (dataUrl: string) => void;
  width?: number;
  height?: number;
  className?: string;
};

/** Renders a mouse/touch signature-drawing canvas with Clear and Save actions, saving the result as a PNG data URL. */
export default function SignaturePad({ onSave, width = 900, height = 240, className }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [isEmpty, setIsEmpty] = useState(true);

  /** Clears the canvas and resets it to a white background. */
  function initCanvas() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setIsEmpty(true);
  }

  useEffect(() => { initCanvas(); }, []);

  /** Returns the canvas coordinates of a mouse or touch event, scaled to the canvas dimensions. */
  function getPos(e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ("touches" in e) {
      const t = e.touches[0];
      return { x: (t.clientX - rect.left) * scaleX, y: (t.clientY - rect.top) * scaleY };
    }
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  }

  /** Begins a new drawing path on the canvas at the pointer position. */
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

  /** Draws a stroke on the canvas as the pointer moves, marking the signature as non-empty. */
  function draw(e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) {
    e.preventDefault();
    if (!drawing.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const { x, y } = getPos(e, canvas);
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#1e3a5f";
    ctx.lineTo(x, y);
    ctx.stroke();
    setIsEmpty(false);
  }

  /** Stops the active drawing stroke on the canvas. */
  function stopDraw() { drawing.current = false; }

  /** Exports the canvas as a PNG data URL and hands it to the caller. */
  function save() {
    const canvas = canvasRef.current;
    if (!canvas || isEmpty) return;
    onSave(canvas.toDataURL("image/png"));
  }

  return (
    <div className={className}>
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-medium text-gray-500">Draw your signature below</p>
        <button type="button" onClick={initCanvas}
          className="rounded-lg border border-brand-200 px-3 py-1 text-xs font-semibold text-brand-600 hover:bg-brand-50">
          Clear
        </button>
      </div>
      <div className="relative overflow-hidden rounded-xl border-2 border-brand-300 bg-white shadow-inner" style={{ minHeight: height / 3 }}>
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
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
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-1">
            <span className="text-3xl opacity-20">✍</span>
            <p className="text-xs font-medium text-brand-300">Sign here using your mouse, finger, or stylus</p>
          </div>
        )}
      </div>
      <button type="button" onClick={save} disabled={isEmpty}
        className="mt-3 w-full rounded-lg bg-brand-700 py-2 text-sm font-semibold text-white transition hover:bg-brand-800 disabled:opacity-40 disabled:cursor-not-allowed">
        Save signature
      </button>
    </div>
  );
}
