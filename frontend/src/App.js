import '@/index.css';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';
import { DashboardLayout } from '@/components/DashboardLayout';
import { HomePage } from '@/pages/HomePage';
import { UploadPage } from '@/pages/UploadPage';
import { AskPage } from '@/pages/AskPage';
import { DocumentsPage } from '@/pages/DocumentsPage';
import { StatusPage } from '@/pages/StatusPage';

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <DashboardLayout>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/documents" element={<DocumentsPage />} />
            <Route path="/ask" element={<AskPage />} />
            <Route path="/upload" element={<UploadPage />} />
            <Route path="/status" element={<StatusPage />} />
          </Routes>
        </DashboardLayout>
      </BrowserRouter>
      <Toaster position="top-right" theme="dark" richColors />
    </div>
  );
}

export default App;