import { useState } from 'react';
import type { Language, Subject } from '../../../types/session';
import styles from './QuickResponses.module.css';

type QR = { label: string; en: string; ur: string };

function fmt(q: QR) {
  return `display text: ${q.en}\nread aloud text: ${q.ur}`;
}

const GENERAL: QR[] = [
  {
    label: 'Great job!',
    en: 'Great job! You are on the right track.',
    ur: 'شاباش! آپ بالکل صحیح راستے پر ہیں۔',
  },
  {
    label: 'Think again',
    en: "Hmm, let's think about this again. What do you know about...?",
    ur: 'ہمم، دوبارہ سوچیں۔ آپ اس کے بارے میں کیا جانتے ہیں؟',
  },
  {
    label: 'Hint',
    en: "Here's a hint: try breaking the problem into smaller steps.",
    ur: 'یہ لیں اشارہ: مسئلے کو چھوٹے حصوں میں تقسیم کریں۔',
  },
  {
    label: 'Try workbook',
    en: 'Great! Now try solving a practice question in your workbook.',
    ur: 'شاباش! اب ورک بک میں ایک سوال حل کرنے کی کوشش کریں۔',
  },
  {
    label: 'Ask teacher',
    en: "That's a great question! Maybe ask your teacher tomorrow.",
    ur: 'یہ بہت اچھا سوال ہے! کل اپنے استاد سے پوچھیں۔',
  },
];

const MATH_RESPONSES: QR[] = [
  {
    label: "Don't understand bus question",
    en: "Let's start small. If 1 bus can take 24 students, what number operation can help us group 138 students into buses?",
    ur: 'چلو آسان سے شروع کرتے ہیں۔ اگر 1 bus میں 24 students آتے ہیں، تو 138 students کو buses میں بانٹنے کے لیے کون سا operation مدد کرے گا؟',
  },
  {
    label: 'How many buses needed?',
    en: 'Think of buses as groups of 24. Try counting 24, 48, 72… until you reach or pass 138.',
    ur: 'buses کو 24 کے groups سمجھو۔ 24، 48، 72… گنتے جاؤ جب تک 138 تک پہنچو یا اس سے آگے نکل جاؤ۔',
  },
  {
    label: 'Should I divide 138 by 24?',
    en: 'Yes, division can help. But first estimate: is 138 closer to 5 groups of 24 or 6 groups of 24?',
    ur: 'جی، division مدد کر سکتی ہے۔ پہلے اندازہ لگاؤ: 138، 24 کے 5 groups کے قریب ہے یا 6 groups کے؟',
  },
  {
    label: 'I got 5 buses — is that right?',
    en: 'Check it: 5 buses carry 5 groups of 24. Are all 138 students seated, or are some still left?',
    ur: 'اسے check کرو: 5 buses میں 24 کے 5 groups آئیں گے۔ کیا 138 students سب بیٹھ گئے یا کچھ باقی ہیں؟',
  },
  {
    label: 'Mujhe answer bata do',
    en: "Main final answer nahi bata sakta/sakti, but I can help. First find how many students fit in 5 buses.",
    ur: 'میں final answer نہیں بتا سکتا/سکتی، لیکن مدد کر سکتا/سکتی ہوں۔ پہلے نکالو کہ 5 buses میں کتنے students بیٹھتے ہیں۔',
  },
  {
    label: 'Empty seats kaise find karun?',
    en: 'First find the total seats in the buses you need. Then compare those seats with 138 students.',
    ur: 'پہلے جتنی buses چاہئیں ان میں total seats نکالو۔ پھر ان seats کو 138 students سے compare کرو۔',
  },
  {
    label: 'What does empty seats mean?',
    en: 'Empty seats means seats with no student sitting on them after everyone is seated.',
    ur: 'empty seats کا مطلب ہے وہ seats جن پر سب students کے بیٹھنے کے بعد کوئی student نہیں بیٹھا۔',
  },
  {
    label: 'Agar last bus full na ho tou?',
    en: 'That is okay. If even 1 student is left, you still need one more bus for them.',
    ur: 'کوئی بات نہیں۔ اگر صرف 1 student بھی باقی ہو، تو اس کے لیے بھی ایک اور bus چاہیے ہوگی۔',
  },
  {
    label: "I don't know what to write",
    en: 'Write your working in two parts: buses needed first, then empty seats. Start with groups of 24.',
    ur: 'اپنی working دو حصوں میں لکھو: پہلے buses needed، پھر empty seats۔ 24 کے groups سے شروع کرو۔',
  },
  {
    label: 'Kya 5.75 buses likhna hai?',
    en: 'Think carefully: can a school arrange 0.75 of a bus, or does it need a whole bus?',
    ur: 'غور سے سوچو: کیا school 0.75 bus arrange کر سکتا ہے، یا پوری bus چاہیے ہوگی؟',
  },
];

const SCIENCE_RESPONSES: QR[] = [
  {
    label: 'Plant in dark room?',
    en: "Let's think first: what important thing does a plant usually get from sunlight?",
    ur: 'پہلے سوچتے ہیں: plant کو sunlight سے عام طور پر کون سی اہم چیز ملتی ہے؟',
  },
  {
    label: "Don't understand science question",
    en: "Break it into two parts: what happens to the plant, and why darkness causes that.",
    ur: 'اسے دو حصوں میں توڑو: plant کے ساتھ کیا ہوگا، اور darkness سے ایسا کیوں ہوگا۔',
  },
  {
    label: 'Why does plant need light?',
    en: 'Plants use light to make their food. Do you remember the name of this process?',
    ur: 'plants روشنی استعمال کر کے اپنی food بناتے ہیں۔ کیا تمہیں اس process کا نام یاد ہے؟',
  },
  {
    label: 'Is it photosynthesis?',
    en: "Good thinking. Now explain in your own words: what can't the plant do properly without light?",
    ur: 'بہت اچھا سوچا۔ اب اپنے الفاظ میں بتاؤ: light کے بغیر plant کون سا کام ٹھیک سے نہیں کر سکتا؟',
  },
  {
    label: 'Plant mar jaye ga?',
    en: 'You may be on the right track. But explain slowly: first leaves change, then growth changes. What might happen first?',
    ur: 'تم صحیح سمت میں سوچ رہے ہو۔ مگر آہستہ explain کرو: پہلے leaves بدلتے ہیں، پھر growth بدلتی ہے۔ سب سے پہلے کیا ہو سکتا ہے؟',
  },
  {
    label: 'What should I write for "explain why"?',
    en: 'For "why," connect darkness to no light, no light to less food-making, and less food to weak growth.',
    ur: '"why" کے لیے darkness کو no light سے، no light کو کم food-making سے، اور کم food کو weak growth سے جوڑو۔',
  },
  {
    label: 'Give me the full answer',
    en: 'I won\'t give the full answer, but you can build it. Start: "Without sunlight, the plant cannot…"',
    ur: 'میں full answer نہیں دوں گا/گی، لیکن تم خود بنا سکتے ہو۔ شروع کرو: "Without sunlight, the plant cannot…"',
  },
  {
    label: 'Dark room mein plant green rahe ga?',
    en: 'Think about leaves. If a plant cannot get light for many days, would its leaves stay healthy or become weak?',
    ur: 'leaves کے بارے میں سوچو۔ اگر plant کو کئی دن light نہ ملے، تو کیا leaves healthy رہیں گے یا weak ہو جائیں گے؟',
  },
  {
    label: 'What is photosynthesis?',
    en: 'Photosynthesis is how plants use sunlight to make food. Now think: what happens if sunlight is missing?',
    ur: 'photosynthesis وہ process ہے جس میں plants sunlight سے food بناتے ہیں۔ اب سوچو: اگر sunlight نہ ہو تو کیا ہوگا؟',
  },
  {
    label: 'Science answer in English',
    en: 'Make 2 sentences: one about what happens to the plant, and one about why it happens because of no sunlight.',
    ur: '2 sentences بناؤ: ایک plant کے ساتھ کیا ہوتا ہے، اور ایک یہ کہ no sunlight کی وجہ سے ایسا کیوں ہوتا ہے۔',
  },
];

const TASK_SECTIONS: { title: string; subject: Subject; items: QR[] }[] = [
  { title: 'Task: Math — Buses', subject: 'Mathematics', items: MATH_RESPONSES },
  { title: 'Task: Science — Dark Room', subject: 'Science', items: SCIENCE_RESPONSES },
];

interface Props {
  language: Language;
  subject: Subject | null;
  onSelect: (text: string) => void;
}

export default function QuickResponses({ subject, onSelect }: Props) {
  const [openSection, setOpenSection] = useState<string | null>(
    subject === 'Mathematics' ? 'Task: Math — Buses'
    : subject === 'Science' ? 'Task: Science — Dark Room'
    : null
  );

  function toggle(title: string) {
    setOpenSection(prev => prev === title ? null : title);
  }

  return (
    <div className={styles.panel}>
      <h2 className={styles.heading}>Quick Responses</h2>
      <div className={styles.list}>
        {GENERAL.map(q => (
          <button key={q.label} className={styles.chip} data-log={`wizard:quick-${q.label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}`} onClick={() => onSelect(fmt(q))}>
            {q.label}
          </button>
        ))}
      </div>

      {TASK_SECTIONS.map(section => (
        <div key={section.title} className={styles.section}>
          <button
            className={`${styles.sectionToggle} ${openSection === section.title ? styles.sectionOpen : ''}`}
            data-log={`wizard:section-${section.subject.toLowerCase()}`}
            onClick={() => toggle(section.title)}
          >
            <span>{section.title}</span>
            <span className={styles.chevron}>{openSection === section.title ? '▲' : '▼'}</span>
          </button>
          {openSection === section.title && (
            <div className={styles.taskList}>
              {section.items.map(q => (
                <button key={q.label} className={styles.taskChip} data-log={`wizard:quick-${q.label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}`} onClick={() => onSelect(fmt(q))}>
                  {q.label}
                </button>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
