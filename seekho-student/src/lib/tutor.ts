/**
 * Client trigger for the server-side AI auto-tutor (the full-auto tutor that
 * replaces the human Wizard-of-Oz operator). After every student action the app
 * pings this endpoint with the room code; the backend then reads the latest
 * message from RTDB, calls the model, and writes the AI reply back into the same
 * session — exactly where the wizard used to.
 *
 * Fire-and-forget by design: this never throws and never blocks the UI. If
 * `EXPO_PUBLIC_TUTOR_ENDPOINT` is not configured it is a no-op, so the app keeps
 * working in demo mode and in the manual WoZ setup.
 */
export function triggerTutor(roomCode: string): void {
  const endpoint = process.env.EXPO_PUBLIC_TUTOR_ENDPOINT;
  if (!endpoint) return;

  try {
    // Not awaited on purpose — the AI reply arrives asynchronously via the RTDB
    // listener, so we don't want to hold up the student's send/submit/hint tap.
    fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomCode }),
    }).catch((err) => console.log('[tutor] trigger request failed', err));
  } catch (err) {
    console.log('[tutor] trigger error', err);
  }
}
