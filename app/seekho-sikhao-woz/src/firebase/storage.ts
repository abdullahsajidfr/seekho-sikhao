import { storage, firebaseEnabled } from './config';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

export async function uploadCanvasImage(roomCode: string, dataUrl: string): Promise<string> {
  if (!firebaseEnabled) return dataUrl;
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  const path = `sessions/${roomCode}/canvas/${Date.now()}.png`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, blob);
  return getDownloadURL(storageRef);
}

export async function uploadPhoto(roomCode: string, file: File): Promise<string> {
  if (!firebaseEnabled) return URL.createObjectURL(file);
  const compressed = await compressImage(file, 0.7);
  const path = `sessions/${roomCode}/photos/${Date.now()}.jpg`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, compressed);
  return getDownloadURL(storageRef);
}

async function compressImage(file: File, quality: number): Promise<Blob> {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const MAX = 1200;
      const scale = Math.min(1, MAX / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width  = img.width  * scale;
      canvas.height = img.height * scale;
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => resolve(blob!), 'image/jpeg', quality);
      URL.revokeObjectURL(url);
    };
    img.src = url;
  });
}
