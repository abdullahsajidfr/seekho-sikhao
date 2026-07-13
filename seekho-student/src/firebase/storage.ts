import { storage, firebaseEnabled } from './config';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

/**
 * React Native adaptation of the web storage layer. On device we receive local
 * file URIs (from expo-camera / expo-image-picker) or data URIs (from the
 * drawing canvas view-shot) rather than DOM File/Blob objects. Without Firebase
 * credentials every helper returns the local URI unchanged so the UI still
 * shows the image in the chat while running in demo mode.
 */

/**
 * Read a local `file://` (or `data:`) URI into a real Blob.
 *
 * IMPORTANT: on React Native/iOS, `fetch(fileUri).then(r => r.blob())` — the
 * pattern that works on the web — frequently yields an empty or broken blob, so
 * `uploadBytes` silently uploads nothing and the photo never appears. The
 * reliable RN pattern is an `XMLHttpRequest` with `responseType = 'blob'`, which
 * goes through RN's native BlobModule and produces a valid, uploadable Blob.
 */
function uriToBlob(uri: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.responseType = 'blob';
    xhr.onload = () => {
      if (xhr.response) resolve(xhr.response as Blob);
      else reject(new Error(`uriToBlob: empty blob for ${uri.slice(0, 40)}`));
    };
    xhr.onerror = () => reject(new Error(`uriToBlob: request failed for ${uri.slice(0, 40)}`));
    xhr.open('GET', uri, true);
    xhr.send(null);
  });
}

async function uploadUri(path: string, uri: string): Promise<string> {
  const blob = await uriToBlob(uri);
  try {
    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, blob);
    return await getDownloadURL(storageRef);
  } finally {
    // RN Blobs allocated by the BlobModule must be released to free memory.
    (blob as unknown as { close?: () => void }).close?.();
  }
}

export async function uploadCanvasImage(roomCode: string, dataUrl: string): Promise<string> {
  if (!firebaseEnabled) return dataUrl;
  try {
    return await uploadUri(`sessions/${roomCode}/canvas/${Date.now()}.png`, dataUrl);
  } catch (err) {
    console.log('[storage] uploadCanvasImage failed', err);
    throw err;
  }
}

export async function uploadPhoto(roomCode: string, uri: string): Promise<string> {
  if (!firebaseEnabled) return uri;
  try {
    return await uploadUri(`sessions/${roomCode}/photos/${Date.now()}.jpg`, uri);
  } catch (err) {
    console.log('[storage] uploadPhoto failed', err);
    throw err;
  }
}
