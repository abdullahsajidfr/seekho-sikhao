import { useEffect, useState } from 'react';
import { subscribeToSession } from '../firebase/session';
import { firebaseEnabled } from '../firebase/config';
import { demoSession } from '../firebase/demo';
import type { Session } from '../types/session';

export function useSession(roomCode: string | null) {
  // With no Firebase credentials, seed a static demo session so the UI can be
  // previewed offline (all data-layer writes no-op — see firebase/session.ts).
  const [session, setSession] = useState<Session | null>(
    () => (firebaseEnabled ? null : demoSession())
  );
  const [loading, setLoading] = useState(firebaseEnabled);

  useEffect(() => {
    if (!roomCode || !firebaseEnabled) return;
    setLoading(true);
    const unsubscribe = subscribeToSession(roomCode, (data) => {
      setSession(data);
      setLoading(false);
    });
    return unsubscribe;
  }, [roomCode]);

  return { session, loading };
}
