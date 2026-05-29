import { Camera, Archive, Settings, BarChart3 } from 'lucide-react';

const NAV_ITEMS = [
  { id: 'slide', icon: Camera, label: '슬라이드 캡처 룸' },
  { id: 'archive', icon: Archive, label: '연간 업무 아카이브' },
  { id: 'settings', icon: Settings, label: '데이터 동기화 설정' },
];

export default function Sidebar({ current, onChange }) {
  return (
    <aside className="w-56 bg-white border-r border-gray-200 flex flex-col shrink-0">
      <div className="px-4 py-5 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-indigo-600 flex items-center justify-center">
            <BarChart3 size={15} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900 leading-tight">Weekly Board</p>
            <p className="text-xs text-gray-400">팀 주간 보고 시스템</p>
          </div>
        </div>
      </div>
      <nav className="flex-1 px-3 py-3 space-y-0.5">
        {NAV_ITEMS.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            onClick={() => onChange(id)}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-colors text-left
              ${current === id
                ? 'bg-indigo-50 text-indigo-700'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </nav>
      <div className="px-4 py-3 border-t border-gray-200">
        <p className="text-xs text-gray-400">Google Sheets 연동 활성</p>
        <div className="mt-1 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-green-400"></span>
          <span className="text-xs text-green-600 font-medium">연결됨</span>
        </div>
      </div>
    </aside>
  );
}
