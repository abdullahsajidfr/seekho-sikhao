import { useState } from 'react';
import TeacherLoginScreen   from './screens/TeacherLoginScreen';
import TeacherDashboard     from './screens/TeacherDashboard';
import ClassPage            from './screens/ClassPage';
import StudentProfilePage   from './screens/StudentProfilePage';
import GuardrailsPage       from './screens/GuardrailsPage';

type Screen = 'login' | 'dashboard' | 'class' | 'student' | 'guardrails';

export default function TeacherApp() {
  const [screen,    setScreen]    = useState<Screen>('login');
  const [classId,   setClassId]   = useState<string | null>(null);
  const [studentId, setStudentId] = useState<string | null>(null);

  return (
    <>
      {screen === 'login' && (
        <TeacherLoginScreen onLogin={() => setScreen('dashboard')} />
      )}
      {screen === 'dashboard' && (
        <TeacherDashboard
          onSelectClass={(id) => { setClassId(id); setScreen('class'); }}
          onGuardrails={() => setScreen('guardrails')}
        />
      )}
      {screen === 'class' && classId && (
        <ClassPage
          classId={classId}
          onSelectStudent={(id) => { setStudentId(id); setScreen('student'); }}
          onBack={() => setScreen('dashboard')}
        />
      )}
      {screen === 'student' && studentId && (
        <StudentProfilePage
          studentId={studentId}
          onBack={() => setScreen('class')}
        />
      )}
      {screen === 'guardrails' && (
        <GuardrailsPage onBack={() => setScreen('dashboard')} />
      )}
    </>
  );
}
