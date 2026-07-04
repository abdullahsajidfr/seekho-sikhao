import { useEffect } from 'react';
import { setLogContext } from '../lib/autolog';
import type { AdminControl } from '../types/admin';

/**
 * Keeps the auto-logger's ambient session context in sync with a surface.
 * Call from any surface that owns a roomCode/session so auto-captured events
 * carry the right sessionId, relativeMs, task phase, and student info.
 */
export function useLogContext(
  roomCode: string | null | undefined,
  adminControl: AdminControl | null | undefined,
): void {
  useEffect(() => {
    setLogContext({
      roomCode: roomCode ?? '',
      sessionStartTime: adminControl?.sessionStartTime ?? null,
      activeTask: adminControl?.activeTask ?? null,
      studentName: adminControl?.studentName ?? '',
      grade: adminControl?.grade ?? '',
    });
  }, [
    roomCode,
    adminControl?.sessionStartTime,
    adminControl?.activeTask,
    adminControl?.studentName,
    adminControl?.grade,
  ]);
}
