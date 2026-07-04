import ChatBubble from '../components/ChatBubble';
import TopBar from '../components/TopBar';
import styles from './PastChatScreen.module.css';
import type { PastChat, Subject } from '../../../types/session';

interface Props {
  pastChat: PastChat;
  subject: Subject;
  onBack: () => void;
}

export default function PastChatScreen({ pastChat, subject, onBack }: Props) {
  const messages = Object.values(pastChat.messages).sort((a, b) => a.timestamp - b.timestamp);

  return (
    <div className={styles.page}>
      <TopBar title={subject} showBack onBack={onBack} />
      <div className={styles.messages}>
        {messages.map((msg, i) => (
          <ChatBubble
            key={msg.id ?? i}
            role={msg.role}
            text={msg.text}
            type={msg.type}
            photoURL={msg.photoURL}
            workbookCorrect={msg.workbookCorrect}
          />
        ))}
      </div>
    </div>
  );
}
