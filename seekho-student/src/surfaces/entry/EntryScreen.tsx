import React from 'react';
import { authenticate } from '../../firebase/auth';
import LoginScreen from '../student/screens/LoginScreen';

interface Props {
  onEnter: (roomCode: string, studentName: string, isNew: boolean) => void;
}

/**
 * Entry point = the username/password login (no room-code keypad — Item 7).
 * `authenticate` signs up a new username on first use and verifies the password
 * for returning users; on success it derives the session id + display name from
 * the username. Failures are shown inline by LoginScreen.
 */
export default function EntryScreen({ onEnter }: Props) {
  async function handleSubmit(username: string, password: string) {
    const res = await authenticate(username, password);
    if (res.ok && res.roomCode) {
      onEnter(res.roomCode, res.studentName ?? '', !!res.isNew);
      return { ok: true };
    }
    return { ok: false, error: res.error };
  }

  return <LoginScreen onSubmit={handleSubmit} />;
}
