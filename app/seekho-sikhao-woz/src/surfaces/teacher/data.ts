export const CLASSES = [
  { id: 'c1', name: 'Grade 4A – Science',     students: 28, active: 14, struggling: 2 },
  { id: 'c2', name: 'Grade 5B – Mathematics', students: 22, active: 10, struggling: 5 },
  { id: 'c3', name: 'Grade 3A – English',     students: 18, active: 8,  struggling: 1 },
];

export const STUDENTS = [
  { id: 's1', classId: 'c1', name: 'Omar Raza',    initials: 'OR', status: 'struggling' },
  { id: 's2', classId: 'c1', name: 'Ayesha Khan',  initials: 'AK', status: 'on-track' },
  { id: 's3', classId: 'c1', name: 'Bilal Ahmed',  initials: 'BA', status: 'on-track' },
  { id: 's4', classId: 'c2', name: 'Sara Malik',   initials: 'SM', status: 'struggling' },
  { id: 's5', classId: 'c2', name: 'Hasan Ali',    initials: 'HA', status: 'on-track' },
  { id: 's6', classId: 'c3', name: 'Zara Qureshi', initials: 'ZQ', status: 'on-track' },
];

export const CHAT_LOGS = [
  { studentId: 's1', time: 'Today 3:42 pm', question: 'What is photosynthesis?', hints: 4, completed: false },
  { studentId: 's1', time: 'Yesterday 2:10 pm', question: 'How does water cycle work?', hints: 2, completed: true },
  { studentId: 's2', time: 'Today 4:00 pm', question: 'What is a cell?', hints: 1, completed: true },
];

export const TOPICS = [
  { studentId: 's1', topic: 'Photosynthesis', count: 11 },
  { studentId: 's1', topic: 'Water Cycle', count: 6 },
  { studentId: 's2', topic: 'Cell Biology', count: 4 },
];
