import { useRef, useState, useEffect } from 'react';
import html2canvas from 'html2canvas';
import { Camera, RefreshCw, Loader } from 'lucide-react';
import { useWeeklyData, triggerSync } from '../hooks/useWeeklyData';

const SLIDE_W = 1280;
const SLIDE_H = 720;

// 이번 주 / 다음 주 각각 프로젝트별 그룹핑
function groupByProject(members, weekKey) {
  const map = {};
  for (const member of members) {
    for (const task of member[weekKey] || []) {
      if (!task.project || !task.content) continue;
      if (!map[task.project]) map[task.project] = [];
      map[task.project].push(task.content);
    }
  }
  return Object.entries(map).sort((a, b) => b[1].length - a[1].length);
}

function ScaledSlide({ captureRef, children }) {
  const containerRef = useRef(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    function recalc() {
      if (!containerRef.current) return;
      const { width, height } = containerRef.current.getBoundingClientRect();
      setScale(Math.min(width / SLIDE_W, height / SLIDE_H));
    }
    recalc();
    const ro = new ResizeObserver(recalc);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: SLIDE_W, height: SLIDE_H, transform: `scale(${scale})`, transformOrigin: 'center center', flexShrink: 0 }}>
        <div
          ref={captureRef}
          style={{ width: SLIDE_W, height: SLIDE_H, background: 'white', borderRadius: 16, overflow: 'hidden', boxShadow: '0 4px 24px rgba(0,0,0,0.12)', display: 'flex', flexDirection: 'column', border: '1px solid #e5e7eb' }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

const PROJECT_COLORS = [
  '#4f46e5','#0891b2','#16a34a','#d97706','#dc2626',
  '#7c3aed','#0f766e','#b45309','#be123c','#1d4ed8',
];

export default function SlideCapture() {
  const captureRef = useRef(null);
  const [capturing, setCapturing] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const { data, loading, error, refetch } = useWeeklyData();

  const thisWeekGrouped = data ? groupByProject(data.members, 'prevWeek') : [];
  const nextWeekGrouped = data ? groupByProject(data.members, 'thisWeek') : [];

  async function handleSync() {
    setSyncing(true);
    try { await triggerSync(); await refetch(); } finally { setSyncing(false); }
  }

  async function handleCapture() {
    if (!captureRef.current) return;
    setCapturing(true);
    try {
      const canvas = await html2canvas(captureRef.current, {
        scale: 2, useCORS: true, backgroundColor: '#ffffff',
        width: SLIDE_W, height: SLIDE_H,
      });
      const link = document.createElement('a');
      link.download = `weekly_${data?.sheetName || 'report'}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } finally {
      setCapturing(false);
    }
  }

  // 이번 주 / 다음 주 두 컬럼

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-6 py-3 bg-white border-b border-gray-200 shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-base font-bold text-gray-800">슬라이드 캡처 룸</h1>
          {data && (
            <span className="text-sm text-gray-500 bg-gray-100 px-2.5 py-1 rounded-md font-medium">
              {data.sheetName}주차 · {data.members?.length}명
            </span>
          )}
          <button
            onClick={handleSync}
            disabled={syncing || loading}
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-indigo-600 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={13} className={syncing ? 'animate-spin' : ''} />
            {syncing ? '동기화 중...' : '시트 동기화'}
          </button>
        </div>
        <button
          onClick={handleCapture}
          disabled={capturing || loading || !!error}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-md hover:bg-indigo-700 transition-colors disabled:opacity-60"
        >
          <Camera size={15} />
          {capturing ? '캡처 중...' : '슬라이드 캡처'}
        </button>
      </div>

      {/* Canvas */}
      <div className="flex-1 flex items-center justify-center p-6 overflow-hidden">
        {loading && (
          <div className="flex flex-col items-center gap-3 text-gray-400">
            <Loader size={32} className="animate-spin" />
            <p className="text-sm">Google Sheets에서 데이터 불러오는 중...</p>
          </div>
        )}
        {error && !loading && (
          <div className="text-red-500 text-sm bg-red-50 px-4 py-3 rounded-lg border border-red-200">
            연결 오류: {error}
          </div>
        )}
        {!loading && !error && data && (
          <ScaledSlide captureRef={captureRef}>
            {/* 슬라이드 본문 — 이번 주 / 다음 주 2컬럼 */}
            <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0, overflow: 'hidden', background: 'white' }}>
              {/* 이번 주 컬럼 */}
              <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRight: '1px solid #e5e7eb' }}>
                <div style={{ padding: '14px 24px 10px', background: '#4f46e5', flexShrink: 0 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'white', letterSpacing: '0.05em' }}>이번 주 업무</span>
                </div>
                <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {thisWeekGrouped.map(([project, tasks], idx) => (
                    <ProjectCard key={project} project={project} tasks={tasks} color={PROJECT_COLORS[idx % PROJECT_COLORS.length]} />
                  ))}
                </div>
              </div>
              {/* 다음 주 컬럼 */}
              <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <div style={{ padding: '14px 24px 10px', background: '#0891b2', flexShrink: 0 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'white', letterSpacing: '0.05em' }}>다음 주 계획</span>
                </div>
                <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {nextWeekGrouped.map(([project, tasks], idx) => (
                    <ProjectCard key={project} project={project} tasks={tasks} color={PROJECT_COLORS[idx % PROJECT_COLORS.length]} />
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div style={{ padding: '8px 36px', background: '#f9fafb', borderTop: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
              <span style={{ fontSize: 11, color: '#9ca3af' }}>{data.sheetName}주차 주간 업무 보고</span>
              <span style={{ fontSize: 11, color: '#9ca3af' }}>{new Date(data.lastSync).toLocaleDateString('ko-KR')} 기준</span>
            </div>
          </ScaledSlide>
        )}
      </div>
    </div>
  );
}

function ProjectCard({ project, tasks, color }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      {/* 프로젝트 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 3, height: 14, borderRadius: 2, background: color, flexShrink: 0 }} />
        <span style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>{project}</span>
        <span style={{ fontSize: 11, color: '#9ca3af' }}>{tasks.length}건</span>
      </div>
      {/* 업무 내용 목록 — 팀원명 없이 내용만 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3, paddingLeft: 11, borderLeft: `2px solid ${color}20` }}>
        {tasks.map((content, i) => (
          <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
            <span style={{ color: color, fontSize: 10, marginTop: 2, flexShrink: 0 }}>•</span>
            <span style={{ fontSize: 11, color: '#374151', lineHeight: 1.5 }}>{content}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
