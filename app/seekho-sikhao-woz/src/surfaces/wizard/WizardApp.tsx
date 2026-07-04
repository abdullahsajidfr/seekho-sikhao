import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useSession } from '../../hooks/useSession';
import {
  generateRoomCode, createSession, sendAiResponse, setThinking,
  setLanguage, resetSession, saveGreetings,
} from '../../firebase/session';
import SessionInfo     from './components/SessionInfo';
import IncomingMessage from './components/IncomingMessage';
import SessionControls from './components/SessionControls';
import QuickResponses  from './components/QuickResponses';
import GreetingEditor  from './components/GreetingEditor';
import ComposePanel    from './components/ComposePanel';
import styles from './WizardApp.module.css';
import type { AiResponse, Greetings } from '../../types/session';

function parseWizardMessage(raw: string): { displayText: string; readAloudText?: string } {
  const displayMatch = raw.match(/display text:\s*([\s\S]*?)(?=read aloud text:|$)/i);
  const readAloudMatch = raw.match(/read aloud text:\s*([\s\S]*)$/i);
  if (displayMatch && readAloudMatch) {
    return {
      displayText: displayMatch[1].trim(),
      readAloudText: readAloudMatch[1].trim() || undefined,
    };
  }
  return { displayText: raw.trim() };
}

export default function WizardApp() {
  const [params] = useSearchParams();
  if (params.get('key') !== 'ctrl-alt-del') {
    return <div style={{ padding: 32, fontFamily: 'monospace' }}>Access denied.</div>;
  }

  const [roomCode,    setRoomCode]    = useState<string | null>(null);
  const [composeText, setComposeText] = useState('');
  const [attachWorkbook, setAttach]   = useState(false);
  const [workbookQ,   setWorkbookQ]   = useState('');
  const [editGreetings, setEditGreetings] = useState<Greetings | null>(null);

  const { session } = useSession(roomCode);

  async function handleGenerate() {
    const code = await generateRoomCode();
    await createSession(code);
    setRoomCode(code);
  }

  async function handleSend() {
    if (!roomCode || !composeText.trim()) return;
    const { displayText, readAloudText } = parseWizardMessage(composeText);
    const response: AiResponse = {
      text: displayText,
      readAloudText,
      attachWorkbook,
      workbookQuestion: workbookQ,
      timestamp: 0,
    };
    await sendAiResponse(roomCode, response);
    setComposeText('');
    setAttach(false);
    setWorkbookQ('');
  }

  async function handleSaveGreetings() {
    if (!roomCode || !editGreetings) return;
    await saveGreetings(roomCode, editGreetings);
  }

  return (
    <div className={styles.layout}>
      <div className={styles.topRow}>
        <SessionInfo
          roomCode={roomCode}
          session={session}
          onGenerate={handleGenerate}
        />
        <IncomingMessage session={session} />
        <SessionControls
          roomCode={roomCode}
          session={session}
          onReset={() => roomCode && resetSession(roomCode)}
          onToggleLanguage={() => {
            if (!roomCode || !session) return;
            setLanguage(roomCode, session.language === 'en' ? 'ur' : 'en');
          }}
        />
      </div>
      <div className={styles.bottomRow}>
        <QuickResponses
          language={session?.language ?? 'en'}
          subject={session?.subject ?? null}
          onSelect={setComposeText}
        />
        <ComposePanel
          text={composeText}
          attachWorkbook={attachWorkbook}
          workbookQ={workbookQ}
          onTextChange={setComposeText}
          onAttachChange={setAttach}
          onWorkbookQChange={setWorkbookQ}
          onSend={handleSend}
          onToggleThinking={(val) => roomCode && setThinking(roomCode, val)}
          showThinking={session?.showThinking ?? false}
        />
        <GreetingEditor
          greetings={editGreetings ?? session?.greetings ?? null}
          onChange={setEditGreetings}
          onSave={handleSaveGreetings}
        />
      </div>
    </div>
  );
}
