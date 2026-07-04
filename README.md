# Seekho Sikhao

An educational prototype for **Seekho Sikhao**, a child-facing learning experience built for HCI usability testing (Group 6 — *ctrl+alt+del*). The repo is a monorepo containing two surfaces that share the same Firebase backend:

| Directory | What it is | Stack |
|---|---|---|
| [`app/seekho-sikhao-woz`](app/seekho-sikhao-woz) | **Wizard-of-Oz web prototype** — student, wizard, teacher and admin surfaces in one SPA, plus a serverless TTS backend. | React 19 · TypeScript · Vite · CSS Modules · Firebase (RTDB + Storage) · Vercel Functions |
| [`seekho-student`](seekho-student) | **Student mobile app** — the child-facing native app, driven live by the wizard or runnable in offline demo mode. | Expo · React Native · TypeScript · Firebase |
| [`app/docs`](app/docs) & `app/*.md` | Design doc, WoZ spec and the Google Apps Script logging helper. | — |

Both apps boot with **no credentials** in a static demo mode, and go live when Firebase environment variables are supplied (same Firebase project drives both surfaces in real time).

---

## Web app — `app/seekho-sikhao-woz`

A single-page React app exposing four routes:

| Surface | URL | Description |
|---|---|---|
| Room Entry | `/` | Tester enters a room code before handing the device to a child |
| Student | `/student` | Child-facing app (Wizard-of-Oz enabled) |
| Wizard | `/wizard?key=ctrl-alt-del` | Operator control panel |
| Teacher | `/teacher` | Teacher-facing UI |

A serverless function at `api/tts.ts` proxies text-to-speech (Urdu / Roman-Urdu / English) via UpliftAI, transliterating Roman Urdu to Urdu script on the fly.

### Run

```bash
cd app/seekho-sikhao-woz
npm install
cp .env.local.example .env.local   # fill in Firebase values (optional — blank = demo mode)
npm run dev                        # http://localhost:5173
```

```bash
npm run build      # tsc -b && vite build
npm run preview    # serve the production build
```

**Environment** (`.env.local`, all optional — leave blank for demo mode):

```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_DATABASE_URL=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

The TTS backend additionally needs `UPLIFT_API_KEY` set as a Vercel environment variable (server-side only — never exposed to the client).

---

## Mobile app — `seekho-student`

The child-facing Expo app. With no Firebase env it renders a static demo session covering every screen; with Firebase env it becomes live and the wizard web surface drives the device in real time.

### Run

```bash
cd seekho-student
npm install
cp .env.example .env    # fill in EXPO_PUBLIC_FIREBASE_* values (optional — blank = demo mode)
npm start               # Expo dev server — press i / a / w for iOS / Android / web
```

**Environment** (`.env`, all optional): `EXPO_PUBLIC_FIREBASE_*` (see `.env.example`). Any variable prefixed `EXPO_PUBLIC_` is inlined into the client bundle.

---

## Analytics & event logging (metrics)

Both surfaces log to a shared pipeline (`src/firebase/admin.ts → logEvent`) that writes every event to **two sinks at once**:

- **Firebase Realtime Database** — per-session under `sessions/{roomCode}/eventLog` (events fired outside a session go to `telemetry/{surface}/eventLog`).
- **Google Sheets** — via a deployed Apps Script web app (`VITE_SHEETS_ENDPOINT` / `EXPO_PUBLIC_SHEETS_ENDPOINT`, see `app/docs/google-apps-script.js`), fanned into `Sessions`, `EventLog`, and `Smileyometer` tabs.

Each record carries: `label`, `absoluteTime`, `relativeMs` (ms since session start), `taskPhase`, `source` (which surface), `type` (`auto`/`manual`), and — for auto-captured interactions — `kind`, `route`, `target`, and `x`/`y`.

The **web app auto-captures every interaction** across all four surfaces via a global listener (`src/lib/autolog.ts`, mounted as `<AutoLogger/>`), with no per-component wiring:

| `kind` | Fires on | Example label |
|---|---|---|
| `nav` | route change | `nav:/student` |
| `click` | any click/tap | `click:Great job! button` |
| `input` | text field change/blur | `input:Teacher ID=teacher01` |
| `keydown` | Enter in a field | `submit:0000=5678` |
| `submit` | form submit | `submit:Log In form` |

Key interactive elements carry explicit `data-log` attributes (`<surface>:<action>`, e.g. `wizard:generate-room`, `student:subject-math`), which the logger prefers over derived text — so labels are stable and language-independent. In dev, every captured event also prints `console.debug('[autolog]', kind, label, target)`. Logging is fire-and-forget and no-ops entirely when Firebase env vars are absent (demo mode). Hand-placed semantic events (`screen:*`, `task:*`, `smileyometer:*`) still fire alongside the auto-capture.

The **Expo student app** mirrors the same schema and label vocabulary via `seekho-student/src/lib/autolog.ts`: navigation is captured by `NavigationContainer`'s `onStateChange`, and taps/inputs are logged from the shared interactive components (React Native has no DOM to delegate to).

### Firebase backend

The apps point at the **`seekho-sikhao`** Firebase project (Realtime Database in `us-central1`). RTDB security rules live in `app/seekho-sikhao-woz/database.rules.json` and deploy with:

```bash
cd app/seekho-sikhao-woz
npx firebase-tools deploy --only database   # requires `firebase login`
```

Firebase **Storage** (used only for student photo uploads, not for metrics) must be enabled once via the console — *Build → Storage → Get Started* — after which `storage.rules` deploys the same way (`--only storage`). Event logging and all session data work on RTDB alone without Storage.

## Security note

No secrets are committed. Both apps read all credentials from environment variables and ship with `.example` templates only. During the WoZ testing period the Firebase RTDB + Storage rules are intentionally open (no Firebase Auth is used); do not reuse that configuration in production.
