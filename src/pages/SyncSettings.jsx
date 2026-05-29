import { useState } from 'react';
import { RefreshCw, CheckCircle, Sheet } from 'lucide-react';
import { triggerSync } from '../hooks/useWeeklyData';

const SHEET_URL = 'https://docs.google.com/spreadsheets/d/1fZ4ueBW--ZuNs_KIS8BbRIyvfow1u9ylZqlsCW3a-4U/edit';

export default function SyncSettings() {
  const [sheetUrl, setSheetUrl] = useState(SHEET_URL);
  const [status,   setStatus]   = useState('idle'); // idle | syncing | done | error
  const [lastSync, setLastSync] = useState(null);
  const [rows,     setRows]     = useState(null);

  async function handleConnect() {
    setStatus('syncing');
    try {
      const result = await triggerSync();
      setLastSync(new Date().toLocaleString('ko-KR'));
      setRows(result.rows ?? result.members ?? '—');
      setStatus('done');
    } catch (e) {
      setStatus('error');
    }
  }

  const btnLabel = {
    idle:    '연결 및 동기화',
    syncing: '동기화 중...',
    done:    '✓ 동기화 완료',
    error:   '⚠ 다시 시도',
  }[status];

  const btnClass = {
    idle:    'bg-green-600 hover:bg-green-700 text-white',
    syncing: 'bg-green-400 text-white cursor-not-allowed',
    done:    'bg-indigo-600 hover:bg-indigo-700 text-white',
    error:   'bg-red-500 hover:bg-red-600 text-white',
  }[status];

  return (
    <div className="flex flex-col h-full bg-gray-50 overflow-auto">
      <div className="px-6 py-3 bg-white border-b border-gray-200 shrink-0">
        <h1 className="text-base font-bold text-gray-800">데이터 동기화 설정</h1>
        <p className="text-xs text-gray-500 mt-0.5">Google Sheets 연결 및 수동 동기화를 실행합니다.</p>
      </div>

      <div className="px-6 py-5 max-w-xl">
        <section className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-5">
            <Sheet size={16} className="text-green-600" />
            <h2 className="text-sm font-bold text-gray-800">Google Sheets 연결</h2>
          </div>

          <label className="block text-xs font-semibold text-gray-500 mb-1.5">스프레드시트 URL</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={sheetUrl}
              onChange={e => { setSheetUrl(e.target.value); setStatus('idle'); }}
              className="flex-1 text-sm border border-gray-200 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              placeholder="https://docs.google.com/spreadsheets/d/..."
            />
            <button
              onClick={handleConnect}
              disabled={status === 'syncing'}
              className={`flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-md transition-colors ${btnClass}`}
            >
              <RefreshCw size={13} className={status === 'syncing' ? 'animate-spin' : ''} />
              {btnLabel}
            </button>
          </div>

          {/* 완료 상태 표시 */}
          {status === 'done' && lastSync && (
            <div className="mt-4 flex items-center gap-2 text-xs text-green-700 bg-green-50 border border-green-100 rounded-lg px-3 py-2">
              <CheckCircle size={14} className="text-green-500 shrink-0" />
              <span><strong>{lastSync}</strong> 동기화 완료 · {rows}건 로드됨</span>
            </div>
          )}
          {status === 'error' && (
            <div className="mt-4 text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              ⚠ 동기화 실패. URL을 확인하거나 서비스 계정 권한을 확인하세요.
            </div>
          )}

          <p className="text-xs text-gray-400 mt-4">
            ※ 서비스 계정 이메일이 해당 스프레드시트의 공유 대상에 포함되어 있어야 합니다.
          </p>
        </section>
      </div>
    </div>
  );
}
