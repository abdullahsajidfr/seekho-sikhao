import { forwardRef, useImperativeHandle } from 'react';
import { useCanvas } from '../../../hooks/useCanvas';
import styles from './DrawingCanvas.module.css';

export interface DrawingCanvasHandle {
  clear: () => void;
  getImageDataURL: () => string | null;
}

const DrawingCanvas = forwardRef<DrawingCanvasHandle>((_, ref) => {
  const { canvasRef, clearCanvas, getImageDataURL } = useCanvas();

  useImperativeHandle(ref, () => ({ clear: clearCanvas, getImageDataURL }));

  return (
    <canvas
      ref={canvasRef}
      className={styles.canvas}
      style={{ touchAction: 'none' }}
    />
  );
});

DrawingCanvas.displayName = 'DrawingCanvas';
export default DrawingCanvas;
