import styles from './ComposePanel.module.css';

interface Props {
  text: string;
  attachWorkbook: boolean;
  workbookQ: string;
  showThinking: boolean;
  onTextChange: (v: string) => void;
  onAttachChange: (v: boolean) => void;
  onWorkbookQChange: (v: string) => void;
  onSend: () => void;
  onToggleThinking: (v: boolean) => void;
}

export default function ComposePanel({
  text, attachWorkbook, workbookQ, showThinking,
  onTextChange, onAttachChange, onWorkbookQChange, onSend, onToggleThinking,
}: Props) {
  function handleKeyDown(e: React.KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      onSend();
    }
  }

  return (
    <div className={styles.panel}>
      <h2 className={styles.heading}>Compose Response</h2>
      <textarea
        className={styles.textarea}
        placeholder="Type AI response… (⌘+Enter to send)"
        value={text}
        onChange={(e) => onTextChange(e.target.value)}
        onKeyDown={handleKeyDown}
      />
      <div className={styles.options}>
        <label className={styles.checkLabel}>
          <input
            type="checkbox"
            checked={attachWorkbook}
            onChange={(e) => onAttachChange(e.target.checked)}
          />
          Attach workbook question
        </label>
        <label className={styles.checkLabel}>
          <input
            type="checkbox"
            checked={showThinking}
            onChange={(e) => onToggleThinking(e.target.checked)}
          />
          Show thinking dots
        </label>
      </div>
      {attachWorkbook && (
        <input
          className={styles.workbookInput}
          placeholder="Practice question…"
          value={workbookQ}
          onChange={(e) => onWorkbookQChange(e.target.value)}
        />
      )}
      <button className={styles.sendBtn} onClick={onSend} disabled={!text.trim()}>
        Send Response
      </button>
    </div>
  );
}
