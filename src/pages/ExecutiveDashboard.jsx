import { useState, useEffect, useRef, useCallback } from 'react';
import { X, ChevronRight, AlertTriangle, CheckCircle2, BarChart3, HelpCircle, GripVertical } from 'lucide-react';
import { useWeeklyData } from '../hooks/useWeeklyData';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

/* ─────────────────────────────────────────────
   진행 상태 설정 (임원용 용어)
───────────────────────────────────────────── */
const STATUS = {
  RED: {
    label: '위험',
    subLabel: '즉시 대응 필요',
    dot: '#ef4444',
    rowBgSolid: '#fff5f5',
    border: '#fecaca',
    textColor: '#b91c1c',
    badgeBg: '#fee2e2',
    order: 0,
  },
  AMBER: {
    label: '주의',
    subLabel: '모니터링 필요',
    dot: '#f59e0b',
    rowBgSolid: '#fffdf0',
    border: '#fde68a',
    textColor: '#92400e',
    badgeBg: '#fef3c7',
    order: 1,
  },
  GREEN: {
    label: '정상',
    subLabel: '순항 중',
    dot: '#22c55e',
    rowBgSolid: 'transparent',
    border: '#bbf7d0',
    textColor: '#15803d',
    badgeBg: '#dcfce7',
    order: 2,
  },
};

const STATUS_CYCLE = ['RED', 'AMBER', 'GREEN'];
const STORAGE_KEY = 'exec-dashboard-meta-v2';
const ORDER_KEY   = 'exec-dashboard-order';

function loadMeta()  { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch { return {}; } }
function saveMeta(m) { localStorage.setItem(STORAGE_KEY, JSON.stringify(m)); }
function loadOrder() { try { return JSON.parse(localStorage.getItem(ORDER_KEY) || 'null'); } catch { return null; } }
function saveOrder(o) { localStorage.setItem(ORDER_KEY, JSON.stringify(o)); }

/* ─────────────────────────────────────────────
   HTML 태그 제거
───────────────────────────────────────────── */
function stripHtml(html) {
  return (html || '').replace(/<[^>]+>/g, '').trim();
}

/* ─────────────────────────────────────────────
   핵심 성과 / 리스크 자동 추출
   ※ API 데이터에 status 필드 없음 → content만으로 추출
───────────────────────────────────────────── */
function autoExtractSummary(projectName, data) {
  if (!data?.members) return '';

  // 지난 주 업무에서 content가 있는 것들 → 성과
  const prevContents = data.members
    .flatMap(m => (m.prevWeek || []).filter(t => t.project === projectName))
    .map(t => stripHtml(t.content))
    .filter(Boolean);

  // 금주 계획에서 content가 있는 것들 → 금주 할 일
  const thisContents = data.members
    .flatMap(m => (m.thisWeek || []).filter(t => t.project === projectName))
    .map(t => stripHtml(t.content))
    .filter(Boolean);

  const parts = [];
  if (prevContents.length > 0) {
    parts.push('✅ ' + prevContents.slice(0, 2).join(' / '));
  }
  if (thisContents.length > 0) {
    parts.push('📌 ' + thisContents.slice(0, 1).join(' / '));
  }
  return parts.join('   ·   ');
}

/* ─────────────────────────────────────────────
   툴팁
───────────────────────────────────────────── */
function Tooltip({ text, children, position = 'bottom' }) {
  const [show, setShow] = useState(false);
  const posStyle = position === 'top'
    ? { bottom: 'calc(100% + 7px)', left: '50%', transform: 'translateX(-50%)' }
    : { top: 'calc(100% + 7px)', left: '50%', transform: 'translateX(-50%)' };
  return (
    <span
      style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && (
        <span style={{
          position: 'absolute', ...posStyle,
          background: '#1e293b', color: 'white',
          fontSize: 11, fontWeight: 500,
          padding: '6px 11px', borderRadius: 7,
          whiteSpace: 'nowrap', zIndex: 200,
          boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
          pointerEvents: 'none', lineHeight: 1.5,
        }}>
          {text}
        </span>
      )}
    </span>
  );
}

/* ─────────────────────────────────────────────
   인라인 편집
───────────────────────────────────────────── */
function InlineEdit({ value, onChange, placeholder = '클릭하여 입력', multiline = false, style = {} }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const ref = useRef(null);

  useEffect(() => { if (editing && ref.current) ref.current.focus(); }, [editing]);
  // value가 외부에서 바뀌면 draft 동기화
  useEffect(() => { if (!editing) setDraft(value); }, [value, editing]);

  function commit() { onChange(draft); setEditing(false); }

  if (editing) {
    const props = {
      ref, value: draft,
      onChange: e => setDraft(e.target.value),
      onBlur: commit,
      onKeyDown: e => {
        if (!multiline && e.key === 'Enter') commit();
        if (e.key === 'Escape') setEditing(false);
      },
      style: {
        width: '100%', border: '1.5px solid #6366f1', borderRadius: 6,
        padding: '4px 8px', outline: 'none', background: '#eef2ff',
        fontFamily: 'inherit', fontSize: 'inherit',
        resize: multiline ? 'vertical' : 'none', lineHeight: 1.55, ...style,
      },
    };
    return multiline ? <textarea rows={2} {...props} /> : <input {...props} />;
  }

  return (
    <span
      onClick={() => { setDraft(value); setEditing(true); }}
      title="클릭하여 편집"
      style={{
        cursor: 'text', display: 'block', minHeight: 22, borderRadius: 4,
        padding: '2px 5px', outline: '1.5px dashed transparent',
        transition: 'outline 0.15s, background 0.15s', ...style,
      }}
      onMouseEnter={e => { e.currentTarget.style.outline = '1.5px dashed #a5b4fc'; e.currentTarget.style.background = '#f5f3ff'; }}
      onMouseLeave={e => { e.currentTarget.style.outline = '1.5px dashed transparent'; e.currentTarget.style.background = 'transparent'; }}
    >
      {value || <span style={{ color: '#d1d5db', fontStyle: 'italic' }}>{placeholder}</span>}
    </span>
  );
}

/* ─────────────────────────────────────────────
   핵심 성과/리스크 셀
   - 자동 추출값 표시 → 클릭 시 바로 편집 진입
   - 수동 저장 후에는 수동 값 표시
───────────────────────────────────────────── */
function SummaryCell({ projectName, data, manualValue, onChange }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const ref = useRef(null);

  const autoSummary = autoExtractSummary(projectName, data);
  // 표시값: 수동 편집 우선, 없으면 자동 추출
  const displayValue = manualValue || autoSummary;
  const isAuto = !manualValue && Boolean(autoSummary);

  useEffect(() => { if (editing && ref.current) ref.current.focus(); }, [editing]);

  function startEdit() {
    setDraft(manualValue || autoSummary || '');
    setEditing(true);
  }
  function commit() {
    onChange(draft);
    setEditing(false);
  }

  if (editing) {
    return (
      <textarea
        ref={ref}
        rows={2}
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={e => { if (e.key === 'Escape') setEditing(false); }}
        style={{
          width: '100%', border: '1.5px solid #6366f1', borderRadius: 6,
          padding: '4px 8px', outline: 'none', background: '#eef2ff',
          fontFamily: 'inherit', fontSize: 13,
          resize: 'vertical', lineHeight: 1.55,
        }}
      />
    );
  }

  return (
    <span
      onClick={startEdit}
      title={isAuto ? '자동 추출 데이터 · 클릭하여 편집' : '클릭하여 편집'}
      style={{
        cursor: 'text', display: 'block', minHeight: 22, borderRadius: 4,
        fontSize: 13, lineHeight: 1.6, color: '#374151',
        padding: '2px 5px',
        outline: '1.5px dashed transparent',
        transition: 'outline 0.15s, background 0.15s',
        ...(isAuto ? { borderLeft: '2px solid #c7d2fe', paddingLeft: 8 } : {}),
      }}
      onMouseEnter={e => { e.currentTarget.style.outline = '1.5px dashed #a5b4fc'; e.currentTarget.style.background = '#f5f3ff'; }}
      onMouseLeave={e => { e.currentTarget.style.outline = '1.5px dashed transparent'; e.currentTarget.style.background = 'transparent'; }}
    >
      {displayValue || <span style={{ color: '#d1d5db', fontStyle: 'italic' }}>클릭하여 입력</span>}
    </span>
  );
}

/* ─────────────────────────────────────────────
   진행률 프로그레스바
───────────────────────────────────────────── */
function ProgressBar({ value, onChange }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value || 0));
  const ref = useRef(null);

  useEffect(() => { if (editing && ref.current) ref.current.focus(); }, [editing]);

  const pct = Math.min(100, Math.max(0, parseInt(value) || 0));
  const barColor = pct >= 80 ? '#22c55e' : pct >= 50 ? '#f59e0b' : '#ef4444';
  const textColor = pct >= 80 ? '#15803d' : pct >= 50 ? '#92400e' : '#b91c1c';

  function commit() {
    const v = Math.min(100, Math.max(0, parseInt(draft) || 0));
    onChange(v);
    setEditing(false);
  }

  if (editing) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        <input
          ref={ref}
          type="number" min="0" max="100"
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false); }}
          style={{
            width: 60, border: '1.5px solid #6366f1', borderRadius: 6,
            padding: '3px 8px', outline: 'none', background: '#eef2ff',
            fontSize: 13, fontWeight: 700, textAlign: 'center',
          }}
        />
        <span style={{ fontSize: 12, color: '#94a3b8' }}>%</span>
      </div>
    );
  }

  return (
    <Tooltip text="클릭하여 진행률 편집">
      <div
        style={{ cursor: 'pointer', minWidth: 110, width: '100%' }}
        onClick={() => { setDraft(String(pct)); setEditing(true); }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ flex: 1, height: 7, background: '#e2e8f0', borderRadius: 4, overflow: 'hidden', minWidth: 60 }}>
            <div style={{
              width: `${pct}%`, height: '100%',
              background: `linear-gradient(90deg, ${barColor}bb, ${barColor})`,
              borderRadius: 4,
              transition: 'width 0.45s cubic-bezier(0.4,0,0.2,1)',
            }} />
          </div>
          <span style={{ fontSize: 13, fontWeight: 800, color: textColor, minWidth: 34, textAlign: 'right' }}>
            {pct}%
          </span>
        </div>
      </div>
    </Tooltip>
  );
}

/* ─────────────────────────────────────────────
   진행 상태 배지
───────────────────────────────────────────── */
function StatusBadge({ status, onChange }) {
  const cfg = STATUS[status] || STATUS.GREEN;
  function cycle(e) {
    e.stopPropagation();
    const next = STATUS_CYCLE[(STATUS_CYCLE.indexOf(status) + 1) % STATUS_CYCLE.length];
    onChange(next);
  }
  return (
    <Tooltip text={`${cfg.subLabel} · 클릭하여 변경`}>
      <button
        onClick={cycle}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          background: cfg.badgeBg, border: `1.5px solid ${cfg.border}`,
          borderRadius: 20, padding: '4px 13px',
          cursor: 'pointer', whiteSpace: 'nowrap',
          boxShadow: `0 1px 4px ${cfg.dot}30`,
          transition: 'transform 0.12s',
        }}
        onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.05)'; }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
      >
        <span style={{
          width: 9, height: 9, borderRadius: '50%',
          background: cfg.dot, flexShrink: 0,
          boxShadow: `0 0 6px ${cfg.dot}80`,
        }} />
        <span style={{ fontSize: 12, fontWeight: 800, color: cfg.textColor }}>{cfg.label}</span>
      </button>
    </Tooltip>
  );
}

/* ─────────────────────────────────────────────
   컬럼 헤더
───────────────────────────────────────────── */
function ColHeader({ label, tip }) {
  return (
    <th style={{
      textAlign: 'left', padding: '9px 14px',
      fontSize: 12, fontWeight: 700, color: '#475569',
      letterSpacing: '0.03em', whiteSpace: 'nowrap', userSelect: 'none',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        {label}
        {tip && (
          <Tooltip text={tip} position="bottom">
            <HelpCircle size={12} style={{ color: '#cbd5e1', cursor: 'default', flexShrink: 0 }} />
          </Tooltip>
        )}
      </div>
    </th>
  );
}

/* ─────────────────────────────────────────────
   Section 헬퍼 (드로워용)
───────────────────────────────────────────── */
function Section({ title, color = '#4f46e5', children }) {
  return (
    <div style={{ marginBottom: 22 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <div style={{ width: 3, height: 16, borderRadius: 2, background: color, flexShrink: 0 }} />
        <span style={{ fontSize: 11, fontWeight: 800, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
          {title}
        </span>
      </div>
      {children}
    </div>
  );
}

/* ─────────────────────────────────────────────
   사이드 드로워
───────────────────────────────────────────── */
function SideDrawer({ project, meta, data, onClose, onMetaChange }) {
  const tasks = data?.members?.flatMap(m => [
    ...(m.prevWeek || []).filter(t => t.project === project.name).map(t => ({ ...t, week: '지난 주' })),
    ...(m.thisWeek || []).filter(t => t.project === project.name).map(t => ({ ...t, week: '금주' })),
  ]) || [];

  const prevTasks = tasks.filter(t => t.week === '지난 주');
  const thisTasks = tasks.filter(t => t.week === '금주');
  const cfg = STATUS[meta.ragStatus || 'GREEN'];

  const members = data?.members?.filter(m =>
    [...(m.prevWeek || []), ...(m.thisWeek || [])].some(t => t.project === project.name)
  ) || [];

  return (
    <>
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)',
        zIndex: 40, backdropFilter: 'blur(3px)', animation: 'fadeIn 0.2s ease',
      }} />
      <style>{`
        @keyframes fadeIn { from { opacity:0 } to { opacity:1 } }
        @keyframes slideInRight { from { transform:translateX(100%) } to { transform:translateX(0) } }
        .drawer-scroll::-webkit-scrollbar { width:4px }
        .drawer-scroll::-webkit-scrollbar-thumb { background:#e2e8f0; border-radius:4px }
      `}</style>
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: 500,
        background: 'white', zIndex: 50,
        boxShadow: '-8px 0 40px rgba(0,0,0,0.18)',
        display: 'flex', flexDirection: 'column',
        animation: 'slideInRight 0.28s cubic-bezier(0.22,1,0.36,1)',
      }}>
        <div style={{ height: 5, flexShrink: 0, background: `linear-gradient(90deg, ${cfg.dot}, ${cfg.dot}50)` }} />
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #f1f5f9', background: cfg.rowBgSolid || '#fafaf9', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
            <h2 style={{ fontSize: 20, fontWeight: 900, color: '#0f172a', margin: 0 }}>{project.name}</h2>
            <button onClick={onClose} style={{ background: '#f1f5f9', border: 'none', cursor: 'pointer', padding: 8, borderRadius: 8, color: '#64748b', display: 'flex' }}
              onMouseEnter={e => e.currentTarget.style.background = '#e2e8f0'}
              onMouseLeave={e => e.currentTarget.style.background = '#f1f5f9'}>
              <X size={18} />
            </button>
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <StatusBadge status={meta.ragStatus || 'GREEN'} onChange={s => onMetaChange('ragStatus', s)} />
            <div style={{ flex: 1, minWidth: 150 }}>
              <ProgressBar value={meta.progress || 0} onChange={v => onMetaChange('progress', v)} />
            </div>
          </div>
        </div>

        <div className="drawer-scroll" style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          <Section title="핵심 성과 / 리스크" color="#4f46e5">
            <div style={{ background: '#f8fafc', borderRadius: 8, padding: '10px 12px', border: '1px solid #e2e8f0' }}>
              <SummaryCell
                projectName={project.name}
                data={data}
                manualValue={meta.executiveSummary || ''}
                onChange={v => onMetaChange('executiveSummary', v)}
              />
            </div>
          </Section>

          <Section title="의사결정 필요사항" color="#ef4444">
            <div style={{ background: '#fff8f8', borderRadius: 8, padding: '10px 12px', border: '1px solid #fecaca' }}>
              <InlineEdit
                value={meta.helpNeeded || ''}
                onChange={v => onMetaChange('helpNeeded', v)}
                placeholder="임원 판단 또는 승인이 필요한 사항"
                multiline
                style={{ fontSize: 13, color: '#334155', lineHeight: 1.65 }}
              />
            </div>
          </Section>

          {members.length > 0 && (
            <Section title="투입 인력" color="#0891b2">
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {members.map(m => (
                  <div key={m.name} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 20, padding: '4px 12px' }}>
                    <span style={{ fontSize: 14 }}>{m.avatar || '👤'}</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#0369a1' }}>{m.name}</span>
                    <span style={{ fontSize: 10, color: '#94a3b8' }}>{m.part}</span>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {prevTasks.length > 0 && (
            <Section title="지난 주 진행 업무" color="#6b7280">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {prevTasks.map((t, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, padding: '6px 10px', background: '#f8fafc', borderRadius: 6, borderLeft: '3px solid #e2e8f0' }}>
                    {t.category && <span style={{ fontSize: 10, background: '#f1f5f9', color: '#64748b', padding: '1px 6px', borderRadius: 4, flexShrink: 0, alignSelf: 'flex-start', marginTop: 2 }}>{t.category}</span>}
                    <span style={{ fontSize: 12, color: '#374151', lineHeight: 1.55 }} dangerouslySetInnerHTML={{ __html: t.content }} />
                  </div>
                ))}
              </div>
            </Section>
          )}

          {thisTasks.length > 0 && (
            <Section title="금주 계획" color="#0891b2">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {thisTasks.map((t, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, padding: '6px 10px', background: '#f0f9ff', borderRadius: 6, borderLeft: '3px solid #bae6fd' }}>
                    {t.category && <span style={{ fontSize: 10, background: '#e0f2fe', color: '#0891b2', padding: '1px 6px', borderRadius: 4, flexShrink: 0, alignSelf: 'flex-start', marginTop: 2 }}>{t.category}</span>}
                    <span style={{ fontSize: 12, color: '#374151', lineHeight: 1.55 }} dangerouslySetInnerHTML={{ __html: t.content }} />
                  </div>
                ))}
              </div>
            </Section>
          )}
        </div>

        <div style={{ padding: '10px 24px', borderTop: '1px solid #f1f5f9', background: '#fafaf9', flexShrink: 0, display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ fontSize: 12, color: '#64748b', background: '#f1f5f9', border: 'none', borderRadius: 6, padding: '5px 14px', cursor: 'pointer' }}>닫기</button>
        </div>
      </div>
    </>
  );
}

/* ─────────────────────────────────────────────
   종합 현황 카드
───────────────────────────────────────────── */
function SummaryCard({ label, value, sub, color, bg, accent, icon: Icon }) {
  return (
    <div style={{ background: bg, border: `1.5px solid ${accent}40`, borderRadius: 12, padding: '14px 20px 12px', position: 'relative', overflow: 'hidden', boxShadow: `0 2px 10px ${accent}14` }}>
      <div style={{ position: 'absolute', right: -10, top: -10, width: 70, height: 70, borderRadius: '50%', background: `${accent}10` }} />
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', position: 'relative' }}>
        <div>
          <p style={{ fontSize: 12, fontWeight: 700, color: '#6b7280', marginBottom: 4, letterSpacing: '0.05em', textTransform: 'uppercase' }}>{label}</p>
          <p style={{ fontSize: 48, fontWeight: 900, color, lineHeight: 1, marginBottom: sub ? 5 : 0, letterSpacing: '-0.04em' }}>{value}</p>
          {sub && <p style={{ fontSize: 12, color: '#9ca3af', fontWeight: 500 }}>{sub}</p>}
        </div>
        {Icon && (
          <div style={{ width: 38, height: 38, borderRadius: 10, background: `${accent}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Icon size={20} color={color} strokeWidth={2.2} />
          </div>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   드래그 가능한 테이블 행
───────────────────────────────────────────── */
function SortableRow({ name, meta, data, cfg, isIssue, cats, onOpenDrawer, onUpdateMeta }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: name });

  return (
    <tr
      ref={setNodeRef}
      style={{
        background: cfg.rowBgSolid,
        borderBottom: '1px solid #f1f5f9',
        borderLeft: isIssue ? `3px solid ${cfg.dot}` : '3px solid transparent',
        transition: `${transition}, filter 0.1s`,
        opacity: isDragging ? 0.5 : 1,
      }}
    >
      {/* 드래그 핸들 + 프로젝트명 */}
      <td style={{ padding: '11px 8px 11px 14px', whiteSpace: 'nowrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div
            {...attributes} {...listeners}
            style={{ cursor: 'grab', color: '#d1d5db', display: 'flex', alignItems: 'center', touchAction: 'none', flexShrink: 0 }}
            onMouseEnter={e => e.currentTarget.style.color = '#94a3b8'}
            onMouseLeave={e => e.currentTarget.style.color = '#d1d5db'}
          >
            <GripVertical size={14} />
          </div>
          <button
            className="proj-link"
            onClick={() => onOpenDrawer(name)}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              color: '#1e40af', fontWeight: 800, fontSize: 14,
              background: 'none', border: 'none', cursor: 'pointer',
              padding: 0, textAlign: 'left', transition: 'color 0.12s',
            }}
          >
            {name}
            <ChevronRight size={13} style={{ opacity: 0.45, flexShrink: 0 }} />
          </button>
        </div>
      </td>

      {/* 카테고리 */}
      <td style={{ padding: '11px 14px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
          {cats.slice(0, 3).map(c => (
            <span key={c} style={{ fontSize: 11, background: '#f1f5f9', color: '#64748b', padding: '2px 7px', borderRadius: 4, fontWeight: 600 }}>
              {c}
            </span>
          ))}
        </div>
      </td>

      {/* 진행률 */}
      <td style={{ padding: '11px 14px', minWidth: 130 }}>
        <ProgressBar
          value={meta.progress || 0}
          onChange={v => onUpdateMeta(name, 'progress', v)}
        />
      </td>

      {/* 진행 상태 */}
      <td style={{ padding: '11px 14px', whiteSpace: 'nowrap' }}>
        <StatusBadge
          status={meta.ragStatus || 'GREEN'}
          onChange={s => onUpdateMeta(name, 'ragStatus', s)}
        />
      </td>

      {/* 핵심 성과 / 리스크 */}
      <td style={{ padding: '11px 14px' }}>
        <SummaryCell
          projectName={name}
          data={data}
          manualValue={meta.executiveSummary || ''}
          onChange={v => onUpdateMeta(name, 'executiveSummary', v)}
        />
      </td>

      {/* 의사결정 필요사항 */}
      <td style={{ padding: '11px 14px' }}>
        <InlineEdit
          value={meta.helpNeeded || ''}
          onChange={v => onUpdateMeta(name, 'helpNeeded', v)}
          placeholder="의사결정 필요사항"
          multiline
          style={{ fontSize: 13, color: '#374151', lineHeight: 1.55 }}
        />
      </td>
    </tr>
  );
}

/* ─────────────────────────────────────────────
   메인 컴포넌트
───────────────────────────────────────────── */
export default function ExecutiveDashboard() {
  const { data, loading, error } = useWeeklyData();
  const [meta, setMeta]     = useState(loadMeta);
  const [drawer, setDrawer] = useState(null);
  const [filter, setFilter] = useState('ALL');
  const [customOrder, setCustomOrder] = useState(loadOrder); // null or string[]

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const projects = data ? [...new Set(
    data.members.flatMap(m => [
      ...(m.prevWeek || []).map(t => t.project),
      ...(m.thisWeek || []).map(t => t.project),
    ]).filter(Boolean)
  )] : [];

  function updateMeta(project, field, value) {
    setMeta(prev => {
      const next = { ...prev, [project]: { ...prev[project], [field]: value } };
      saveMeta(next);
      return next;
    });
  }

  function getProjectMeta(name) {
    return meta[name] || { ragStatus: 'GREEN', progress: 0, executiveSummary: '', helpNeeded: '' };
  }

  // 기본 RAG 정렬 (customOrder 없을 때)
  const ragSorted = [...projects].sort((a, b) => {
    const ra = STATUS[getProjectMeta(a).ragStatus || 'GREEN'].order;
    const rb = STATUS[getProjectMeta(b).ragStatus || 'GREEN'].order;
    return ra - rb;
  });

  // customOrder 적용: 순서 저장된 게 있으면 사용, 없는 프로젝트는 끝에 추가
  const orderedProjects = customOrder
    ? [
        ...customOrder.filter(p => projects.includes(p)),
        ...projects.filter(p => !customOrder.includes(p)),
      ]
    : ragSorted;

  const filtered = filter === 'ALL' ? orderedProjects : orderedProjects.filter(p => getProjectMeta(p).ragStatus === filter);

  const total  = projects.length;
  const reds   = projects.filter(p => getProjectMeta(p).ragStatus === 'RED').length;
  const ambers = projects.filter(p => getProjectMeta(p).ragStatus === 'AMBER').length;
  const greens = projects.filter(p => getProjectMeta(p).ragStatus === 'GREEN').length;
  const issues = reds + ambers;

  const drawerProject = drawer ? projects.find(p => p === drawer) : null;
  const now = new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });

  function handleDragEnd(e) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const currentList = filtered;
    const oldIdx = currentList.indexOf(active.id);
    const newIdx = currentList.indexOf(over.id);
    const newFiltered = arrayMove(currentList, oldIdx, newIdx);

    // filtered에서 바뀐 순서를 전체 orderedProjects에 반영
    const otherProjects = orderedProjects.filter(p => !filtered.includes(p));
    const newOrder = filter === 'ALL'
      ? newFiltered
      : [...newFiltered, ...otherProjects];
    setCustomOrder(newOrder);
    saveOrder(newOrder);
  }

  function resetOrder() {
    setCustomOrder(null);
    localStorage.removeItem(ORDER_KEY);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#f8fafc', overflowY: 'auto' }}>
      <style>{`
        .exec-table tbody tr { transition: opacity 0.1s, filter 0.1s; }
        .exec-table tbody tr:hover { filter: brightness(0.97); }
        .proj-link:hover { color: #4f46e5 !important; }
        .status-filter-btn { transition: all 0.15s; }
        .status-filter-btn:hover { filter: brightness(0.94); transform: translateY(-1px); }
        .exec-scroll::-webkit-scrollbar { height: 4px; }
        .exec-scroll::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 4px; }
      `}</style>

      {/* ── 헤더 바 ── */}
      <div style={{ padding: '10px 20px', background: 'white', borderBottom: '1px solid #e2e8f0', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 32, height: 32, borderRadius: 10, background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px #4f46e540' }}>
            <BarChart3 size={16} color="white" strokeWidth={2.5} />
          </div>
          <div>
            <h1 style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>대시보드</h1>
            {data && <p style={{ fontSize: 12, color: '#94a3b8', margin: 0, marginTop: 1 }}>{data.sheetName}주차 · {now} 기준</p>}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {customOrder && (
            <Tooltip text="사용자 지정 순서를 초기화합니다">
              <button
                onClick={resetOrder}
                style={{ fontSize: 11, color: '#94a3b8', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 6, padding: '4px 10px', cursor: 'pointer' }}
              >
                순서 초기화
              </button>
            </Tooltip>
          )}
          {[
            { key: 'ALL',   label: '전체',          color: '#64748b', bg: '#f1f5f9', activeBg: '#1e293b', activeColor: 'white' },
            { key: 'RED',   label: `🔴 위험 (${reds})`,  color: '#b91c1c', bg: '#fee2e2', activeBg: '#ef4444', activeColor: 'white' },
            { key: 'AMBER', label: `🟡 주의 (${ambers})`, color: '#92400e', bg: '#fef3c7', activeBg: '#f59e0b', activeColor: 'white' },
            { key: 'GREEN', label: `🟢 정상 (${greens})`, color: '#15803d', bg: '#dcfce7', activeBg: '#22c55e', activeColor: 'white' },
          ].map(btn => (
            <button
              key={btn.key}
              className="status-filter-btn"
              onClick={() => setFilter(btn.key)}
              style={{
                fontSize: 12, fontWeight: 700, padding: '5px 14px', borderRadius: 20,
                border: 'none', cursor: 'pointer', letterSpacing: '0.02em',
                background: filter === btn.key ? btn.activeBg : btn.bg,
                color: filter === btn.key ? btn.activeColor : btn.color,
                boxShadow: filter === btn.key ? `0 2px 8px ${btn.activeBg}55` : 'none',
              }}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: 13 }}>
          <div style={{ textAlign: 'center' }}><div style={{ fontSize: 32, marginBottom: 8 }}>⟳</div>데이터 불러오는 중...</div>
        </div>
      )}
      {error && !loading && (
        <div style={{ margin: 24, color: '#ef4444', fontSize: 13, background: '#fef2f2', padding: '12px 16px', borderRadius: 10, border: '1px solid #fecaca' }}>
          연결 오류: {error}
        </div>
      )}

      {!loading && !error && data && (
        <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 12, width: '100%' }}>

          {/* ── 종합 현황 카드 ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            <SummaryCard label="전체 프로젝트" value={total} color="#4f46e5" bg="#eef2ff" accent="#4f46e5" icon={BarChart3} />
            <SummaryCard
              label="정상 순항" value={greens}
              sub={greens === total ? '전체 정상 운영 중' : `전체 ${total}건 중 ${greens}건`}
              color="#16a34a" bg="#f0fdf4" accent="#22c55e" icon={CheckCircle2}
            />
            <SummaryCard
              label="주의 / 위험" value={issues}
              sub={issues > 0 ? `🔴 위험 ${reds}건  ·  🟡 주의 ${ambers}건` : '이슈 없음 — 전체 순항 중'}
              color={issues > 0 ? '#dc2626' : '#16a34a'}
              bg={issues > 0 ? '#fef2f2' : '#f0fdf4'}
              accent={issues > 0 ? '#ef4444' : '#22c55e'}
              icon={issues > 0 ? AlertTriangle : CheckCircle2}
            />
          </div>

          {/* ── 마스터 테이블 ── */}
          <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
            <div style={{ padding: '10px 16px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h2 style={{ fontSize: 15, fontWeight: 800, color: '#0f172a', margin: 0 }}>프로젝트 진행 현황</h2>
                <Tooltip text="행 왼쪽 ⠿ 핸들을 드래그하여 순서 변경">
                  <span style={{ fontSize: 11, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 3 }}>
                    <GripVertical size={12} style={{ color: '#cbd5e1' }} /> 드래그로 순서 변경
                  </span>
                </Tooltip>
              </div>
              <span style={{ fontSize: 12, color: '#94a3b8', background: '#f8fafc', padding: '3px 10px', borderRadius: 6, border: '1px solid #e2e8f0' }}>
                총 {filtered.length}건
              </span>
            </div>

            <div className="exec-scroll" style={{ overflowX: 'auto' }}>
              <table className="exec-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                    <ColHeader label="프로젝트명"         tip="클릭하면 상세 내용을 볼 수 있습니다" />
                    <ColHeader label="카테고리" />
                    <ColHeader label="진행률"             tip="클릭하여 % 직접 입력 가능" />
                    <ColHeader label="진행 상태"          tip="정상: 순항 중 / 주의: 모니터링 필요 / 위험: 즉시 대응 필요 · 클릭하여 변경" />
                    <ColHeader label="핵심 성과 / 리스크"  tip="지난 주 업무 기반 자동 추출 · 클릭하여 직접 편집 가능" />
                    <ColHeader label="의사결정 필요사항"   tip="임원 판단이 필요한 사항 · 클릭하여 편집" />
                  </tr>
                </thead>
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <SortableContext items={filtered} strategy={verticalListSortingStrategy}>
                    <tbody>
                      {filtered.map(name => {
                        const m      = getProjectMeta(name);
                        const cfg    = STATUS[m.ragStatus || 'GREEN'];
                        const isIssue = m.ragStatus === 'RED' || m.ragStatus === 'AMBER';
                        const cats   = [...new Set(data.members.flatMap(member => [
                          ...(member.prevWeek || []).filter(t => t.project === name).map(t => t.category),
                          ...(member.thisWeek || []).filter(t => t.project === name).map(t => t.category),
                        ]).filter(Boolean))];

                        return (
                          <SortableRow
                            key={name}
                            name={name}
                            meta={m}
                            data={data}
                            cfg={cfg}
                            isIssue={isIssue}
                            cats={cats}
                            onOpenDrawer={setDrawer}
                            onUpdateMeta={updateMeta}
                          />
                        );
                      })}

                      {filtered.length === 0 && (
                        <tr>
                          <td colSpan={6} style={{ textAlign: 'center', padding: '32px', color: '#94a3b8', fontSize: 14 }}>
                            해당 상태의 프로젝트가 없습니다.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </SortableContext>
                </DndContext>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 사이드 드로워 */}
      {drawerProject && (
        <SideDrawer
          project={{ name: drawerProject }}
          meta={getProjectMeta(drawerProject)}
          data={data}
          onClose={() => setDrawer(null)}
          onMetaChange={(field, value) => updateMeta(drawerProject, field, value)}
        />
      )}
    </div>
  );
}
