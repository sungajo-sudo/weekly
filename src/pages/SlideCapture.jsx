import { useRef, useState, useEffect } from 'react';
import html2canvas from 'html2canvas';
import { Camera, RefreshCw, Loader } from 'lucide-react';
import { useWeeklyData, triggerSync } from '../hooks/useWeeklyData';
import { PROJECTS } from '../data/mockData';

const SLIDE_W = 1280;
const SLIDE_H = 720;

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

function SlideCard({ title, bg, border, titleColor = '#6b7280', children }) {
  return (
    <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: 10, padding: '14px 18px', flex: 1, overflow: 'hidden' }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: titleColor, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>{title}</div>
      {children}
    </div>
  );
}

export default function SlideCapture() {
  const captureRef = useRef(null);
  const [capturing, setCapturing] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const { data, loading, error, refetch } = useWeeklyData();

  // Derive highlights: top task per member from thisWeek
  const highlights = (data?.members || [])
    .filter(m => m.thisWeek.length > 0)
    .slice(0, 5)
    .map(m => `${m.name} — ${m.thisWeek[0].project}: ${m.thisWeek[0].content}`);

  // Collect unique projects from real data
  const realProjects = [...new Set(
    (data?.members || []).flatMap(m => [...m.prevWeek, ...m.thisWeek].map(t => t.project))
  )].filter(Boolean).slice(0, 6);

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
      link.download = `weekly_dashboard_${data?.sheetName || 'report'}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } finally {
      setCapturing(false);
    }
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-6 py-3 bg-white border-b border-gray-200 shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-base font-bold text-gray-800">주간 보고 룸</h1>
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

      {/* Canvas area */}
      <div className="flex-1 flex items-center justify-center p-6 overflow-hidden">
        {loading && (
          <div className="flex flex-col items-center gap-3 text-gray-400">
            <Loader size={32} className="animate-spin" />
            <p className="text-sm">Google Sheets에서 데이터 불러오는 중...</p>
          </div>
        )}
        {error && !loading && (
          <div className="text-red-500 text-sm bg-red-50 px-4 py-3 rounded-lg border border-red-200">
            연결 오류: {error} — 백엔드 서버(port 3001)가 실행 중인지 확인하세요.
          </div>
        )}
        {!loading && !error && data && (
          <ScaledSlide captureRef={captureRef}>
            {/* Header */}
            <div style={{ padding: '28px 48px 18px', background: 'linear-gradient(to right, #3730a3, #4f46e5)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
              <div>
                <div style={{ color: 'white', fontSize: 28, fontWeight: 900, letterSpacing: '-0.5px' }}>Weekly Team Dashboard</div>
                <div style={{ color: '#c7d2fe', fontSize: 14, marginTop: 4 }}>{data.sheetName}주차 보고</div>
              </div>
              <div style={{ color: 'white', fontSize: 11, opacity: 0.6, fontWeight: 600, letterSpacing: 2 }}>WEEKLY REPORT</div>
            </div>

            {/* Body */}
            <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, padding: '20px 48px', minHeight: 0 }}>
              {/* Left */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <SlideCard title="참여 프로젝트" bg="#f8fafc" border="#e2e8f0">
                  {realProjects.map((p, i) => {
                    const colors = ['#0052cc','#6554c0','#ff5630','#00875a','#ff991f','#00b8d9'];
                    return (
                      <div key={p} style={{ marginBottom: 10 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>{p}</span>
                        </div>
                        <div style={{ height: 8, background: '#e5e7eb', borderRadius: 9999, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${60 + (i * 7) % 35}%`, background: colors[i % colors.length], borderRadius: 9999 }} />
                        </div>
                      </div>
                    );
                  })}
                </SlideCard>

                <SlideCard title="팀원 현황" bg="#f0fdf4" border="#bbf7d0" titleColor="#15803d">
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {data.members.map(m => (
                      <div key={m.name} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'white', border: '1px solid #e5e7eb', borderRadius: 6, padding: '3px 8px' }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>{m.name}</span>
                        <span style={{ fontSize: 11, color: '#9ca3af' }}>{m.thisWeek.length}건</span>
                      </div>
                    ))}
                  </div>
                </SlideCard>
              </div>

              {/* Right */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <SlideCard title="이번 주 주요 업무" bg="#eef2ff" border="#c7d2fe" titleColor="#4f46e5">
                  {highlights.map((h, i) => (
                    <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 7 }}>
                      <span style={{ color: '#818cf8', fontSize: 13, flexShrink: 0 }}>—</span>
                      <p style={{ fontSize: 12, color: '#374151', margin: 0, lineHeight: 1.6 }}>{h}</p>
                    </div>
                  ))}
                </SlideCard>
              </div>
            </div>

            {/* Footer */}
            <div style={{ padding: '10px 48px', background: '#f9fafb', borderTop: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
              <span style={{ fontSize: 11, color: '#9ca3af' }}>Weekly Team Dashboard • {data.sheetName}주차 • {new Date(data.lastSync).toLocaleDateString('ko-KR')} 동기화</span>
              <span style={{ fontSize: 11, color: '#9ca3af' }}>총 {data.members.length}명</span>
            </div>
          </ScaledSlide>
        )}
      </div>
    </div>
  );
}
