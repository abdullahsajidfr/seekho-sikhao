import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { LanguageProvider } from './context/LanguageContext';
import AutoLogger from './components/AutoLogger';
import EntryPage  from './surfaces/entry/EntryPage';
import StudentApp from './surfaces/student/StudentApp';
import TeacherApp from './surfaces/teacher/TeacherApp';
import AdminApp   from './surfaces/admin/AdminApp';
import './styles/global.css';

export default function App() {
  return (
    <LanguageProvider>
      <BrowserRouter>
        <AutoLogger />
        <Routes>
          <Route path="/"        element={<EntryPage />} />
          <Route path="/student" element={<StudentApp />} />
          <Route path="/teacher" element={<TeacherApp />} />
          <Route path="/admin"   element={<AdminApp />} />
        </Routes>
      </BrowserRouter>
    </LanguageProvider>
  );
}
