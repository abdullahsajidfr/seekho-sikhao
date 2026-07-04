import { storage, firebaseEnabled } from './config';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

/**
 * React Native adaptation of the web storage layer. On device we receive local
 * file URIs (from expo-camera / expo-image-picker) or data URIs (from the
 * drawing canvas view-shot) rather than DOM File/Blob objects. Without Firebase
 * credentials every helper returns the local URI unchanged so the UI still
 * shows the image in the chat while running in demo mode.
 */

export async function uploadCanvasImage(roomCode: string, dataUrl: string): Promise<string> {
  if (!firebaseEnabled) return dataUrl;
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  const path = `sessions/${roomCode}/canvas/${Date.now()}.png`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, blob);
  return getDownloadURL(storageRef);
}

export async function uploadPhoto(roomCode: string, uri: string): Promise<string> {
  if (!firebaseEnabled) return uri;
  const res = await fetch(uri);
  const blob = await res.blob();
  const path = `sessions/${roomCode}/photos/${Date.now()}.jpg`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, blob);
  return getDownloadURL(storageRef);
}
