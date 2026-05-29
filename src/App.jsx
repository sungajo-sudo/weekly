import { useState } from 'react';
import Sidebar from './components/Sidebar';
import SlideCapture from './pages/SlideCapture';
import AnnualArchive from './pages/AnnualArchive';
import SyncSettings from './pages/SyncSettings';
import ExecutiveDashboard from './pages/ExecutiveDashboard';

const PAGES = {
  slide: SlideCapture,
  executive: ExecutiveDashboard,
  archive: AnnualArchive,
  settings: SyncSettings,
};

export default function App() {
  const [page, setPage] = useState('executive');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const Page = PAGES[page];

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar
        current={page}
        onChange={setPage}
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(v => !v)}
      />
      <main className="flex-1 overflow-hidden flex flex-col">
        <Page />
      </main>
    </div>
  );
}
