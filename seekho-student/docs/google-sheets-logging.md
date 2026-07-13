# Per-user Google Sheets logging

Every event the app records (`logEvent`) is mirrored to a Google Sheet, with
**one worksheet (tab) per user** inside a single spreadsheet — in addition to the
Firebase `eventLog` that powers the live `/admin` dashboard.

## How it works

`src/firebase/admin.ts` → `logToSheet()` does a fire-and-forget `POST` to a
Google Apps Script **Web App** whenever `EXPO_PUBLIC_SHEETS_ENDPOINT` is set.
The Apps Script picks (or creates) a tab named after the user and appends a row.
The "user" key is the student's name if present, otherwise the room code.

## One-time setup

1. Create a new Google Sheet — this becomes your log workbook (all users' tabs live here).
2. **Extensions → Apps Script**. Delete the stub and paste the script below. **Save**.
3. **Deploy → New deployment → Web app**
   - *Execute as:* **Me**
   - *Who has access:* **Anyone**
4. Authorize when prompted, then copy the **Web app URL** (ends in `/exec`).
5. In `seekho-student/.env` set:
   ```
   EXPO_PUBLIC_SHEETS_ENDPOINT=https://script.google.com/macros/s/AKfyc.../exec
   ```
6. Restart Metro (`npx expo start --clear`) and reload the app.

After that, each student session writes to its own tab; every tap, message,
screen change, hint, submit, and Smileyometer answer becomes a timestamped row.

## The Apps Script

```javascript
/**
 * Seekho Sikhao — per-user event logging into ONE Google Sheet.
 * Each user gets their own worksheet (tab). Deploy as a Web App.
 */
const HEADERS = [
  'timestamp', 'relativeMs', 'type', 'source', 'kind',
  'label', 'route', 'target', 'taskPhase', 'roomCode',
  'studentName', 'grade', 'x', 'y',
];

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const tabName = sanitize(String(data.user || data.roomCode || 'unknown'));
    let sheet = ss.getSheetByName(tabName);
    if (!sheet) {
      sheet = ss.insertSheet(tabName);
      sheet.appendRow(HEADERS);
      sheet.setFrozenRows(1);
    }
    sheet.appendRow(HEADERS.map(function (h) {
      return data[h] !== undefined ? data[h] : '';
    }));
    return json({ ok: true, tab: tabName });
  } catch (err) {
    return json({ ok: false, error: String(err) });
  }
}

// Sheet tab names: max 100 chars; cannot contain [ ] * / \ ? :
function sanitize(name) {
  var clean = name.replace(/[\[\]\*\/\\\?:]/g, ' ').trim().slice(0, 90);
  return clean || 'unknown';
}

function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// Optional: Run this once from the editor to confirm access + see a demo row.
function testAppend() {
  doPost({ postData: { contents: JSON.stringify({
    user: 'demo-user', roomCode: '1234', studentName: 'Demo', grade: '4',
    timestamp: new Date().toISOString(), relativeMs: 0, type: 'auto',
    source: 'student_app', kind: 'tap', label: 'test:event',
    route: 'chat', target: 'send',
  }) } });
}
```

## Notes

- **Both sinks run**: Firebase `eventLog` (live `/admin` view) *and* the Sheet.
  If you want *only* the Sheet, remove the `push(ref(db, path), entry)` line in
  `admin.ts`.
- The Web App must be redeployed (**Deploy → Manage deployments → Edit → new
  version**) whenever you change the script.
- For a physical iPad the endpoint is a public Google URL, so it works anywhere
  (unlike the local AI/TTS server on `localhost`).
