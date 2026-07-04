import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import styles from './CameraScreen.module.css';

interface Props {
  onCapture: (file: File) => void;
  onClose: () => void;
}

/**
 * Full-screen homework camera matching the Figma "Camera Open" screen:
 * dark backdrop, bracketed viewfinder, gallery / capture / flip controls.
 * Uses a live getUserMedia preview when a camera is available, and falls back
 * to the native file picker (capture button + gallery) when it is not — so the
 * existing photo-upload flow keeps working on every device.
 */
export default function CameraScreen({ onCapture, onClose }: Props) {
  const videoRef  = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const cameraRef  = useRef<HTMLInputElement>(null);
  const [facing, setFacing] = useState<'environment' | 'user'>('environment');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function startCamera() {
      if (!navigator.mediaDevices?.getUserMedia) return;
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: facing },
          audio: false,
        });
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
        setReady(true);
      } catch {
        setReady(false); // permission denied / no camera — keep bracketed placeholder
      }
    }

    startCamera();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    };
  }, [facing]);

  function stopStream() {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  }

  function handleCapture() {
    const video = videoRef.current;
    if (ready && video && video.videoWidth) {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext('2d')!.drawImage(video, 0, 0);
      canvas.toBlob(
        (blob) => {
          if (!blob) return;
          const file = new File([blob], `homework-${Date.now()}.jpg`, { type: 'image/jpeg' });
          stopStream();
          onCapture(file);
        },
        'image/jpeg',
        0.9
      );
    } else {
      // No live camera — open the native camera / picker.
      cameraRef.current?.click();
    }
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    stopStream();
    onCapture(file);
  }

  function handleClose() {
    stopStream();
    onClose();
  }

  return createPortal(
    <div className={styles.screen}>
      <div className={styles.topBar}>
        <button className={styles.backBtn} onClick={handleClose} aria-label="Close camera">
          <svg className={styles.backIcon} viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M3.825 9L9.425 14.6L8 16L0 8L8 0L9.425 1.4L3.825 7H16V9H3.825Z" fill="currentColor" />
          </svg>
        </button>
        <span className={styles.title}>Point at your homework</span>
        <span className={styles.topSpacer} />
      </div>

      <div className={styles.viewfinderWrap}>
        <div className={styles.viewfinder}>
          <video
            ref={videoRef}
            className={styles.video}
            data-ready={ready}
            playsInline
            muted
          />
          {!ready && <span className={styles.hint}>Align your homework here</span>}
          <span className={`${styles.corner} ${styles.tl}`} />
          <span className={`${styles.corner} ${styles.tr}`} />
          <span className={`${styles.corner} ${styles.bl}`} />
          <span className={`${styles.corner} ${styles.br}`} />
        </div>
      </div>

      <div className={styles.controls}>
        <button className={styles.sideBtn} onClick={() => galleryRef.current?.click()} aria-label="Choose from gallery">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <path d="M21 15l-5-5L5 21" />
          </svg>
        </button>

        <button className={styles.capture} onClick={handleCapture} aria-label="Take photo" />

        <button className={styles.sideBtn} onClick={() => setFacing(f => (f === 'environment' ? 'user' : 'environment'))} aria-label="Flip camera">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M23 4v6h-6" />
            <path d="M1 20v-6h6" />
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
          </svg>
        </button>
      </div>

      <input ref={galleryRef} type="file" accept="image/*" className={styles.hiddenInput} onChange={handleFile} />
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" className={styles.hiddenInput} onChange={handleFile} />
    </div>,
    document.body
  );
}
