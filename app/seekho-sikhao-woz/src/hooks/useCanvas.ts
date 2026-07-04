import { useRef, useEffect } from 'react';

export function useCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width  = rect.width  * dpr;
    canvas.height = rect.height * dpr;
    const ctx = canvas.getContext('2d')!;
    ctx.scale(dpr, dpr);
    ctx.lineCap  = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#1A1A1A';

    let drawing = false;

    function getPos(e: PointerEvent) {
      const r = canvas!.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    }

    function onDown(e: PointerEvent) {
      e.preventDefault(); // prevent tap-to-select text on pen tap
      if (e.pointerType !== 'pen') return;
      drawing = true;
      const { x, y } = getPos(e);
      ctx.beginPath();
      ctx.moveTo(x, y);
    }

    function onMove(e: PointerEvent) {
      e.preventDefault();
      if (!drawing || e.pointerType !== 'pen') return;
      const { x, y } = getPos(e);
      ctx.lineWidth = e.pressure * 3 + 1;
      ctx.lineTo(x, y);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x, y);
    }

    function onUp(e: PointerEvent) {
      if (e.pointerType !== 'pen') return;
      drawing = false;
    }

    canvas.addEventListener('pointerdown',  onDown, { passive: false });
    canvas.addEventListener('pointermove',  onMove, { passive: false });
    canvas.addEventListener('pointerup',    onUp);
    canvas.addEventListener('pointerleave', onUp);

    return () => {
      canvas.removeEventListener('pointerdown',  onDown);
      canvas.removeEventListener('pointermove',  onMove);
      canvas.removeEventListener('pointerup',    onUp);
      canvas.removeEventListener('pointerleave', onUp);
    };
  }, []);

  function clearCanvas() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.getContext('2d')!.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
  }

  function getImageDataURL(): string | null {
    return canvasRef.current?.toDataURL('image/png') ?? null;
  }

  return { canvasRef, clearCanvas, getImageDataURL };
}
