import { useRef, useState, useEffect, useCallback } from 'react';
import html2canvas from 'html2canvas';
import { Camera, RefreshCw, Loader, RotateCcw, GripVertical, ChevronDown } from 'lucide-react';
import { useWeeklyData, triggerSync } from '../hooks/useWeeklyData';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const SLIDE_W = 1280;
const SLIDE_H = 720;
const PROJECT_COLORS = [
  '#4f46e5','#0891b2','#16a34a','#d97706','#dc2626',
  '#7c3aed','#0f766e','#b45309','#be123c','#1d4ed8',
];

/* ─── 데이터 그룹핑 ─── */
function groupByProjectCategory(members, weekKey) {
  const map = {};
  for (const member of members) {
    for (const task of member[weekKey] || []) {
      if (!task.project || !task.content) continue;
      const proj = task.project;
      const cat  = task.category || '기타';
      if (!map[proj]) map[proj] = {};
      if (!map[proj][cat]) map[proj][cat] = [];
      map[proj][cat].push(task.content);
    }
  }
  return Object.entries(map)
    .map(([proj, cats]) => [proj, cats, Object.values(cats).flat().length])
    .sort((a, b) => b[2] - a[2]);
}

/* ─── 16:9 ScaledSlide ─── */
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

/* ─── 리치 텍스트 인라인 에디터 (Bold / Red) ─── */
function EditableRichText({ value, onChange, style }) {
  const [editing, setEditing] = useState(false);
  const editorRef = useRef(null);

  // 편집 모드 진입 시 HTML 주입 + 포커스
  useEffect(() => {
    if (editing && editorRef.current) {
      editorRef.current.innerHTML = value || '';
      editorRef.current.focus();
      // 커서를 끝으로
      const range = document.createRange();
      const sel   = window.getSelection();
      range.selectNodeContents(editorRef.current);
      range.collapse(false);
      sel.removeAllRanges();
      sel.addRange(range);
    }
  }, [editing]);

  function commit() {
    if (editorRef.current) onChange(editorRef.current.innerHTML);
    setEditing(false);
  }

  // toolbar 버튼: onMouseDown + preventDefault → 에디터 포커스 유지
  function fmt(e, cmd, val) {
    e.preventDefault();
    editorRef.current?.focus();
    document.execCommand(cmd, false, val);
  }

  if (editing) return (
    <div style={{ display:'flex', flexDirection:'column', gap:3 }}>
      {/* 포맷 툴바 */}
      <div style={{ display:'inline-flex', alignItems:'center', gap:2, background:'#1f2937', borderRadius:6, padding:'3px 6px', width:'fit-content', boxShadow:'0 2px 8px rgba(0,0,0,0.18)' }}>
        <ToolBtn onMouseDown={e=>fmt(e,'bold')} title="굵게 (Ctrl+B)">
          <span style={{ fontWeight:800, fontSize:12, fontFamily:'serif' }}>B</span>
        </ToolBtn>
        <ToolBtn onMouseDown={e=>fmt(e,'foreColor','#ef4444')} title="빨간색">
          <span style={{ fontSize:12, color:'#ef4444', fontWeight:700 }}>A</span>
          <span style={{ width:8, height:3, background:'#ef4444', borderRadius:1, position:'absolute', bottom:1, left:'50%', transform:'translateX(-50%)' }}/>
        </ToolBtn>
        <ToolBtn onMouseDown={e=>fmt(e,'foreColor','#111827')} title="색상 초기화">
          <span style={{ fontSize:11, color:'#9ca3af' }}>A</span>
        </ToolBtn>
        <div style={{ width:1, height:14, background:'#374151', margin:'0 2px' }}/>
        <ToolBtn onMouseDown={e=>fmt(e,'removeFormat')} title="서식 제거">
          <span style={{ fontSize:10, color:'#6b7280' }}>✕</span>
        </ToolBtn>
        <div style={{ width:1, height:14, background:'#374151', margin:'0 2px' }}/>
        <ToolBtn onMouseDown={e=>{e.preventDefault();commit();}} title="저장 (Enter)">
          <span style={{ fontSize:10, color:'#6ee7b7' }}>저장</span>
        </ToolBtn>
      </div>
      {/* contentEditable */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onBlur={commit}
        onKeyDown={e => { if(e.key==='Escape') setEditing(false); }}
        style={{ ...style, minHeight:18, outline:'1.5px solid #6366f1', borderRadius:4,
          padding:'3px 6px', background:'#eef2ff', wordBreak:'break-word', whiteSpace:'pre-wrap',
          lineHeight:1.6 }}
      />
    </div>
  );

  // 표시 모드: HTML 렌더링
  const isEmpty = !value || value === '' || value === '<br>';
  return (
    <span
      onClick={() => setEditing(true)}
      title="클릭하여 편집"
      dangerouslySetInnerHTML={{ __html: isEmpty ? '<span style="color:#d1d5db;font-style:italic">내용 없음</span>' : value }}
      style={{ ...style, cursor:'text', borderRadius:3, padding:'1px 3px', display:'block',
        outline:'1px dashed transparent', transition:'outline 0.15s', wordBreak:'break-word', whiteSpace:'pre-wrap' }}
      onMouseEnter={e=>e.currentTarget.style.outline='1px dashed #a5b4fc'}
      onMouseLeave={e=>e.currentTarget.style.outline='1px dashed transparent'}
    />
  );
}

function ToolBtn({ children, onMouseDown, title }) {
  const [hover, setHover] = useState(false);
  return (
    <button onMouseDown={onMouseDown} title={title}
      onMouseEnter={()=>setHover(true)} onMouseLeave={()=>setHover(false)}
      style={{ position:'relative', display:'flex', alignItems:'center', justifyContent:'center',
        background: hover?'#374151':'transparent', border:'none', cursor:'pointer',
        borderRadius:4, padding:'2px 6px', minWidth:22, height:22, transition:'background 0.1s' }}>
      {children}
    </button>
  );
}

/* ─── 카테고리 드래그 아이템 ─── */
function SortableCategoryBlock({ id, cat, tasks, color, weekKey, project, onEdit, onDeleteTask, onAddTask }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  return (
    <div ref={setNodeRef} style={{ transform:CSS.Transform.toString(transform), transition, opacity:isDragging?0.4:1 }}>
      <div style={{ marginBottom:8 }}>
        <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:4 }}>
          {/* 카테고리 드래그 핸들 */}
          <div {...attributes} {...listeners}
            style={{ cursor:'grab', color:'#d1d5db', display:'flex', alignItems:'center', touchAction:'none' }}
            onMouseEnter={e=>e.currentTarget.style.color=color}
            onMouseLeave={e=>e.currentTarget.style.color='#d1d5db'}>
            <GripVertical size={12}/>
          </div>
          <div style={{ display:'inline-flex', alignItems:'center', background:`${color}18`, borderRadius:4, padding:'1px 8px' }}>
            <span style={{ fontSize:10, fontWeight:600, color }}>{cat}</span>
          </div>
        </div>
        <div style={{ paddingLeft:20, borderLeft:`2px solid ${color}25`, display:'flex', flexDirection:'column', gap:2 }}>
          {tasks.map((content, i) => (
            <div key={i} style={{ display:'flex', gap:4, alignItems:'flex-start' }}>
              <span style={{ color, fontSize:10, marginTop:3, flexShrink:0 }}>•</span>
              <EditableRichText value={content} onChange={val=>onEdit(weekKey,project,cat,i,val)}
                style={{ fontSize:11, color:'#374151', lineHeight:1.5, flex:1 }}/>
              <span onClick={()=>onDeleteTask(weekKey,project,cat,i)}
                style={{ fontSize:10, color:'#d1d5db', cursor:'pointer', flexShrink:0, marginTop:2 }}
                onMouseEnter={e=>e.currentTarget.style.color='#ef4444'}
                onMouseLeave={e=>e.currentTarget.style.color='#d1d5db'}>✕</span>
            </div>
          ))}
          <div onClick={()=>onAddTask(weekKey,project,cat)}
            style={{ fontSize:10, color:'#d1d5db', cursor:'pointer' }}
            onMouseEnter={e=>e.currentTarget.style.color=color}
            onMouseLeave={e=>e.currentTarget.style.color='#d1d5db'}>+ 추가</div>
        </div>
      </div>
    </div>
  );
}

/* ─── 프로젝트 아코디언 카드 (드래그 가능) ─── */
function SortableProjectAccordion({ project, cats, total, color, isOpen, onToggle,
  catOrder, onCatReorder, weekKey, onEdit, onDeleteTask, onAddTask, sensors }) {

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: project });

  const orderedCats = catOrder.length > 0
    ? catOrder.map(c => [c, cats[c]]).filter(([, t]) => t)
    : Object.entries(cats);

  function handleCatDragEnd(e) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const ids = orderedCats.map(([c]) => c);
    onCatReorder(arrayMove(ids, ids.indexOf(active.id), ids.indexOf(over.id)));
  }

  return (
    <div ref={setNodeRef}
      style={{ transform:CSS.Transform.toString(transform), transition, opacity:isDragging?0.4:1,
        border:`1px solid ${isOpen ? color+'60' : '#e5e7eb'}`, borderRadius:8, overflow:'hidden',
        background: isOpen ? `${color}06` : 'white', transition:'all 0.2s' }}>

      {/* 아코디언 헤더 */}
      <div onClick={onToggle}
        style={{ display:'flex', alignItems:'center', padding:'10px 12px', cursor:'pointer', userSelect:'none',
          background: isOpen ? `${color}12` : 'transparent' }}>
        {/* 프로젝트 드래그 핸들 */}
        <div {...attributes} {...listeners}
          onClick={e=>e.stopPropagation()}
          style={{ cursor:'grab', color:'#d1d5db', marginRight:6, display:'flex', touchAction:'none' }}
          onMouseEnter={e=>e.currentTarget.style.color=color}
          onMouseLeave={e=>e.currentTarget.style.color='#d1d5db'}>
          <GripVertical size={14}/>
        </div>
        <div style={{ width:3, height:14, borderRadius:2, background:color, marginRight:8, flexShrink:0 }}/>
        <span style={{ fontSize:12, fontWeight:700, color:'#111827', flex:1 }}>{project}</span>
        <span style={{ fontSize:10, color:'#9ca3af', marginRight:8 }}>{total}건</span>
        {/* ChevronDown 회전 애니메이션 */}
        <ChevronDown size={14} style={{ color:isOpen?color:'#9ca3af', transform:isOpen?'rotate(180deg)':'rotate(0deg)', transition:'transform 0.25s ease', flexShrink:0 }}/>
      </div>

      {/* 아코디언 콘텐츠 */}
      <div style={{ maxHeight: isOpen ? 800 : 0, overflow:'hidden', transition:'max-height 0.3s ease' }}>
        <div style={{ padding:'10px 14px 12px', borderTop:`1px solid ${color}20` }}>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleCatDragEnd}>
            <SortableContext items={orderedCats.map(([c])=>c)} strategy={verticalListSortingStrategy}>
              {orderedCats.map(([cat, tasks]) => tasks && (
                <SortableCategoryBlock key={cat} id={cat} cat={cat} tasks={tasks} color={color}
                  weekKey={weekKey} project={project}
                  onEdit={onEdit} onDeleteTask={onDeleteTask} onAddTask={onAddTask}/>
              ))}
            </SortableContext>
          </DndContext>
        </div>
      </div>
    </div>
  );
}

/* ─── 메인 컴포넌트 ─── */
export default function SlideCapture() {
  const captureRef = useRef(null);
  const [capturing, setCapturing] = useState(false);
  const [syncing,   setSyncing]   = useState(false);
  const { data, loading, error, refetch } = useWeeklyData();

  const [edits,    setEdits]    = useState({});
  const [thisOrder, setThisOrder] = useState(null);
  const [nextOrder, setNextOrder] = useState(null);
  const [catOrders, setCatOrders] = useState({});   // "weekKey__project" → [cat,...]
  const [openThis,  setOpenThis]  = useState(null); // 이번 주 열린 프로젝트
  const [openNext,  setOpenNext]  = useState(null); // 다음 주 열린 프로젝트

  const baseThis = data ? groupByProjectCategory(data.members, 'prevWeek') : [];
  const baseNext = data ? groupByProjectCategory(data.members, 'thisWeek') : [];

  useEffect(() => { setThisOrder(null); setNextOrder(null); setOpenThis(null); setOpenNext(null); }, [data]);

  function applyEdits(base, weekKey) {
    return base.map(([proj, cats]) => {
      const editedCats = {};
      for (const [cat, tasks] of Object.entries(cats)) {
        editedCats[cat] = edits[weekKey]?.[`${proj}__${cat}`] ?? tasks;
      }
      return [proj, editedCats, Object.values(editedCats).flat().length];
    }).filter(([,,t]) => t > 0);
  }

  const thisWeekGrouped = applyEdits(baseThis, 'prevWeek');
  const nextWeekGrouped = applyEdits(baseNext, 'thisWeek');

  function ordered(grouped, order) {
    if (!order) return grouped;
    return [...grouped].sort((a,b) => order.indexOf(a[0]) - order.indexOf(b[0]));
  }
  const orderedThis = ordered(thisWeekGrouped, thisOrder);
  const orderedNext = ordered(nextWeekGrouped, nextOrder);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  function handleProjectDragEnd(weekKey, e) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const grouped = weekKey === 'prevWeek' ? orderedThis : orderedNext;
    const ids = grouped.map(([p]) => p);
    const newOrder = arrayMove(ids, ids.indexOf(active.id), ids.indexOf(over.id));
    if (weekKey === 'prevWeek') setThisOrder(newOrder);
    else setNextOrder(newOrder);
  }

  const getTaskList = useCallback((weekKey, project, category) => {
    const key = `${project}__${category}`;
    const base = weekKey === 'prevWeek' ? baseThis : baseNext;
    return edits[weekKey]?.[key] ?? base.find(([p])=>p===project)?.[1]?.[category] ?? [];
  }, [baseThis, baseNext, edits]);

  const handleEdit = useCallback((weekKey, project, category, taskIdx, newVal) => {
    const key = `${project}__${category}`;
    setEdits(prev => {
      const cur = getTaskList(weekKey, project, category);
      const upd = [...cur]; upd[taskIdx] = newVal;
      return { ...prev, [weekKey]: { ...prev[weekKey], [key]: upd } };
    });
  }, [getTaskList]);

  const handleDeleteTask = useCallback((weekKey, project, category, taskIdx) => {
    const key = `${project}__${category}`;
    setEdits(prev => {
      const cur = getTaskList(weekKey, project, category);
      return { ...prev, [weekKey]: { ...prev[weekKey], [key]: cur.filter((_,i)=>i!==taskIdx) } };
    });
  }, [getTaskList]);

  const handleAddTask = useCallback((weekKey, project, category) => {
    const key = `${project}__${category}`;
    setEdits(prev => {
      const cur = getTaskList(weekKey, project, category);
      return { ...prev, [weekKey]: { ...prev[weekKey], [key]: [...cur, ''] } };
    });
  }, [getTaskList]);

  function getCatOrder(weekKey, project) {
    return catOrders[`${weekKey}__${project}`] || Object.keys(
      (weekKey === 'prevWeek' ? thisWeekGrouped : nextWeekGrouped).find(([p])=>p===project)?.[1] || {}
    );
  }
  function setCatOrder(weekKey, project, order) {
    setCatOrders(prev => ({ ...prev, [`${weekKey}__${project}`]: order }));
  }

  async function handleSync() {
    setSyncing(true);
    try { await triggerSync(); await refetch(); setEdits({}); } finally { setSyncing(false); }
  }
  async function handleCapture() {
    if (!captureRef.current) return;
    setCapturing(true);
    try {
      const canvas = await html2canvas(captureRef.current, { scale:2, useCORS:true, backgroundColor:'#ffffff', width:SLIDE_W, height:SLIDE_H });
      const link = document.createElement('a');
      link.download = `weekly_${data?.sheetName||'report'}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } finally { setCapturing(false); }
  }

  /* ─── 컬럼 렌더 헬퍼 ─── */
  function renderColumn({ grouped, order, weekKey, headerLabel, headerBg, openProject, setOpen }) {
    return (
      <div style={{ display:'flex', flexDirection:'column', overflow:'hidden', borderRight: weekKey==='prevWeek' ? '1px solid #e5e7eb' : 'none' }}>
        <div style={{ padding:'14px 24px 10px', background:headerBg, flexShrink:0 }}>
          <span style={{ fontSize:13, fontWeight:700, color:'white' }}>{headerLabel}</span>
        </div>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={e=>handleProjectDragEnd(weekKey,e)}>
          <SortableContext items={grouped.map(([p])=>p)} strategy={verticalListSortingStrategy}>
            <div style={{ flex:1, overflowY:'auto', padding:'12px 16px', display:'flex', flexDirection:'column', gap:6 }}>
              {grouped.map(([project, cats, total], idx) => (
                <SortableProjectAccordion
                  key={project}
                  project={project} cats={cats} total={total}
                  color={PROJECT_COLORS[idx % PROJECT_COLORS.length]}
                  isOpen={openProject === project}
                  onToggle={() => setOpen(openProject === project ? null : project)}
                  catOrder={getCatOrder(weekKey, project)}
                  onCatReorder={order => setCatOrder(weekKey, project, order)}
                  weekKey={weekKey}
                  sensors={sensors}
                  onEdit={handleEdit} onDeleteTask={handleDeleteTask} onAddTask={handleAddTask}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* 툴바 */}
      <div className="flex items-center justify-between px-6 py-3 bg-white border-b border-gray-200 shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-base font-bold text-gray-800">슬라이드 캡처 룸</h1>
          {data && <span className="text-sm text-gray-500 bg-gray-100 px-2.5 py-1 rounded-md font-medium">{data.sheetName}주차 · {data.members?.length}명</span>}
          <button onClick={handleSync} disabled={syncing||loading}
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-indigo-600 transition-colors disabled:opacity-50">
            <RefreshCw size={13} className={syncing?'animate-spin':''}/>
            {syncing?'동기화 중...':'시트 동기화'}
          </button>
          {Object.keys(edits).length > 0 && (
            <button onClick={()=>setEdits({})} className="flex items-center gap-1 text-xs text-orange-500 hover:text-orange-700">
              <RotateCcw size={12}/> 편집 초기화
            </button>
          )}
          <span className="text-xs text-gray-300">| ⠿ 드래그로 순서 변경 · 클릭으로 편집</span>
        </div>
        <button onClick={handleCapture} disabled={capturing||loading||!!error}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-md hover:bg-indigo-700 transition-colors disabled:opacity-60">
          <Camera size={15}/>
          {capturing?'캡처 중...':'슬라이드 캡처'}
        </button>
      </div>

      {/* 캔버스 */}
      <div className="flex-1 flex items-center justify-center p-6 overflow-hidden">
        {loading && <div className="flex flex-col items-center gap-3 text-gray-400"><Loader size={32} className="animate-spin"/><p className="text-sm">데이터 불러오는 중...</p></div>}
        {error && !loading && <div className="text-red-500 text-sm bg-red-50 px-4 py-3 rounded-lg border border-red-200">연결 오류: {error}</div>}
        {!loading && !error && data && (
          <ScaledSlide captureRef={captureRef}>
            <div style={{ flex:1, display:'grid', gridTemplateColumns:'1fr 1fr', overflow:'hidden', background:'white' }}>
              {renderColumn({ grouped:orderedThis, weekKey:'prevWeek', headerLabel:'지난 주 진행', headerBg:'#4f46e5', openProject:openThis, setOpen:setOpenThis })}
              {renderColumn({ grouped:orderedNext, weekKey:'thisWeek', headerLabel:'금주 계획', headerBg:'#0891b2', openProject:openNext, setOpen:setOpenNext })}
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
