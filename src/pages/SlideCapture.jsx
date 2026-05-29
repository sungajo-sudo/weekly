import { useRef, useState, useEffect, useCallback } from 'react';
import html2canvas from 'html2canvas';
import { Camera, RefreshCw, Loader, RotateCcw, GripVertical } from 'lucide-react';
import { useWeeklyData, triggerSync } from '../hooks/useWeeklyData';
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragOverlay,
} from '@dnd-kit/core';
import {
  SortableContext, verticalListSortingStrategy, useSortable, arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const SLIDE_W = 1280;
const SLIDE_H = 720;

// 프로젝트 > 카테고리 > [업무내용] 구조로 그룹핑
function groupByProjectCategory(members, weekKey) {
  // { 프로젝트: { 카테고리: [content, ...] } }
  const map = {};
  for (const member of members) {
    for (const task of member[weekKey] || []) {
      if (!task.project || !task.content) continue;
      const proj = task.project;
      const cat = task.category || '기타';
      if (!map[proj]) map[proj] = {};
      if (!map[proj][cat]) map[proj][cat] = [];
      map[proj][cat].push(task.content);
    }
  }
  // 건수 많은 순 정렬
  return Object.entries(map)
    .map(([proj, cats]) => {
      const total = Object.values(cats).flat().length;
      return [proj, cats, total];
    })
    .sort((a, b) => b[2] - a[2]);
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

// 드래그 핸들이 있는 Sortable 래퍼
function SortableProjectCard(props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: props.project });
  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
        position: 'relative',
      }}
    >
      {/* 드래그 핸들 */}
      <div
        {...attributes}
        {...listeners}
        style={{
          position: 'absolute', top: 2, right: 0,
          cursor: 'grab', color: '#d1d5db', padding: '2px 4px', zIndex: 10,
          touchAction: 'none',
        }}
        onMouseEnter={e => e.currentTarget.style.color = '#6366f1'}
        onMouseLeave={e => e.currentTarget.style.color = '#d1d5db'}
      >
        <GripVertical size={14} />
      </div>
      <ProjectCard {...props} />
    </div>
  );
}

// 프로젝트 > 카테고리 > 업무내용
function ProjectCard({ project, cats, total, color, weekKey, onEdit, onDeleteTask, onAddTask }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
      {/* 프로젝트 헤더 */}
      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
        <div style={{ width:3, height:15, borderRadius:2, background:color, flexShrink:0 }} />
        <span style={{ fontSize:13, fontWeight:700, color:'#111827' }}>{project}</span>
        <span style={{ fontSize:11, color:'#9ca3af' }}>{total}건</span>
      </div>
      {/* 카테고리별 그룹 */}
      <div style={{ display:'flex', flexDirection:'column', gap:8, paddingLeft:11 }}>
        {Object.entries(cats).map(([cat, tasks]) => (
          <div key={cat}>
            {/* 카테고리 레이블 */}
            <div style={{ display:'inline-flex', alignItems:'center', background:`${color}18`, borderRadius:4, padding:'1px 7px', marginBottom:4 }}>
              <span style={{ fontSize:10, fontWeight:600, color:color }}>{cat}</span>
            </div>
            {/* 업무 목록 */}
            <div style={{ display:'flex', flexDirection:'column', gap:2, paddingLeft:4, borderLeft:`2px solid ${color}25` }}>
              {tasks.map((content, taskIdx) => (
                <div key={taskIdx} style={{ display:'flex', gap:4, alignItems:'flex-start' }}>
                  <span style={{ color:color, fontSize:10, marginTop:3, flexShrink:0 }}>•</span>
                  <EditableText
                    value={content}
                    onChange={val => onEdit(weekKey, project, cat, taskIdx, val)}
                    style={{ fontSize:11, color:'#374151', lineHeight:1.5, flex:1 }}
                  />
                  <span onClick={() => onDeleteTask(weekKey, project, cat, taskIdx)}
                    style={{ fontSize:10, color:'#d1d5db', cursor:'pointer', flexShrink:0, marginTop:2 }}
                    onMouseEnter={e=>e.currentTarget.style.color='#ef4444'}
                    onMouseLeave={e=>e.currentTarget.style.color='#d1d5db'}>✕</span>
                </div>
              ))}
              <div onClick={() => onAddTask(weekKey, project, cat)}
                style={{ fontSize:10, color:'#d1d5db', cursor:'pointer', paddingLeft:2 }}
                onMouseEnter={e=>e.currentTarget.style.color=color}
                onMouseLeave={e=>e.currentTarget.style.color='#d1d5db'}>+ 추가</div>
            </div>
          </div>
        ))}
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
  const baseThis = data ? groupByProjectCategory(data.members, 'prevWeek') : [];
  const baseNext = data ? groupByProjectCategory(data.members, 'thisWeek') : [];

  // 편집 오버레이 적용 (카테고리 구조 유지)
  function applyEdits(base, weekKey) {
    return base.map(([proj, cats, total]) => {
      const editedCats = {};
      for (const [cat, tasks] of Object.entries(cats)) {
        const key = `${proj}__${cat}`;
        editedCats[cat] = edits[weekKey]?.[key] ?? tasks;
      }
      const newTotal = Object.values(editedCats).flat().length;
      return [proj, editedCats, newTotal];
    }).filter(([, , t]) => t > 0);
  }

  const thisWeekGrouped = applyEdits(baseThis, 'prevWeek');
  const nextWeekGrouped = applyEdits(baseNext, 'thisWeek');

  // 드래그 순서 상태 (프로젝트명 배열)
  const [thisOrder, setThisOrder] = useState(null);
  const [nextOrder, setNextOrder] = useState(null);

  // 데이터 변경 시 순서 초기화
  useEffect(() => { setThisOrder(null); setNextOrder(null); }, [data]);

  const orderedThis = thisOrder
    ? [...thisWeekGrouped].sort((a, b) => thisOrder.indexOf(a[0]) - thisOrder.indexOf(b[0]))
    : thisWeekGrouped;
  const orderedNext = nextOrder
    ? [...nextWeekGrouped].sort((a, b) => nextOrder.indexOf(a[0]) - nextOrder.indexOf(b[0]))
    : nextWeekGrouped;

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  function handleDragEnd(weekKey, event) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const grouped = weekKey === 'prevWeek' ? orderedThis : orderedNext;
    const ids = grouped.map(([p]) => p);
    const oldIdx = ids.indexOf(active.id);
    const newIdx = ids.indexOf(over.id);
    const newOrder = arrayMove(ids, oldIdx, newIdx);
    if (weekKey === 'prevWeek') setThisOrder(newOrder);
    else setNextOrder(newOrder);
  }

  const getTaskList = useCallback((weekKey, project, category) => {
    const key = `${project}__${category}`;
    const base = weekKey === 'prevWeek' ? baseThis : baseNext;
    return edits[weekKey]?.[key] ?? base.find(([p]) => p === project)?.[1]?.[category] ?? [];
  }, [baseThis, baseNext, edits]);

  const handleEdit = useCallback((weekKey, project, category, taskIdx, newVal) => {
    const key = `${project}__${category}`;
    setEdits(prev => {
      const current = getTaskList(weekKey, project, category);
      const updated = [...current]; updated[taskIdx] = newVal;
      return { ...prev, [weekKey]: { ...prev[weekKey], [key]: updated } };
    });
  }, [getTaskList]);

  const handleDeleteTask = useCallback((weekKey, project, category, taskIdx) => {
    const key = `${project}__${category}`;
    setEdits(prev => {
      const current = getTaskList(weekKey, project, category);
      return { ...prev, [weekKey]: { ...prev[weekKey], [key]: current.filter((_, i) => i !== taskIdx) } };
    });
  }, [getTaskList]);

  const handleAddTask = useCallback((weekKey, project, category) => {
    const key = `${project}__${category}`;
    setEdits(prev => {
      const current = getTaskList(weekKey, project, category);
      return { ...prev, [weekKey]: { ...prev[weekKey], [key]: [...current, ''] } };
    });
  }, [getTaskList]);

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
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={e => handleDragEnd('prevWeek', e)}>
                  <SortableContext items={orderedThis.map(([p]) => p)} strategy={verticalListSortingStrategy}>
                    <div style={{ flex:1, overflowY:'auto', padding:'16px 24px', display:'flex', flexDirection:'column', gap:14 }}>
                      {orderedThis.map(([project, cats, total], idx) => (
                        <SortableProjectCard key={project} project={project} cats={cats} total={total}
                          color={PROJECT_COLORS[idx%PROJECT_COLORS.length]}
                          weekKey="prevWeek" onEdit={handleEdit} onDeleteTask={handleDeleteTask} onAddTask={handleAddTask} />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              </div>
              {/* 다음 주 */}
              <div style={{ display:'flex', flexDirection:'column', overflow:'hidden' }}>
                <div style={{ padding:'14px 24px 10px', background:'#0891b2', flexShrink:0 }}>
                  <span style={{ fontSize:13, fontWeight:700, color:'white' }}>다음 주 계획</span>
                </div>
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={e => handleDragEnd('thisWeek', e)}>
                  <SortableContext items={orderedNext.map(([p]) => p)} strategy={verticalListSortingStrategy}>
                    <div style={{ flex:1, overflowY:'auto', padding:'16px 24px', display:'flex', flexDirection:'column', gap:14 }}>
                      {orderedNext.map(([project, cats, total], idx) => (
                        <SortableProjectCard key={project} project={project} cats={cats} total={total}
                          color={PROJECT_COLORS[idx%PROJECT_COLORS.length]}
                          weekKey="thisWeek" onEdit={handleEdit} onDeleteTask={handleDeleteTask} onAddTask={handleAddTask} />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
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
