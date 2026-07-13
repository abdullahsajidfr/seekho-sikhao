# Seekho Sikhao — WoZ web app

React + TypeScript + Vite app (deployed on Vercel) that pairs with the Seekho
Sikhao iPad student app over a shared Firebase Realtime Database. Serverless
functions live in `api/`.

## AI Tutor (auto mode)

`api/tutor.ts` is a server-side AI tutor that replaces the human "wizard". It
generates the scaffolded tutor replies automatically, so no human has to type
them from the dashboard.

### Endpoint contract

- `POST /api/tutor` with JSON body `{ "roomCode": "1234" }`.
- Returns `200 { "ok": true, "trigger": "chat" | "workbook" | "hint", "provider": "gemini" }`
  on success, `200 { "ok": true, "skipped": "..." }` when there is nothing to
  respond to, or a `4xx` / `5xx` `{ "ok": false, "error": "..." }`.

### How it's triggered

The client POSTs `/api/tutor` with the room code **after each student action**
(sending a chat message, submitting a workbook answer, or asking for a hint).
The function reads `sessions/{roomCode}` from RTDB and decides what to do:

| Signal | Trigger | Behaviour |
| --- | --- | --- |
| `workbookState.hintRequested === true` | **hint** | One small hint only (yellow bubble, `isHint: true`). Checked first — a hint request doesn't change `status`. |
| `status === 'workbook_submitted'` | **workbook** | Reads the child's handwriting from `workbookState.canvasImageURL` (vision), echoes their answer as a `workbook_answer` bubble with `workbookCorrect`, marks the reply `isCorrect` (green bubble) when right, and scaffolds the next step. |
| `status === 'student_sent'` | **chat** | Normal scaffolding reply. Attaches the latest homework photo (vision) when the student's last message is a `type: 'photo'`. |

The reply is written back over the RTDB REST API: the AI bubble is `POST`ed to
`sessions/{roomCode}/chatHistory`, then `sessions/{roomCode}` is `PATCH`ed with
`status: 'ai_responded'`, `showThinking: false`, `aiResponse`, and
`sessions/{roomCode}/workbookState` is patched to clear `hintRequested` (and, on
a submit, `submitted` / `canvasImageURL`).

### Vision

When a trigger involves an image (last student `photo` message's `photoURL`, or
the workbook `canvasImageURL`), the function fetches that URL, base64-encodes it,
and passes it to the model as an image part (Gemini `inline_data` /
OpenAI `image_url` with a `data:` URL) so the tutor can see the homework. `data:`
URLs are handled without a network fetch.

### Model

Uses Google **Gemini** (`gemini-2.5-flash`) via `generateContent`, with
structured JSON output enforced by `responseSchema`; falls back to
`gemini-2.0-flash` on a 404. No SDKs — plain `fetch`.

### Environment variables

Set these in Vercel (and `.env.local` for local dev — see `.env.local.example`):

| Var | Purpose |
| --- | --- |
| `FIREBASE_DATABASE_URL` | RTDB base URL for the function (falls back to `VITE_FIREBASE_DATABASE_URL`). RTDB rules are open, so no auth token is used. |
| `GEMINI_API_KEY` | Required. Gemini API key from [Google AI Studio](https://aistudio.google.com/apikey). |

If `GEMINI_API_KEY` is missing the function returns `500` with a clear message;
it never crashes silently.

### Test locally

```bash
# 1. Copy env and fill in Firebase + provider keys
cp .env.local.example .env.local

# 2. Run the app + serverless functions together
vercel dev            # serves /api/tutor and the Vite app

# 3. Drive a session from the student app (or the wizard) so a room exists,
#    then trigger a reply:
curl -X POST http://localhost:3000/api/tutor \
  -H 'Content-Type: application/json' \
  -d '{"roomCode":"1234"}'
```

`vercel dev` runs the `api/` functions with the same runtime as production. The
Vite dev server (`npm run dev`) alone does **not** serve `api/`, so use
`vercel dev` when exercising the tutor endpoint.

---

## React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
