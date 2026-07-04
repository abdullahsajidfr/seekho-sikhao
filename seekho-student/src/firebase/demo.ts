import type { Session } from '../types/session';

/**
 * Synthetic session used only when Firebase env vars are absent (local UI
 * preview without credentials). Lets every student screen render with
 * representative content so the surface can be reviewed offline. Never used
 * when `firebaseEnabled` is true.
 */
export function demoSession(): Session {
  const now = Date.now();
  return {
    status: 'ai_responded',
    language: 'en',
    subject: 'Mathematics',
    studentMessage: { text: '', type: 'text', photoURL: null, voiceTranscript: null, timestamp: 0 },
    aiResponse: { text: '', attachWorkbook: false, workbookQuestion: '', timestamp: 0 },
    workbookState: { active: false, submitted: false, hintRequested: false, canvasImageURL: null },
    showThinking: false,
    showEndModal: false,
    greetings: {
      Mathematics: 'Hello Aisha, what math concept would you like to learn today?',
      English: 'Hello Aisha, what would you like to read today?',
      Science: 'Hello Aisha, what science topic are you curious about?',
      Islamiyat: 'Assalamu Alaikum Aisha, what would you like to learn today?',
      'Social Studies': 'Hello Aisha, what would you like to explore today?',
      Urdu: 'السلام علیکم عائشہ! آج اردو میں کیا سیکھنا ہے؟',
    },
    chatHistory: {
      m1: {
        id: 'm1', role: 'ai', type: 'text',
        text: 'Hello Aisha, what math concept would you like to learn today?',
        timestamp: now - 60000,
      },
      m2: {
        id: 'm2', role: 'student', type: 'text',
        text: 'Mujhay multiplication nahi samajh aa rahi, question solve karna hai',
        timestamp: now - 50000,
      },
      m3: {
        id: 'm3', role: 'ai', type: 'text',
        text: 'Theek hai! Aaj ka topic multiplication hai.\nIt is a fast way of adding the same number many times. Misaal ke taur pe: 3×4 means three groups of four. Imagine 3 plates, each with 4 apples: 4+4+4=12. So, 3×4=12!\nAb aap ki bari: What is 6×7?',
        workbookQuestion: 'Work out: 6 x 7 = ?',
        timestamp: now - 40000,
      },
    },
    pastChats: {
      p1: {
        id: 'p1', firstQuestion: 'What are multiplication tables?',
        startedAt: now - 86400000, endedAt: now - 86400000, messages: {},
      },
      p2: {
        id: 'p2', firstQuestion: 'How do I add fractions?',
        startedAt: now - 172800000, endedAt: now - 172800000, messages: {},
      },
      p3: {
        id: 'p3', firstQuestion: 'What is an even number?',
        startedAt: now - 604800000, endedAt: now - 604800000, messages: {},
      },
    },
    adminControl: {
      sessionStartTime: now,
      activeTask: null,
      activeTaskStartTime: null,
      sessionPhase: 'running',
      smileyometerQuestion: null,
      studentName: 'Aisha',
      grade: 'Grade 4',
    },
  };
}
