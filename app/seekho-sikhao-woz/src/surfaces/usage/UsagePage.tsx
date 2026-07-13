import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ref, onValue, off } from 'firebase/database';
import { db, firebaseEnabled } from '../../firebase/config';
import styles from './UsagePage.module.css';

/**
 * Live API-usage dashboard (researcher-facing).
 *
 * Serverless handlers under `api/` write one raw record per call to RTDB at
 * `telemetry/usage/{YYYY-MM-DD}/{autoId}`. This page subscribes to a single
 * day's bucket and derives per-API health, per-model token/char/audio totals,
 * vendor credit estimates, and a live recent-calls feed. It never writes.
 */

type ApiKind = 'tutor' | 'stt' | 'tts';

interface UsageRecord {
  ts: number;
  api: ApiKind;
  model: string;
  ok: boolean;
  ms: number;
  tokensIn?: number;
  tokensOut?: number;
  chars?: number;
  audioSecs?: number;
  roomCode?: string;
}

const API_ORDER: ApiKind[] = ['tutor', 'stt', 'tts'];

const API_META: Record<ApiKind, { label: string; color: string; vendor: string }> = {
  tutor: { label: 'Tutor', color: '#2ABAF2', vendor: 'Gemini' },
  stt: { label: 'Speech-to-Text', color: '#b46cf0', vendor: 'Gemini' },
  tts: { label: 'Text-to-Speech', color: '#f2821a', vendor: 'UpliftAI' },
};

// ── Formatting helpers ─────────────────────────────────────────────────
const pad2 = (n: number) => String(n).padStart(2, '0');

function todayLocalStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function fmtTime(ts: number): string {
  const d = new Date(ts);
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
}

const num = (n: number) => n.toLocaleString();
// Compact dash for zero keeps the dense tables readable.
const numOrDash = (n: number) => (n ? n.toLocaleString() : '—');

function errRateColor(rate: number, calls: number): string {
  if (!calls) return '#8888aa';
  if (rate === 0) return '#2AF28B';
  if (rate < 10) return '#f2b01a';
  return '#F45858';
}

export default function UsagePage() {
  const [params] = useSearchParams();
  const authorized = params.get('key') === 'ctrl-alt-del';

  // `today` tracks the real local date and advances at midnight (60s poll).
  // `day` is the bucket currently being viewed; it follows `today` while the
  // researcher is watching live, but stays put once a past date is picked.
  const [today, setToday] = useState(todayLocalStr);
  const [day, setDay] = useState(today);
  const [records, setRecords] = useState<UsageRecord[]>([]);

  // Keep refs current so the interval closure can compare without re-arming.
  const dayRef = useRef(day);
  dayRef.current = day;
  const todayRef = useRef(today);
  todayRef.current = today;

  useEffect(() => {
    const id = setInterval(() => {
      const t = todayLocalStr();
      if (t !== todayRef.current) {
        // Midnight rollover: advance the live view only if it was on "today".
        if (dayRef.current === todayRef.current) setDay(t);
        setToday(t);
      }
    }, 60_000);
    return () => clearInterval(id);
  }, []);

  // Live subscription to the selected day's usage bucket.
  useEffect(() => {
    if (!authorized || !firebaseEnabled) {
      setRecords([]);
      return;
    }
    const r = ref(db, `telemetry/usage/${day}`);
    onValue(r, (snap) => {
      const val = snap.val() as Record<string, UsageRecord> | null;
      const arr = val ? Object.values(val) : [];
      arr.sort((a, b) => (b.ts ?? 0) - (a.ts ?? 0));
      setRecords(arr);
    });
    return () => off(r);
  }, [authorized, day]);

  const apiStats = useMemo(
    () =>
      API_ORDER.map((api) => {
        const rows = records.filter((r) => r.api === api);
        const calls = rows.length;
        const errors = rows.filter((r) => r.ok === false).length;
        const errorRate = calls ? (errors / calls) * 100 : 0;
        const avgMs = calls ? rows.reduce((s, r) => s + (r.ms || 0), 0) / calls : 0;
        return { api, calls, errors, errorRate, avgMs };
      }),
    [records],
  );

  const modelStats = useMemo(() => {
    const map = new Map<
      string,
      { model: string; calls: number; tokensIn: number; tokensOut: number; chars: number; audioSecs: number }
    >();
    for (const r of records) {
      const key = r.model || '(unknown)';
      const m =
        map.get(key) ?? { model: key, calls: 0, tokensIn: 0, tokensOut: 0, chars: 0, audioSecs: 0 };
      m.calls += 1;
      m.tokensIn += r.tokensIn || 0;
      m.tokensOut += r.tokensOut || 0;
      m.chars += r.chars || 0;
      m.audioSecs += r.audioSecs || 0;
      map.set(key, m);
    }
    return [...map.values()].sort((a, b) => b.calls - a.calls);
  }, [records]);

  const credits = useMemo(() => {
    let scribeCredits = 0;
    let ttsChars = 0;
    let geminiTokensIn = 0;
    let geminiTokensOut = 0;
    for (const r of records) {
      // Uplift Scribe bills per-call: ceil(seconds / 60 * 40) credits.
      if (typeof r.audioSecs === 'number' && r.audioSecs > 0) {
        scribeCredits += Math.ceil((r.audioSecs / 60) * 40);
      }
      ttsChars += r.chars || 0;
      geminiTokensIn += r.tokensIn || 0;
      geminiTokensOut += r.tokensOut || 0;
    }
    return { scribeCredits, ttsChars, geminiTokensIn, geminiTokensOut };
  }, [records]);

  const recent = useMemo(() => records.slice(0, 50), [records]);

  if (!authorized) {
    return <div style={{ padding: 32, fontFamily: 'monospace' }}>Access denied.</div>;
  }

  const isToday = day === today;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <span className={styles.headerTitle}>Seekho Sikhao Usage</span>
        <span className={styles.headerBadge}>USAGE</span>
        <div className={styles.headerRight}>
          <span className={`${styles.live} ${isToday ? styles.liveOn : styles.livePast}`}>
            <span className={styles.liveDot} />
            {isToday ? 'LIVE' : 'PAST'}
          </span>
          <span className={styles.recCount}>{num(records.length)} records</span>
          <input
            className={styles.dateInput}
            type="date"
            value={day}
            max={today}
            onChange={(e) => setDay(e.target.value || today)}
          />
        </div>
      </div>

      <div className={styles.body}>
        {/* (a) Per-API health tiles */}
        <section className={styles.tiles}>
          {apiStats.map(({ api, calls, errors, errorRate, avgMs }) => {
            const meta = API_META[api];
            return (
              <div key={api} className={styles.tile} style={{ borderTopColor: meta.color }}>
                <div className={styles.tileHead}>
                  <span className={styles.tileDot} style={{ background: meta.color }} />
                  <span className={styles.tileLabel}>{meta.label}</span>
                  <span className={styles.tileVendor}>{meta.vendor}</span>
                </div>
                <div className={styles.tileCalls}>
                  <span className={styles.tileCallsNum}>{num(calls)}</span>
                  <span className={styles.tileCallsUnit}>calls</span>
                </div>
                <div className={styles.tileStats}>
                  <div className={styles.tileStat}>
                    <span className={styles.tileStatVal}>{num(errors)}</span>
                    <span className={styles.tileStatKey}>errors</span>
                  </div>
                  <div className={styles.tileStat}>
                    <span
                      className={styles.tileStatVal}
                      style={{ color: errRateColor(errorRate, calls) }}
                    >
                      {errorRate.toFixed(1)}%
                    </span>
                    <span className={styles.tileStatKey}>err rate</span>
                  </div>
                  <div className={styles.tileStat}>
                    <span className={styles.tileStatVal}>{calls ? `${Math.round(avgMs)}` : '—'}</span>
                    <span className={styles.tileStatKey}>avg ms</span>
                  </div>
                </div>
              </div>
            );
          })}
        </section>

        {/* (b) Per-model breakdown */}
        <section className={styles.card}>
          <div className={styles.cardHead}>
            <p className={styles.cardTitle}>By Model</p>
            <span className={styles.counter}>{modelStats.length} models</span>
          </div>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.thLeft}>Model</th>
                  <th className={styles.thNum}>Calls</th>
                  <th className={styles.thNum}>Tokens In</th>
                  <th className={styles.thNum}>Tokens Out</th>
                  <th className={styles.thNum}>Chars</th>
                  <th className={styles.thNum}>Audio (s)</th>
                </tr>
              </thead>
              <tbody>
                {modelStats.length === 0 && (
                  <tr>
                    <td className={styles.emptyCell} colSpan={6}>
                      No usage recorded for {day}
                    </td>
                  </tr>
                )}
                {modelStats.map((m) => (
                  <tr key={m.model}>
                    <td className={styles.tdModel}>{m.model}</td>
                    <td className={styles.tdNum}>{num(m.calls)}</td>
                    <td className={styles.tdNum}>{numOrDash(m.tokensIn)}</td>
                    <td className={styles.tdNum}>{numOrDash(m.tokensOut)}</td>
                    <td className={styles.tdNum}>{numOrDash(m.chars)}</td>
                    <td className={styles.tdNum}>{m.audioSecs ? m.audioSecs.toFixed(1) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* (c) Credit estimates */}
        <section className={styles.card}>
          <div className={styles.cardHead}>
            <p className={styles.cardTitle}>Credit Estimates</p>
            <span className={styles.counter}>{day}</span>
          </div>
          <div className={styles.credits}>
            <div className={styles.credit}>
              <span className={styles.creditVal}>{num(credits.scribeCredits)}</span>
              <span className={styles.creditKey}>Uplift Scribe credits</span>
              <span className={styles.creditNote}>⌈audioSecs / 60 × 40⌉ per call</span>
            </div>
            <div className={styles.credit}>
              <span className={styles.creditVal}>{num(credits.ttsChars)}</span>
              <span className={styles.creditKey}>TTS characters (see Uplift pricing)</span>
              <span className={styles.creditNote}>Σ chars across TTS calls</span>
            </div>
            <div className={styles.credit}>
              <span className={styles.creditVal}>{num(credits.geminiTokensIn)}</span>
              <span className={styles.creditKey}>Gemini tokens in</span>
              <span className={styles.creditNote}>Σ tokensIn</span>
            </div>
            <div className={styles.credit}>
              <span className={styles.creditVal}>{num(credits.geminiTokensOut)}</span>
              <span className={styles.creditKey}>Gemini tokens out</span>
              <span className={styles.creditNote}>Σ tokensOut</span>
            </div>
          </div>
        </section>

        {/* (d) Recent-calls feed */}
        <section className={styles.card}>
          <div className={styles.cardHead}>
            <p className={styles.cardTitle}>Recent Calls</p>
            <span className={styles.counter}>last {recent.length}</span>
          </div>
          <div className={styles.feed}>
            <div className={`${styles.feedRow} ${styles.feedHeadRow}`}>
              <span className={styles.fTime}>Time</span>
              <span className={styles.fApi}>API</span>
              <span className={styles.fModel}>Model</span>
              <span className={styles.fStatus}>Status</span>
              <span className={styles.fMs}>ms</span>
              <span className={styles.fRoom}>Room</span>
            </div>
            {recent.length === 0 && <p className={styles.empty}>No calls yet</p>}
            {recent.map((r, i) => {
              const meta = API_META[r.api];
              return (
                <div key={`${r.ts}-${i}`} className={styles.feedRow}>
                  <span className={styles.fTime}>{fmtTime(r.ts)}</span>
                  <span className={styles.fApi}>
                    <span
                      className={styles.apiPill}
                      style={{ color: meta?.color ?? '#cccce0', borderColor: meta?.color ?? '#3a3a5a' }}
                    >
                      {r.api}
                    </span>
                  </span>
                  <span className={styles.fModel} title={r.model}>
                    {r.model || '—'}
                  </span>
                  <span className={styles.fStatus}>
                    <span className={r.ok === false ? styles.err : styles.ok}>
                      {r.ok === false ? 'err' : 'ok'}
                    </span>
                  </span>
                  <span className={styles.fMs}>{typeof r.ms === 'number' ? num(Math.round(r.ms)) : '—'}</span>
                  <span className={styles.fRoom}>{r.roomCode || '—'}</span>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
