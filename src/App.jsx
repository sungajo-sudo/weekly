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
  const Page = PAGES[page];

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar current={page} onChange={setPage} />
      <main className="flex-1 overflow-hidden flex flex-col">
        <Page />
      </main>
    </div>
  );
}
