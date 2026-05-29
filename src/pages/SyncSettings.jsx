import { useState } from 'react';
import { RefreshCw, CheckCircle, Clock, Link, Sheet } from 'lucide-react';
import { useWeeklyData, triggerSync } from '../hooks/useWeeklyData';

const SCHEDULES = [
  { id: 'fri18', label: '매주 금요일 오후 6시', active: true },
  { id: 'mon07', label: '매주 월요일 오전 7시', active: false },
];

const SYNC_LOG = [
  { time: '2026-05-29 07:00', status: 'success', rows: 42 },
  { time: '2026-05-22 18:00', status: 'success', rows: 38 },
  { time: '2026-05-15 18:00', status: 'error', rows: 0 },
  { time: '2026-05-08 18:00', status: 'success', rows: 35 },
];

export default function SyncSettings() {
  const [sheetUrl, setSheetUrl] = useState('https://docs.google.com/spreadsheets/d/example-id/edit');
  const [schedules, setSchedules] = useState(SCHEDULES);
  const [syncing, setSyncing] = useState(false);

  function toggleSchedule(id) {
    setSchedules(prev => prev.map(s => s.id === id ? { ...s, active: !s.active } : s));
  }

  const { data, refetch } = useWeeklyData();

  async function handleManualSync() {
    setSyncing(true);
    try {
      const result = await triggerSync();
      await refetch();
      alert(`동기화 완료: ${result.rows}행 적재됨`);
    } catch (e) {
      alert('동기화 실패: ' + e.message);
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="flex flex-col h-full bg-gray-50 overflow-auto">
      <div className="px-6 py-3 bg-white border-b border-gray-200 shrink-0">
        <h1 className="text-base font-bold text-gray-800">데이터 동기화 설정</h1>
        <p className="text-xs text-gray-500 mt-0.5">Google Sheets API 연동 및 자동 동기화 스케줄을 관리합니다.</p>
      </div>

      <div className="px-6 py-5 flex flex-col gap-5 max-w-2xl">
        {/* Google Sheet URL */}
        <section className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Sheet size={16} className="text-green-600" />
            <h2 className="text-sm font-bold text-gray-800">Google Sheets 연결</h2>
          </div>
          <label className="block text-xs font-semibold text-gray-500 mb-1.5">스프레드시트 URL</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={sheetUrl}
              onChange={e => setSheetUrl(e.target.value)}
              className="flex-1 text-sm border border-gray-200 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              placeholder="https://docs.google.com/spreadsheets/d/..."
            />
            <button className="flex items-center gap-1.5 px-4 py-2 bg-green-600 text-white text-sm font-semibold rounded-md hover:bg-green-700 transition-colors">
              <Link size={13} />
              연결
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            ※ Google Sheets API 사용을 위해 서비스 계정 키(.json) 파일을 서버에 업로드해야 합니다.
          </p>
        </section>

        {/* Schema Info */}
        <section className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-bold text-gray-800 mb-3">데이터 스키마 매핑</h2>
          <div className="grid grid-cols-3 gap-3">
            {[
              { name: 'User_Table', fields: ['ID', '이름', '파트', '프로필 이미지', '연간 목표'], color: 'bg-blue-50 border-blue-100' },
              { name: 'Task_Table', fields: ['ID', '주차 코드(YYYY-WW)', '프로젝트명', '업무구분', '지난주업무', '금주계획', '상태값'], color: 'bg-indigo-50 border-indigo-100' },
              { name: 'Feedback_Table', fields: ['ID', 'Task_ID', '작성자_ID', '피드백내용', '작성일시'], color: 'bg-green-50 border-green-100' },
            ].map(table => (
              <div key={table.name} className={`rounded-lg border p-3 ${table.color}`}>
                <p className="text-xs font-bold text-gray-700 mb-2">{table.name}</p>
                <ul className="space-y-0.5">
                  {table.fields.map(f => (
                    <li key={f} className="text-xs text-gray-500 flex items-center gap-1">
                      <span className="w-1 h-1 rounded-full bg-gray-400 shrink-0"></span>
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* Sync Schedule */}
        <section className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Clock size={16} className="text-indigo-500" />
            <h2 className="text-sm font-bold text-gray-800">자동 동기화 스케줄</h2>
          </div>
          <div className="space-y-3">
            {schedules.map(s => (
              <div key={s.id} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg border border-gray-100">
                <span className="text-sm text-gray-700">{s.label}</span>
                <button
                  onClick={() => toggleSchedule(s.id)}
                  className={`relative w-10 h-5 rounded-full transition-colors ${s.active ? 'bg-indigo-600' : 'bg-gray-300'}`}
                >
                  <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${s.active ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </button>
              </div>
            ))}
          </div>
          <button
            onClick={handleManualSync}
            disabled={syncing}
            className="mt-4 flex items-center gap-2 px-4 py-2 border border-indigo-300 text-indigo-700 text-sm font-semibold rounded-md hover:bg-indigo-50 transition-colors disabled:opacity-60"
          >
            <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
            {syncing ? '동기화 중...' : '지금 수동 동기화'}
          </button>
        </section>

        {/* Sync Log */}
        <section className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-bold text-gray-800 mb-3">동기화 이력</h2>
          <div className="divide-y divide-gray-100">
            {SYNC_LOG.map((log, i) => (
              <div key={i} className="flex items-center justify-between py-2.5">
                <div className="flex items-center gap-2">
                  {log.status === 'success'
                    ? <CheckCircle size={14} className="text-green-500" />
                    : <span className="text-red-500 text-sm">✗</span>}
                  <span className="text-xs text-gray-500">{log.time}</span>
                </div>
                <span className={`text-xs font-semibold ${log.status === 'success' ? 'text-green-600' : 'text-red-500'}`}>
                  {log.status === 'success' ? `${log.rows}행 적재 완료` : '동기화 실패'}
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
