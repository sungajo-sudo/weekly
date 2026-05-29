import { useRef, useState, useEffect, useCallback } from 'react';
import html2canvas from 'html2canvas';
import { Camera, RefreshCw, Loader, RotateCcw } from 'lucide-react';
import { useWeeklyData, triggerSync } from '../hooks/useWeeklyData';

const SLIDE_W = 1280;
const SLIDE_H = 720;

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

const PROJECT_COLORS = [
  '#4f46e5','#0891b2','#16a34a','#d97706','#dc2626',
  '#7c3aed','#0f766e','#b45309','#be123c','#1d4ed8',
];

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
    <div ref={containerRef} style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ width:SLIDE_W, height:SLIDE_H, transform:`scale(${scale})`, transformOrigin:'center center', flexShrink:0 }}>
        <div ref={captureRef} style={{ width:SLIDE_W, height:SLIDE_H, background:'white', borderRadius:16, overflow:'hidden', boxShadow:'0 4px 24px rgba(0,0,0,0.12)', display:'flex', flexDirection:'column', border:'1px solid #e5e7eb' }}>
          {children}
        </div>
      </div>
    </div>
  );
}

// 인라인 편집 가능한 텍스트 컴포넌트
function EditableText({ value, onChange, style }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const taRef = useRef(null);

  function start() { setDraft(value); setEditing(true); }
  function commit() { onChange(draft); setEditing(false); }
  function cancel() { setEditing(false); }

  useEffect(() => {
    if (editing && taRef.current) {
      taRef.current.focus();
      taRef.current.select();
      // auto-resize
      taRef.current.style.height = 'auto';
      taRef.current.style.height = taRef.current.scrollHeight + 'px';
    }
  }, [editing]);

  if (editing) {
    return (
      <textarea
        ref={taRef}
        value={draft}
        onChange={e => {
          setDraft(e.target.value);
          e.target.style.height = 'auto';
          e.target.style.height = e.target.scrollHeight + 'px';
        }}
        onBlur={commit}
        onKeyDown={e => { if (e.key === 'Escape') cancel(); if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); commit(); } }}
        style={{ ...style, width:'100%', border:'1.5px solid #6366f1', borderRadius:4, outline:'none', padding:'2px 4px', resize:'none', overflow:'hidden', background:'#eef2ff', fontFamily:'inherit' }}
      />
    );
  }
  return (
    <span
      onClick={start}
      title="클릭하여 편집"
      style={{ ...style, cursor:'text', borderRadius:3, padding:'1px 3px', display:'block',
        outline:'1px dashed transparent', transition:'outline 0.15s',
      }}
      onMouseEnter={e => e.currentTarget.style.outline='1px dashed #a5b4fc'}
      onMouseLeave={e => e.currentTarget.style.outline='1px dashed transparent'}
    >
      {value || <span style={{color:'#d1d5db',fontStyle:'italic'}}>내용 없음</span>}
    </span>
  );
}

function ProjectCard({ project, tasks, color, weekKey, projectIdx, onEdit, onDeleteTask, onAddTask }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
        <div style={{ width:3, height:14, borderRadius:2, background:color, flexShrink:0 }} />
        <span style={{ fontSize:13, fontWeight:700, color:'#111827' }}>{project}</span>
        <span style={{ fontSize:11, color:'#9ca3af' }}>{tasks.length}건</span>
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:3, paddingLeft:11, borderLeft:`2px solid ${color}30` }}>
        {tasks.map((content, taskIdx) => (
          <div key={taskIdx} style={{ display:'flex', gap:4, alignItems:'flex-start' }}>
            <span style={{ color:color, fontSize:10, marginTop:3, flexShrink:0 }}>•</span>
            <EditableText
              value={content}
              onChange={val => onEdit(weekKey, project, taskIdx, val)}
              style={{ fontSize:11, color:'#374151', lineHeight:1.5, flex:1 }}
            />
            <span
              onClick={() => onDeleteTask(weekKey, project, taskIdx)}
              title="삭제"
              style={{ fontSize:10, color:'#d1d5db', cursor:'pointer', flexShrink:0, marginTop:2, padding:'0 2px' }}
              onMouseEnter={e=>e.currentTarget.style.color='#ef4444'}
              onMouseLeave={e=>e.currentTarget.style.color='#d1d5db'}
            >✕</span>
          </div>
        ))}
        {/* 항목 추가 버튼 */}
        <div
          onClick={() => onAddTask(weekKey, project)}
          style={{ fontSize:10, color:'#c7d2fe', cursor:'pointer', paddingLeft:2, marginTop:2 }}
          onMouseEnter={e=>e.currentTarget.style.color='#6366f1'}
          onMouseLeave={e=>e.currentTarget.style.color='#c7d2fe'}
        >+ 항목 추가</div>
      </div>
    </div>
  );
}

export default function SlideCapture() {
  const captureRef = useRef(null);
  const [capturing, setCapturing] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const { data, loading, error, refetch } = useWeeklyData();

  // 편집 오버레이: { 'prevWeek': { 프로젝트명: [content,...] }, 'thisWeek': {...} }
  const [edits, setEdits] = useState({});

  // 시트 동기화 시 편집 초기화
  const baseThis = data ? groupByProject(data.members, 'prevWeek') : [];
  const baseNext = data ? groupByProject(data.members, 'thisWeek') : [];

  // 편집 오버레이 적용
  function applyEdits(base, weekKey) {
    return base.map(([project, tasks]) => {
      const overrides = edits[weekKey]?.[project];
      return [project, overrides !== undefined ? overrides : tasks];
    }).filter(([, tasks]) => tasks.length > 0);
  }

  const thisWeekGrouped = applyEdits(baseThis, 'prevWeek');
  const nextWeekGrouped = applyEdits(baseNext, 'thisWeek');

  const handleEdit = useCallback((weekKey, project, taskIdx, newVal) => {
    setEdits(prev => {
      const base = weekKey === 'prevWeek' ? baseThis : baseNext;
      const current = prev[weekKey]?.[project] ?? base.find(([p]) => p === project)?.[1] ?? [];
      const updated = [...current];
      updated[taskIdx] = newVal;
      return { ...prev, [weekKey]: { ...prev[weekKey], [project]: updated } };
    });
  }, [baseThis, baseNext]);

  const handleDeleteTask = useCallback((weekKey, project, taskIdx) => {
    setEdits(prev => {
      const base = weekKey === 'prevWeek' ? baseThis : baseNext;
      const current = prev[weekKey]?.[project] ?? base.find(([p]) => p === project)?.[1] ?? [];
      const updated = current.filter((_, i) => i !== taskIdx);
      return { ...prev, [weekKey]: { ...prev[weekKey], [project]: updated } };
    });
  }, [baseThis, baseNext]);

  const handleAddTask = useCallback((weekKey, project) => {
    setEdits(prev => {
      const base = weekKey === 'prevWeek' ? baseThis : baseNext;
      const current = prev[weekKey]?.[project] ?? base.find(([p]) => p === project)?.[1] ?? [];
      return { ...prev, [weekKey]: { ...prev[weekKey], [project]: [...current, ''] } };
    });
  }, [baseThis, baseNext]);

  async function handleSync() {
    setSyncing(true);
    try { await triggerSync(); await refetch(); setEdits({}); } finally { setSyncing(false); }
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
    } finally { setCapturing(false); }
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <div className="flex items-center justify-between px-6 py-3 bg-white border-b border-gray-200 shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-base font-bold text-gray-800">슬라이드 캡처 룸</h1>
          {data && <span className="text-sm text-gray-500 bg-gray-100 px-2.5 py-1 rounded-md font-medium">{data.sheetName}주차 · {data.members?.length}명</span>}
          <button onClick={handleSync} disabled={syncing||loading} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-indigo-600 transition-colors disabled:opacity-50">
            <RefreshCw size={13} className={syncing?'animate-spin':''} />
            {syncing?'동기화 중...':'시트 동기화'}
          </button>
          {Object.keys(edits).length > 0 && (
            <button onClick={() => setEdits({})} className="flex items-center gap-1 text-xs text-orange-500 hover:text-orange-700">
              <RotateCcw size={12} /> 편집 초기화
            </button>
          )}
          <span className="text-xs text-gray-300">| 항목을 클릭하면 바로 편집됩니다</span>
        </div>
        <button onClick={handleCapture} disabled={capturing||loading||!!error} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-md hover:bg-indigo-700 transition-colors disabled:opacity-60">
          <Camera size={15} />
          {capturing?'캡처 중...':'슬라이드 캡처'}
        </button>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 overflow-hidden">
        {loading && <div className="flex flex-col items-center gap-3 text-gray-400"><Loader size={32} className="animate-spin" /><p className="text-sm">데이터 불러오는 중...</p></div>}
        {error && !loading && <div className="text-red-500 text-sm bg-red-50 px-4 py-3 rounded-lg border border-red-200">연결 오류: {error}</div>}
        {!loading && !error && data && (
          <ScaledSlide captureRef={captureRef}>
            <div style={{ flex:1, display:'grid', gridTemplateColumns:'1fr 1fr', overflow:'hidden', background:'white' }}>
              {/* 이번 주 */}
              <div style={{ display:'flex', flexDirection:'column', overflow:'hidden', borderRight:'1px solid #e5e7eb' }}>
                <div style={{ padding:'14px 24px 10px', background:'#4f46e5', flexShrink:0 }}>
                  <span style={{ fontSize:13, fontWeight:700, color:'white' }}>이번 주 업무</span>
                </div>
                <div style={{ flex:1, overflowY:'auto', padding:'16px 24px', display:'flex', flexDirection:'column', gap:14 }}>
                  {thisWeekGrouped.map(([project, tasks], idx) => (
                    <ProjectCard key={project} project={project} tasks={tasks} color={PROJECT_COLORS[idx%PROJECT_COLORS.length]}
                      weekKey="prevWeek" projectIdx={idx} onEdit={handleEdit} onDeleteTask={handleDeleteTask} onAddTask={handleAddTask} />
                  ))}
                </div>
              </div>
              {/* 다음 주 */}
              <div style={{ display:'flex', flexDirection:'column', overflow:'hidden' }}>
                <div style={{ padding:'14px 24px 10px', background:'#0891b2', flexShrink:0 }}>
                  <span style={{ fontSize:13, fontWeight:700, color:'white' }}>다음 주 계획</span>
                </div>
                <div style={{ flex:1, overflowY:'auto', padding:'16px 24px', display:'flex', flexDirection:'column', gap:14 }}>
                  {nextWeekGrouped.map(([project, tasks], idx) => (
                    <ProjectCard key={project} project={project} tasks={tasks} color={PROJECT_COLORS[idx%PROJECT_COLORS.length]}
                      weekKey="thisWeek" projectIdx={idx} onEdit={handleEdit} onDeleteTask={handleDeleteTask} onAddTask={handleAddTask} />
                  ))}
                </div>
              </div>
            </div>
            <div style={{ padding:'8px 36px', background:'#f9fafb', borderTop:'1px solid #f3f4f6', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
              <span style={{ fontSize:11, color:'#9ca3af' }}>{data.sheetName}주차 주간 업무 보고</span>
              <span style={{ fontSize:11, color:'#9ca3af' }}>{new Date(data.lastSync).toLocaleDateString('ko-KR')} 기준</span>
            </div>
          </ScaledSlide>
        )}
      </div>
    </div>
  );
}
