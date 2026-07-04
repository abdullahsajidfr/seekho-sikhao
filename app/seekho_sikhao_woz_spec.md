# Seekho Sikhao — WoZ Prototype Specification
**Project:** HCI Usability Testing Prototype  
**Group:** ctrl+alt+del (Group 6)  
**Version:** 2.0 (React/TS)  
**Stack:** React 18 + TypeScript + Vite + CSS Modules + Firebase v9 (modular) + Vercel  

---

## 1. Overview

A Wizard of Oz web prototype for usability testing of Seekho Sikhao. Four surfaces run as routes in one single-page React application:

| Surface | URL | Device | Description |
|---|---|---|---|
| Room Entry | `/` | iPad | Tester enters room code before handing to child |
| Student | `/student` | iPad | Child-facing app (WoZ-enabled) |
| Wizard | `/wizard?key=ctrl-alt-del` | Laptop | Operator control panel |
| Teacher | `/teacher` | Tablet/laptop | Static + pseudo-interactive teacher UI |

The `?key=` param on `/wizard` is light friction — not real auth — to prevent a child from stumbling onto it. The wizard bookmarks the full URL.

**Real-time backend:** Firebase Realtime Database (session state + chat) and Firebase Storage (photo uploads), accessed via Firebase v9 modular SDK.

**Concurrent sessions:** Multiple sessions run simultaneously, isolated by a 4-digit room code. One wizard generates one room code; one tester enters it on the iPad. Firebase data is namespaced under `/sessions/{roomCode}/`.

---

## 2. Project Setup

### Scaffold

```bash
npm create vite@latest seekho-sikhao-woz -- --template react-ts
cd seekho-sikhao-woz
npm install
```

### Dependencies

```bash
# Routing
npm install react-router-dom

# Firebase
npm install firebase

# Nothing else — no UI library, no state management library
# All state: React useState/useReducer + Firebase listeners in useEffect
```

### Vercel Config

Create `vercel.json` at project root for SPA routing (all paths serve `index.html`):

```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

### Environment Variables

Create `.env.local` (never commit this):

```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_DATABASE_URL=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

Add all seven to Vercel project settings under Environment Variables.

---

## 3. File Structure

```
seekho-sikhao-woz/
├── public/
│   └── icons/                      # Subject SVG icons
│       ├── mathematics.svg
│       ├── english.svg
│       ├── science.svg
│       ├── islamiyat.svg
│       ├── social-studies.svg
│       └── urdu.svg
├── src/
│   ├── main.tsx                    # Vite entry, render <App />
│   ├── App.tsx                     # Router setup, route definitions
│   │
│   ├── firebase/
│   │   ├── config.ts               # initializeApp, getDatabase, getStorage exports
│   │   ├── session.ts              # All Firebase read/write functions
│   │   └── storage.ts              # Photo upload logic
│   │
│   ├── types/
│   │   └── session.ts              # All shared TypeScript types/interfaces
│   │
│   ├── hooks/
│   │   ├── useSession.ts           # Subscribe to /sessions/{roomCode} live
│   │   ├── useCanvas.ts            # Apple Pencil canvas logic
│   │   └── useSpeechRecognition.ts # Web Speech API wrapper
│   │
│   ├── context/
│   │   └── LanguageContext.tsx     # Language (EN/UR) + translations provider
│   │
│   ├── translations/
│   │   └── index.ts                # STRINGS object (EN + UR)
│   │
│   ├── styles/
│   │   └── global.css              # CSS custom properties (design tokens)
│   │
│   └── surfaces/
│       ├── entry/                  # Room code entry (iPad, pre-session)
│       │   ├── EntryPage.tsx
│       │   └── EntryPage.module.css
│       │
│       ├── student/                # Student-facing UI (iPad)
│       │   ├── StudentApp.tsx      # Surface root, screen state machine
│       │   ├── screens/
│       │   │   ├── LoginScreen.tsx
│       │   │   ├── LoginScreen.module.css
│       │   │   ├── SubjectScreen.tsx
│       │   │   ├── SubjectScreen.module.css
│       │   │   ├── InputModeScreen.tsx
│       │   │   ├── InputModeScreen.module.css
│       │   │   ├── ChatScreen.tsx
│       │   │   ├── ChatScreen.module.css
│       │   │   ├── WorkbookScreen.tsx
│       │   │   └── WorkbookScreen.module.css
│       │   └── components/
│       │       ├── TopBar.tsx
│       │       ├── TopBar.module.css
│       │       ├── SubjectCard.tsx
│       │       ├── SubjectCard.module.css
│       │       ├── ChatBubble.tsx
│       │       ├── ChatBubble.module.css
│       │       ├── ThinkingDots.tsx
│       │       ├── ThinkingDots.module.css
│       │       ├── ChatInputBar.tsx
│       │       ├── ChatInputBar.module.css
│       │       ├── WorkbookQuestionCard.tsx
│       │       ├── WorkbookQuestionCard.module.css
│       │       ├── DrawingCanvas.tsx
│       │       ├── DrawingCanvas.module.css
│       │       ├── EndSessionModal.tsx
│       │       └── EndSessionModal.module.css
│       │
│       ├── wizard/                 # Wizard control panel (laptop)
│       │   ├── WizardApp.tsx       # Surface root + key guard
│       │   ├── WizardApp.module.css
│       │   └── components/
│       │       ├── SessionInfo.tsx
│       │       ├── SessionInfo.module.css
│       │       ├── IncomingMessage.tsx
│       │       ├── IncomingMessage.module.css
│       │       ├── SessionControls.tsx
│       │       ├── SessionControls.module.css
│       │       ├── QuickResponses.tsx
│       │       ├── QuickResponses.module.css
│       │       ├── GreetingEditor.tsx
│       │       ├── GreetingEditor.module.css
│       │       ├── ComposePanel.tsx
│       │       └── ComposePanel.module.css
│       │
│       └── teacher/                # Teacher UI (static + pseudo-interactive)
│           ├── TeacherApp.tsx
│           └── screens/
│               ├── TeacherLoginScreen.tsx
│               ├── TeacherDashboard.tsx
│               ├── ClassPage.tsx
│               ├── StudentProfilePage.tsx
│               ├── GuardrailsPage.tsx
│               └── [each].module.css
├── .env.local
├── vercel.json
├── tsconfig.json
└── vite.config.ts
```

---

## 4. TypeScript Types (`src/types/session.ts`)

All surfaces share these types. Define them once here.

```typescript
export type Language = 'en' | 'ur';

export type SessionStatus =
  | 'idle'
  | 'student_sent'
  | 'thinking'
  | 'ai_responded'
  | 'workbook_open'
  | 'workbook_submitted'
  | 'session_end';

export type Subject =
  | 'Mathematics'
  | 'English'
  | 'Science'
  | 'Islamiyat'
  | 'Social Studies'
  | 'Urdu';

export type MessageType = 'text' | 'voice' | 'photo';

export type MessageRole = 'student' | 'ai';

export interface ChatMessage {
  id: string;
  role: MessageRole;
  text: string;
  type: MessageType;
  photoURL?: string;
  workbookQuestion?: string;   // present when AI message triggers workbook
  timestamp: number;
}

export interface StudentMessage {
  text: string;
  type: MessageType;
  photoURL: string | null;
  voiceTranscript: string | null;
  timestamp: number;
}

export interface AiResponse {
  text: string;
  attachWorkbook: boolean;
  workbookQuestion: string;
  timestamp: number;
}

export interface WorkbookState {
  active: boolean;
  submitted: boolean;
}

export interface Greetings {
  Mathematics: string;
  English: string;
  Science: string;
  Islamiyat: string;
  'Social Studies': string;
  Urdu: string;
}

export interface Session {
  status: SessionStatus;
  language: Language;
  subject: Subject | null;
  studentMessage: StudentMessage;
  aiResponse: AiResponse;
  workbookState: WorkbookState;
  showThinking: boolean;
  showEndModal: boolean;
  greetings: Greetings;
  chatHistory: Record<string, ChatMessage>;  // Firebase stores arrays as keyed objects
}
```

> **Note on `chatHistory`:** Firebase Realtime Database does not have native arrays. When you `push()` to a list, Firebase creates auto-generated string keys. Your components must convert `Record<string, ChatMessage>` to `ChatMessage[]` using `Object.values()` sorted by `timestamp`.

---

## 5. Firebase Module (`src/firebase/`)

### `config.ts`

```typescript
import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL:       import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
export const db  = getDatabase(app);
export const storage = getStorage(app);
```

### `session.ts`

All Firebase read/write operations in one place. Surfaces import from here — never write `ref(db, ...)` directly in a component.

```typescript
import { db } from './config';
import {
  ref, set, update, push, get, onValue, off, remove
} from 'firebase/database';
import type { Session, AiResponse, Greetings, ChatMessage } from '../types/session';

// ── Room management ──────────────────────────────────────────────────

export const sessionRef = (roomCode: string) =>
  ref(db, `sessions/${roomCode}`);

export async function generateRoomCode(): Promise<string> {
  // Try up to 10 times to find an unused code
  for (let i = 0; i < 10; i++) {
    const code = String(Math.floor(1000 + Math.random() * 9000));
    const snap = await get(sessionRef(code));
    if (!snap.exists()) return code;
  }
  throw new Error('Could not generate unique room code');
}

export async function createSession(roomCode: string): Promise<void> {
  const initial: Omit<Session, 'chatHistory'> & { chatHistory: null } = {
    status: 'idle',
    language: 'en',
    subject: null,
    studentMessage: { text: '', type: 'text', photoURL: null, voiceTranscript: null, timestamp: 0 },
    aiResponse: { text: '', attachWorkbook: false, workbookQuestion: '', timestamp: 0 },
    workbookState: { active: false, submitted: false },
    showThinking: false,
    showEndModal: false,
    greetings: {
      Mathematics:    'Assalamu Alaikum! Aaj Maths mein kya seekhna chahte ho?',
      English:        'Assalamu Alaikum! Aaj English mein kya poochna chahte ho?',
      Science:        'Assalamu Alaikum! Aaj Science ka koi sawaal hai?',
      Islamiyat:      'Assalamu Alaikum! Aaj Islamiyat mein kya samajhna hai?',
      'Social Studies': 'Assalamu Alaikum! Aaj Social Studies ka koi sawaal?',
      Urdu:           'السلام علیکم! آج اردو میں کیا سیکھنا ہے؟',
    },
    chatHistory: null,
  };
  await set(sessionRef(roomCode), initial);
}

export async function roomExists(roomCode: string): Promise<boolean> {
  const snap = await get(sessionRef(roomCode));
  return snap.exists();
}

export async function resetSession(roomCode: string): Promise<void> {
  // Preserve room but clear all runtime state
  await update(sessionRef(roomCode), {
    status: 'idle',
    subject: null,
    studentMessage: { text: '', type: 'text', photoURL: null, voiceTranscript: null, timestamp: 0 },
    aiResponse: { text: '', attachWorkbook: false, workbookQuestion: '', timestamp: 0 },
    workbookState: { active: false, submitted: false },
    showThinking: false,
    showEndModal: false,
    chatHistory: null,
  });
}

// ── Student writes ────────────────────────────────────────────────────

export async function setSubject(roomCode: string, subject: string): Promise<void> {
  await update(sessionRef(roomCode), { subject, status: 'idle' });
}

export async function sendStudentMessage(
  roomCode: string,
  payload: { text: string; type: 'text' | 'voice' | 'photo'; photoURL?: string; voiceTranscript?: string }
): Promise<void> {
  const timestamp = Date.now();
  const historyRef = ref(db, `sessions/${roomCode}/chatHistory`);
  // Push to history
  await push(historyRef, {
    role: 'student',
    text: payload.text,
    type: payload.type,
    photoURL: payload.photoURL ?? null,
    timestamp,
  });
  // Update current message + status
  await update(sessionRef(roomCode), {
    studentMessage: { ...payload, timestamp, photoURL: payload.photoURL ?? null, voiceTranscript: payload.voiceTranscript ?? null },
    status: 'student_sent',
    showThinking: true,
  });
}

export async function submitWorkbook(roomCode: string): Promise<void> {
  await update(sessionRef(roomCode), {
    workbookState: { active: true, submitted: true },
    status: 'workbook_submitted',
  });
}

export async function endSession(roomCode: string): Promise<void> {
  await update(sessionRef(roomCode), { status: 'session_end', showEndModal: false });
}

// ── Wizard writes ─────────────────────────────────────────────────────

export async function sendAiResponse(
  roomCode: string,
  response: AiResponse
): Promise<void> {
  const timestamp = Date.now();
  const historyRef = ref(db, `sessions/${roomCode}/chatHistory`);
  await push(historyRef, {
    role: 'ai',
    text: response.text,
    type: 'text',
    workbookQuestion: response.attachWorkbook ? response.workbookQuestion : null,
    timestamp,
  });
  await update(sessionRef(roomCode), {
    aiResponse: { ...response, timestamp },
    status: 'ai_responded',
    showThinking: false,
  });
}

export async function setThinking(roomCode: string, value: boolean): Promise<void> {
  await update(sessionRef(roomCode), { showThinking: value });
}

export async function setWorkbookActive(roomCode: string, active: boolean): Promise<void> {
  await update(sessionRef(roomCode), {
    workbookState: { active, submitted: false },
    status: active ? 'workbook_open' : 'ai_responded',
  });
}

export async function setLanguage(roomCode: string, language: 'en' | 'ur'): Promise<void> {
  await update(sessionRef(roomCode), { language });
}

export async function setShowEndModal(roomCode: string, show: boolean): Promise<void> {
  await update(sessionRef(roomCode), { showEndModal: show });
}

export async function saveGreetings(roomCode: string, greetings: Greetings): Promise<void> {
  await update(sessionRef(roomCode), { greetings });
}

// ── Real-time listener helper ─────────────────────────────────────────

export function subscribeToSession(
  roomCode: string,
  callback: (session: Session | null) => void
): () => void {
  const r = sessionRef(roomCode);
  onValue(r, (snap) => callback(snap.val() as Session | null));
  return () => off(r);   // Returns unsubscribe function for useEffect cleanup
}
```

### `storage.ts`

```typescript
import { storage } from './config';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

export async function uploadPhoto(
  roomCode: string,
  file: File,
  onProgress?: (pct: number) => void
): Promise<string> {
  // Compress to ~1MB before upload
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
      const canvas = document.createElement('canvas');
      // Scale down if larger than 1200px on longest side
      const MAX = 1200;
      const scale = Math.min(1, MAX / Math.max(img.width, img.height));
      canvas.width  = img.width  * scale;
      canvas.height = img.height * scale;
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => resolve(blob!), 'image/jpeg', quality);
      URL.revokeObjectURL(url);
    };
    img.src = url;
  });
}
```

---

## 6. Custom Hooks (`src/hooks/`)

### `useSession.ts`

Subscribes to a session and returns live data. Used by both student and wizard surfaces.

```typescript
import { useEffect, useState } from 'react';
import { subscribeToSession } from '../firebase/session';
import type { Session } from '../types/session';

export function useSession(roomCode: string | null) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!roomCode) return;
    setLoading(true);
    const unsubscribe = subscribeToSession(roomCode, (data) => {
      setSession(data);
      setLoading(false);
    });
    return unsubscribe;  // Cleanup on unmount or roomCode change
  }, [roomCode]);

  return { session, loading };
}
```

### `useCanvas.ts`

Encapsulates all Apple Pencil drawing logic. Returns a `ref` to attach to a `<canvas>` element.

```typescript
import { useRef, useEffect } from 'react';

export function useCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Retina correction
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
      if (e.pointerType !== 'pen') return;
      drawing = true;
      const { x, y } = getPos(e);
      ctx.beginPath();
      ctx.moveTo(x, y);
    }

    function onMove(e: PointerEvent) {
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

    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup',   onUp);
    canvas.addEventListener('pointerleave', onUp);

    return () => {
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup',   onUp);
      canvas.removeEventListener('pointerleave', onUp);
    };
  }, []);

  function clearCanvas() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.getContext('2d')!.clearRect(
      0, 0,
      canvas.width / dpr,
      canvas.height / dpr
    );
  }

  return { canvasRef, clearCanvas };
}
```

### `useSpeechRecognition.ts`

```typescript
import { useRef, useState, useCallback } from 'react';

type SpeechState = 'idle' | 'listening' | 'done' | 'error';

export function useSpeechRecognition() {
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const [state, setState]           = useState<SpeechState>('idle');
  const [transcript, setTranscript] = useState('');
  const [interim, setInterim]       = useState('');

  const supported = typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  const start = useCallback(() => {
    if (!supported) return;
    const SR = (window.SpeechRecognition || (window as any).webkitSpeechRecognition) as typeof SpeechRecognition;
    const r = new SR();
    r.continuous      = false;
    r.interimResults  = true;
    r.lang            = '';         // Auto-detect (handles Urdu/English mix)

    r.onstart  = () => setState('listening');
    r.onresult = (e) => {
      let fin = '', int = '';
      for (const res of Array.from(e.results)) {
        if (res.isFinal) fin += res[0].transcript;
        else             int += res[0].transcript;
      }
      if (fin) { setTranscript(fin); setState('done'); }
      setInterim(int);
    };
    r.onerror = () => setState('error');
    r.onend   = () => { if (state === 'listening') setState('idle'); };

    recognitionRef.current = r;
    r.start();
    setState('listening');
  }, [supported]);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
    setState('idle');
  }, []);

  const reset = useCallback(() => {
    setTranscript('');
    setInterim('');
    setState('idle');
  }, []);

  return { supported, state, transcript, interim, start, stop, reset };
}
```

---

## 7. Language Context (`src/context/LanguageContext.tsx`)

```typescript
import React, { createContext, useContext, useState, useCallback } from 'react';
import { STRINGS } from '../translations';
import type { Language } from '../types/session';

interface LanguageContextValue {
  language: Language;
  t: (key: keyof typeof STRINGS['en']) => string;
  setLanguage: (lang: Language) => void;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLangState] = useState<Language>('en');

  const setLanguage = useCallback((lang: Language) => {
    setLangState(lang);
    document.documentElement.lang = lang;
    document.documentElement.dir  = lang === 'ur' ? 'rtl' : 'ltr';
  }, []);

  const t = useCallback(
    (key: keyof typeof STRINGS['en']) => STRINGS[language][key] ?? key,
    [language]
  );

  return (
    <LanguageContext.Provider value={{ language, t, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
}
```

---

## 8. Translations (`src/translations/index.ts`)

```typescript
export const STRINGS = {
  en: {
    login_heading:        'Welcome back!',
    login_sub:            'Log in to continue learning',
    login_cta:            'Log In',
    login_student_id:     'Student ID',
    login_password:       'Password',
    subject_heading:      'What do you want to learn today?',
    mode_heading:         'How do you want to ask?',
    mode_voice:           'Voice',
    mode_type:            'Type',
    mode_camera:          'Camera',
    chat_placeholder:     'Type your question...',
    workbook_placeholder: 'Write your working here',
    workbook_clear:       'Clear',
    workbook_submit:      'Submit',
    workbook_try:         'Try it yourself →',
    thinking:             'Thinking...',
    end_text:             'Are you sure you want to log out from this device?',
    end_yes:              'Yes',
    end_no:               'No, Log out',
    listening:            'Listening...',
    voice_error:          'Could not hear clearly, try again',
    sending:              'Sending...',
  },
  ur: {
    login_heading:        'خوش آمدید!',
    login_sub:            'سیکھنا جاری رکھنے کے لیے لاگ ان کریں',
    login_cta:            'لاگ ان',
    login_student_id:     'اسٹوڈنٹ آئی ڈی',
    login_password:       'پاس ورڈ',
    subject_heading:      'آج کیا سیکھنا ہے؟',
    mode_heading:         'کیسے پوچھنا چاہتے ہو؟',
    mode_voice:           'آواز سے',
    mode_type:            'لکھ کر',
    mode_camera:          'فوٹو سے',
    chat_placeholder:     'اپنا سوال لکھیں...',
    workbook_placeholder: 'یہاں اپنا کام لکھیں',
    workbook_clear:       'صاف کریں',
    workbook_submit:      'جمع کریں',
    workbook_try:         '← خود کوشش کریں',
    thinking:             'سوچ رہا ہوں...',
    end_text:             'کیا آپ واقعی اس ڈیوائس سے لاگ آؤٹ کرنا چاہتے ہیں؟',
    end_yes:              'ہاں',
    end_no:               'نہیں، لاگ آؤٹ',
    listening:            'سن رہا ہوں...',
    voice_error:          'آواز واضح نہیں، دوبارہ کوشش کریں',
    sending:              'بھیج رہا ہوں...',
  },
} as const;

export type StringKey = keyof typeof STRINGS['en'];
```

---

## 9. Design Tokens (`src/styles/global.css`)

```css
@import url('https://fonts.googleapis.com/css2?family=Fredoka:wght@500&family=Dongle:wght@400&family=Noto+Nastaliq+Urdu&display=swap');

:root {
  /* Colours */
  --color-primary:        #2ABAF2;
  --color-bg-1:           #FFFBF7;
  --color-bg-chat:        #FFFAF4;
  --color-bg-2:           #FFFFFF;
  --color-user-bubble:    #F5F5F5;
  --color-ai-bubble:      #E8F7FD;
  --color-feedback-green: #2AF28B;
  --color-feedback-red:   #F45858;
  --color-text-primary:   #1A1A1A;
  --color-text-muted:     #444444;
  --color-text-muted-2:   #A1A1A1;
  --color-border:         #D1E8DC;

  /* Typography */
  --font-heading: 'Fredoka', sans-serif;
  --font-body:    'Dongle', sans-serif;

  --text-h1:       45px;
  --text-h2:       36px;
  --text-h3:       32px;
  --text-h4:       24px;
  --text-body-lg:  22px;
  --text-body:     16px;
  --text-body-sm:  14px;
  --text-caption:  12px;

  /* Spacing (8pt grid) */
  --space-1: 8px;
  --space-2: 16px;
  --space-3: 24px;
  --space-4: 32px;
  --space-6: 48px;
  --space-8: 64px;

  /* Border radius */
  --radius-pill:   999px;
  --radius-card:   16px;
  --radius-modal:  20px;
  --radius-input:  12px;
}

/* Base reset */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

html, body, #root {
  height: 100%;
  background: var(--color-bg-1);
  font-family: var(--font-body);
  color: var(--color-text-primary);
  -webkit-tap-highlight-color: transparent;
}

/* Urdu overrides */
html[lang="ur"] {
  font-family: 'Noto Nastaliq Urdu', var(--font-body);
}

/* iPad: disable scroll bounce and prevent zoom */
html {
  overflow: hidden;
  position: fixed;
  width: 100%;
}
```

---

## 10. App Router (`src/App.tsx`)

```typescript
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { LanguageProvider } from './context/LanguageContext';
import EntryPage       from './surfaces/entry/EntryPage';
import StudentApp      from './surfaces/student/StudentApp';
import WizardApp       from './surfaces/wizard/WizardApp';
import TeacherApp      from './surfaces/teacher/TeacherApp';
import './styles/global.css';

export default function App() {
  return (
    <LanguageProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/"        element={<EntryPage />} />
          <Route path="/student" element={<StudentApp />} />
          <Route path="/wizard"  element={<WizardApp />} />
          <Route path="/teacher" element={<TeacherApp />} />
        </Routes>
      </BrowserRouter>
    </LanguageProvider>
  );
}
```

---

## 11. Surface: Entry (`src/surfaces/entry/`)

### `EntryPage.tsx` — Behaviour

- Renders a numeric PIN pad (0–9 + backspace + confirm) plus a 4-digit display
- On confirm: calls `roomExists(code)` from `session.ts`
  - If exists: `navigate('/student?room=' + code)`
  - If not: show inline error "Room not found. Check the code."
- Room code stored in `sessionStorage` (`sessionStorage.setItem('roomCode', code)`) so it survives navigation without polluting URL permanently

---

## 12. Surface: Student (`src/surfaces/student/`)

### `StudentApp.tsx` — Screen State Machine

Manages which screen is shown using local React state. Does NOT use React Router for sub-screens — screen transitions are state changes, not URL changes (important for kiosk mode; back button should not navigate).

```typescript
type Screen = 'login' | 'subjects' | 'inputMode' | 'chat' | 'workbook';
```

- Reads `roomCode` from `sessionStorage`
- Subscribes to session via `useSession(roomCode)`
- Listens to `session.workbookState.active` — if it becomes `true`, switches to `'workbook'` screen regardless of current screen
- Listens to `session.showEndModal` — renders `<EndSessionModal />` as overlay when `true`
- Listens to `session.language` — calls `setLanguage()` from context to sync language remotely

### `LoginScreen.tsx` — Behaviour

- Controlled inputs for Student ID + Password
- Language toggle button calls `setLanguage()` and writes to Firebase
- Submit: any non-empty values → `setScreen('subjects')`

### `SubjectScreen.tsx` — Behaviour

- Renders 6 `<SubjectCard />` components in a 2-col CSS grid
- On card tap: calls `setSubject(roomCode, subject)` → `setScreen('inputMode')`

### `SubjectCard.tsx` — Props

```typescript
interface SubjectCardProps {
  subject: Subject;
  color: string;       // CSS custom property or hex
  icon: string;        // path to SVG in /public/icons/
  onClick: () => void;
}
```

Subject colour map:
```typescript
const SUBJECT_COLORS: Record<Subject, string> = {
  Mathematics:    '#FFCDD2',   // Coral
  English:        '#B3E5FC',   // Sky blue
  Science:        '#C8E6C9',   // Green
  Islamiyat:      '#B2EBF2',   // Teal
  'Social Studies':'#E1BEE7',  // Purple
  Urdu:           '#FFE0B2',   // Orange
};
```

### `InputModeScreen.tsx` — Behaviour

- Three mode buttons
- Tap stores mode in local state in `StudentApp` and calls `setScreen('chat')`
- Initial mode passed down as prop to `ChatScreen`

### `ChatScreen.tsx` — Behaviour

**On mount:**
- If `chatHistory` is empty, auto-sends greeting from `session.greetings[subject]` by calling `sendStudentMessage` with `role: 'ai'` equivalent — actually: greeting is appended via a direct Firebase push with `role: 'ai'` (a special `sendGreeting` function in `session.ts`)
- Scroll chat area to bottom on every new message

**Rendering chat history:**
- Convert `session.chatHistory` (Record) → array via `Object.values()`, sort by `timestamp`
- Map to `<ChatBubble role={msg.role} text={msg.text} type={msg.type} photoURL={msg.photoURL} />`

**Thinking dots:**
- Render `<ThinkingDots />` when `session.showThinking === true`
- Always render at bottom of chat list, before the scroll anchor

**Workbook question card:**
- Appears below an AI bubble when `msg.workbookQuestion` is present
- `<WorkbookQuestionCard question={msg.workbookQuestion} onTry={() => setWorkbookActive(roomCode, true)} />`

**Input bar modes:**
- Text: controlled `<textarea>`, Enter (without shift) = send, send button = send
- Voice: delegates to `useSpeechRecognition` hook
- Camera: hidden `<input type="file" accept="image/*" capture="environment">`, calls `uploadPhoto` from `storage.ts` then `sendStudentMessage`

### `ChatBubble.tsx` — Props

```typescript
interface ChatBubbleProps {
  role: MessageRole;
  text: string;
  type: MessageType;
  photoURL?: string;
  workbookQuestion?: string;
  onTryWorkbook?: () => void;
}
```

CSS Module handles alignment: `.bubble[data-role="student"]` → right-align + user bubble colour; `.bubble[data-role="ai"]` → left-align + ai bubble colour.

### `ThinkingDots.tsx`

Three `<span>` elements with CSS `@keyframes` pulse animation, staggered `animation-delay`. Wrapped in an AI bubble shell visually.

### `WorkbookScreen.tsx` — Behaviour

- Layout: two panels side by side (CSS Grid, `55fr 45fr` with a divider)
- Left: `<DrawingCanvas />` + question header + Clear + Submit buttons
- Right: scrollable chat history + input bar (reuses `ChatScreen` chat panel)
- Submit button calls `submitWorkbook(roomCode)` + disables itself

### `DrawingCanvas.tsx`

Thin wrapper around `useCanvas` hook:
```typescript
const { canvasRef, clearCanvas } = useCanvas();
// Renders: <canvas ref={canvasRef} style={{ touchAction: 'none' }} />
// Exposes clearCanvas to parent via forwardRef or callback prop
```

### `EndSessionModal.tsx`

Rendered as a portal (`createPortal`) over the entire app. Shown when `session.showEndModal === true`. Yes → calls `endSession(roomCode)` + navigate to `/`. No → calls `setShowEndModal(roomCode, false)`.

---

## 13. Surface: Wizard (`src/surfaces/wizard/`)

### `WizardApp.tsx` — Key Guard + Layout

```typescript
// Route guard
const [params] = useSearchParams();
if (params.get('key') !== 'ctrl-alt-del') {
  return <div>Access denied.</div>;
}
```

Layout: CSS Grid, 3-column top row + full-width bottom panels.

### Local State in `WizardApp`

```typescript
const [roomCode, setRoomCode]         = useState<string | null>(null);
const [composeText, setComposeText]   = useState('');
const [attachWorkbook, setAttach]     = useState(false);
const [workbookQ, setWorkbookQ]       = useState('');
const [editGreetings, setGreetings]   = useState<Greetings | null>(null);
```

`useSession(roomCode)` subscribed when roomCode is set.

### `SessionInfo.tsx` — Behaviour

- "Generate Room" button: calls `generateRoomCode()` → `createSession(code)` → `setRoomCode(code)`
- Displays room code large
- Shows `session.subject`, `session.status` (colour-coded badge), `session.language`

### `IncomingMessage.tsx` — Behaviour

- Displays `session.studentMessage`
- Text: large bold text
- Voice: text with 🎤 prefix
- Photo: renders `<img src={session.studentMessage.photoURL} />`
- Flashes (CSS animation) when `session.status === 'student_sent'`
- Timestamp shown below

### `SessionControls.tsx` — Behaviour

- **Reset Session:** calls `resetSession(roomCode)`
- **Show End Modal:** calls `setShowEndModal(roomCode, true)`
- **Toggle Workbook:** calls `setWorkbookActive(roomCode, !session.workbookState.active)`, button label toggles
- **Workbook Submitted Alert:** red banner rendered when `session.status === 'workbook_submitted'`
- **Language Toggle:** calls `setLanguage(roomCode, lang)`

### `QuickResponses.tsx` — Behaviour

Clicking a quick response button calls `setComposeText(text)` in parent — fills the textarea, does NOT send. Wizard edits and then hits Send.

Quick response definitions (hardcoded array of `{ label, text_en, text_ur }`). Displayed in current session language.

### `GreetingEditor.tsx` — Behaviour

- 6 controlled textareas, one per subject
- Pre-populated from `session.greetings` on first load
- "Save Greetings" button calls `saveGreetings(roomCode, editGreetings)`
- Shows "Saved ✓" toast for 2s on success

### `ComposePanel.tsx` — Behaviour

- Textarea: controlled, bound to `composeText` in parent
- `Ctrl+Enter` / `Cmd+Enter` keyboard shortcut triggers send
- "Show Thinking Dots" toggle: calls `setThinking(roomCode, true/false)`
- Attach Workbook checkbox: reveals "Practice Question" text input
- **Send button:**
  1. Calls `sendAiResponse(roomCode, { text: composeText, attachWorkbook, workbookQuestion: workbookQ, timestamp: 0 })`
  2. Clears `composeText`, resets `attachWorkbook`, resets `workbookQ`

---

## 14. Surface: Teacher (`src/surfaces/teacher/`)

No Firebase. All data hardcoded in each component. Internal navigation via local React state (same screen-machine pattern as student surface).

### Screen Flow

```
TeacherLoginScreen → TeacherDashboard → ClassPage → StudentProfilePage
                                      ↘ GuardrailsPage
```

### Hardcoded Data

Define in `src/surfaces/teacher/data.ts`:

```typescript
export const CLASSES = [
  { id: 'c1', name: 'Grade 4A – Science',     students: 28, active: 14, struggling: 2 },
  { id: 'c2', name: 'Grade 5B – Mathematics', students: 22, active: 10, struggling: 5 },
  { id: 'c3', name: 'Grade 3A – English',     students: 18, active: 8,  struggling: 1 },
];

export const STUDENTS = [
  { id: 's1', classId: 'c1', name: 'Omar Raza',    initials: 'OR', status: 'struggling' },
  { id: 's2', classId: 'c1', name: 'Ayesha Khan',  initials: 'AK', status: 'on-track' },
  // ... 8-10 total
];

export const CHAT_LOGS = [
  { studentId: 's1', time: 'Today 3:42 pm', question: 'What is photosynthesis?', hints: 4, completed: false },
  // ...
];

export const TOPICS = [
  { studentId: 's1', topic: 'Photosynthesis', count: 11 },
  // ...
];
```

### `GuardrailsPage.tsx` — Pseudo-interactive Rules

All interactions are local React state only:
- Hint style chip selector: `useState<'direct' | 'step-by-step'>('direct')` — CSS class toggles on click
- Hints per session: `<input type="range" min={0} max={5}>` bound to local state
- Topic restrictions: `<textarea>` bound to local state
- File upload: `<input type="file">` — on change, push filename to local array state, render as chips
- "Test AI Agent" button: sets local `showTestModal = true`, renders modal overlay with "Saved" message
- Save button: sets `showToast = true` for 2s, then `false` — no data actually written

---

## 15. Firebase Security Rules

For the testing period only. Set in Firebase Console before test day.

**Realtime Database:**
```json
{
  "rules": {
    "sessions": {
      ".read": true,
      ".write": true
    }
  }
}
```

**Storage:**
```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /sessions/{allPaths=**} {
      allow read, write: if true;
    }
  }
}
```

---

## 16. Build Order (1–2 day deadline)

Strict priority. Each step is independently testable before moving on.

### Day 1

| # | Task | Est. |
|---|---|---|
| 1 | Vite scaffold, install deps, Firebase project setup, `.env.local`, `vercel.json` | 30 min |
| 2 | `src/types/session.ts` — all types | 20 min |
| 3 | `src/firebase/config.ts` + `session.ts` — all functions | 45 min |
| 4 | `global.css` — all design tokens | 20 min |
| 5 | `App.tsx` router setup | 15 min |
| 6 | `EntryPage` — PIN pad, room join | 45 min |
| 7 | `StudentApp` screen state machine (shell only, no screens yet) | 20 min |
| 8 | `LoginScreen` + `SubjectScreen` + `SubjectCard` | 60 min |
| 9 | `InputModeScreen` | 30 min |
| 10 | `ChatScreen` — text send/receive, bubbles, thinking dots, greeting auto-send | 90 min |
| 11 | `WizardApp` shell + key guard + `SessionInfo` (Generate Room) | 45 min |
| 12 | `IncomingMessage` + `ComposePanel` + `QuickResponses` | 60 min |

### Day 2

| # | Task | Est. |
|---|---|---|
| 13 | `SessionControls` — reset, end modal, workbook toggle | 30 min |
| 14 | `GreetingEditor` | 30 min |
| 15 | `useSpeechRecognition` + voice input in `ChatInputBar` | 45 min |
| 16 | `storage.ts` + camera input in `ChatInputBar` | 45 min |
| 17 | `useCanvas` + `DrawingCanvas` + `WorkbookScreen` | 60 min |
| 18 | `EndSessionModal` (portal, local + remote trigger) | 30 min |
| 19 | `WorkbookQuestionCard` — wizard attaches question to message | 20 min |
| 20 | Teacher surface — all screens (static) | 60 min |
| 21 | Language system — `LanguageContext`, `translations`, RTL | 45 min |
| 22 | Visual polish — spacing, font sizes, colours matching Figma | 60 min |
| 23 | Test on real iPad + hotspot. Fix anything that breaks. | 60 min |
| 24 | Deploy to Vercel, set env vars, final smoke test | 20 min |

---

## 17. Key Decisions Log

| Decision | Rationale |
|---|---|
| Single Vite app, 4 routes | Shared types, one deployment, Guided Access handles protection |
| `?key=` guard on `/wizard` | Light friction; no real auth needed for a controlled test session |
| Surface-based folder structure | Student/wizard/teacher share almost no UI components; surfaces are more self-contained than features |
| Screen state machine in `StudentApp` (not React Router) | Prevents back-button navigation in kiosk mode |
| Firebase v9 modular | Tree-shakeable, official recommendation, no `compat` overhead |
| All Firebase writes in `session.ts` | Single source of truth; components never import `ref`/`update` directly |
| `chatHistory` as Firebase pushed list | Append-only, no race conditions on concurrent writes |
| CSS Modules | Scoped styles, explicit token usage via `var()`, no Tailwind config overhead |
| Canvas pen-only filter | Palm rejection for Apple Pencil; fingers produce nothing on canvas |
| Teacher side fully static | Navigation + configuration tasks need no live data; hardcoded data is faster to build and more predictable |
| Greeting auto-sent on chat mount | Removes wizard cognitive load at session start; identical every time |
| Thinking dots auto-triggered on `student_sent` | One less manual wizard step; can always be overridden by toggling off |
| `sessionStorage` for room code | Survives React Router navigation without polluting URL |
