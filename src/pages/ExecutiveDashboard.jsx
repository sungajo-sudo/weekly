import { useState, useEffect, useRef } from 'react';
import { X, ChevronRight, ChevronDown, AlertTriangle, CheckCircle2, Clock, BarChart3 } from 'lucide-react';
import { useWeeklyData } from '../hooks/useWeeklyData';

/* ─────────────────────────────────────────────
   RAG 설정
───────────────────────────────────────────── */
const RAG = {
  RED:   {
    label: 'Red',
    emoji: '🔴',
    dot: '#ef4444',
    bg: '#fef2f2',
    rowBg: 'linear-gradient(90deg,#fff5f5 0%,#fff 60%)',
    rowBgSolid: '#fff5f5',
    border: '#fecaca',
    textColor: '#b91c1c',
    badgeBg: '#fee2e2',
    order: 0,
  },
  AMBER: {
    label: 'Amber',
    emoji: '🟡',
    dot: '#f59e0b',
    bg: '#fffbeb',
    rowBg: 'linear-gradient(90deg,#fffdf0 0%,#fff 60%)',
    rowBgSolid: '#fffdf0',
    border: '#fde68a',
    textColor: '#92400e',
    badgeBg: '#fef3c7',
    order: 1,
  },
  GREEN: {
    label: 'Green',
    emoji: '🟢',
    dot: '#22c55e',
    bg: '#f0fdf4',
    rowBg: 'transparent',
    rowBgSolid: 'transparent',
    border: '#bbf7d0',
    textColor: '#15803d',
    badgeBg: '#dcfce7',
    order: 2,
  },
};

const RAG_CYCLE = ['RED', 'AMBER', 'GREEN'];
const STORAGE_KEY = 'exec-dashboard-meta-v2';

function loadMeta() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch { return {}; }
}
function saveMeta(m) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(m));
}

/* ─────────────────────────────────────────────
   인라인 편집 셀
───────────────────────────────────────────── */
function InlineEdit({ value, onChange, placeholder = '클릭하여 입력', multiline = false, style = {} }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const ref = useRef(null);

  useEffect(() => { if (editing && ref.current) ref.current.focus(); }, [editing]);

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
   RAG 배지 (클릭으로 순환)
───────────────────────────────────────────── */
function RagBadge({ status, onChange, size = 'md' }) {
  const cfg = RAG[status] || RAG.GREEN;
  function cycle(e) {
    e.stopPropagation();
    const next = RAG_CYCLE[(RAG_CYCLE.indexOf(status) + 1) % RAG_CYCLE.length];
    onChange(next);
  }
  const isLg = size === 'lg';
  return (
    <button
      onClick={cycle}
      title="클릭하여 상태 변경"
      style={{
        display: 'inline-flex', alignItems: 'center', gap: isLg ? 8 : 5,
        background: cfg.badgeBg, border: `1.5px solid ${cfg.border}`,
        borderRadius: 20, padding: isLg ? '5px 14px' : '3px 10px',
        cursor: 'pointer', whiteSpace: 'nowrap',
        boxShadow: `0 1px 3px ${cfg.dot}25`,
        transition: 'transform 0.12s, box-shadow 0.12s',
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.05)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
    >
      <span style={{
        width: isLg ? 12 : 9, height: isLg ? 12 : 9, borderRadius: '50%',
        background: cfg.dot, flexShrink: 0,
        boxShadow: `0 0 6px ${cfg.dot}80`,
      }} />
      <span style={{ fontSize: isLg ? 13 : 11, fontWeight: 800, color: cfg.textColor, letterSpacing: '0.02em' }}>
        {cfg.label}
      </span>
    </button>
  );
}

/* ─────────────────────────────────────────────
   Section helper
───────────────────────────────────────────── */
function Section({ title, color = '#4f46e5', children, icon }) {
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
    ...m.prevWeek.filter(t => t.project === project.name).map(t => ({ ...t, week: '지난 주' })),
    ...m.thisWeek.filter(t => t.project === project.name).map(t => ({ ...t, week: '금주' })),
  ]) || [];

  const prevTasks = tasks.filter(t => t.week === '지난 주');
  const thisTasks = tasks.filter(t => t.week === '금주');
  const cfg = RAG[meta.ragStatus || 'GREEN'];

  const members = data?.members?.filter(m =>
    [...m.prevWeek, ...m.thisWeek].some(t => t.project === project.name)
  ) || [];

  return (
    <>
      {/* 오버레이 */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)',
          zIndex: 40, backdropFilter: 'blur(3px)',
          animation: 'fadeIn 0.2s ease',
        }}
      />
      <style>{`
        @keyframes fadeIn { from { opacity:0 } to { opacity:1 } }
        @keyframes slideInRight { from { transform:translateX(100%) } to { transform:translateX(0) } }
        .drawer-scroll::-webkit-scrollbar { width:4px }
        .drawer-scroll::-webkit-scrollbar-track { background:transparent }
        .drawer-scroll::-webkit-scrollbar-thumb { background:#e2e8f0; border-radius:4px }
        .drawer-scroll::-webkit-scrollbar-thumb:hover { background:#cbd5e1 }
      `}</style>

      {/* 드로워 패널 */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: 500,
        background: 'white', zIndex: 50,
        boxShadow: '-8px 0 40px rgba(0,0,0,0.18)',
        display: 'flex', flexDirection: 'column',
        animation: 'slideInRight 0.28s cubic-bezier(0.22,1,0.36,1)',
      }}>
        {/* 헤더 스트립 */}
        <div style={{
          height: 5, flexShrink: 0,
          background: `linear-gradient(90deg, ${cfg.dot}, ${cfg.dot}60)`,
        }} />

        {/* 헤더 */}
        <div style={{
          padding: '20px 24px 16px',
          borderBottom: '1px solid #f1f5f9',
          background: cfg.rowBgSolid || '#fafaf9',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 900, color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>
                {project.name}
              </h2>
              {meta.updatedAt && (
                <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 3 }}>
                  업데이트: {meta.updatedAt}
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              style={{
                background: '#f1f5f9', border: 'none', cursor: 'pointer',
                padding: 8, borderRadius: 8, color: '#64748b',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#e2e8f0'}
              onMouseLeave={e => e.currentTarget.style.background = '#f1f5f9'}
            >
              <X size={18} />
            </button>
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <RagBadge status={meta.ragStatus || 'GREEN'} onChange={s => onMetaChange('ragStatus', s)} size="lg" />
            <InlineEdit
              value={meta.currentPhase || ''}
              onChange={v => onMetaChange('currentPhase', v)}
              placeholder="현재 단계 입력"
              style={{
                fontSize: 12, color: '#475569', background: 'white',
                borderRadius: 6, padding: '3px 10px',
                border: '1px solid #e2e8f0',
              }}
            />
          </div>
        </div>

        {/* 스크롤 본문 */}
        <div className="drawer-scroll" style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          <Section title="핵심 성과 / 리스크" color="#4f46e5">
            <div style={{
              background: '#f8fafc', borderRadius: 8, padding: '10px 12px',
              border: '1px solid #e2e8f0',
            }}>
              <InlineEdit
                value={meta.executiveSummary || ''}
                onChange={v => onMetaChange('executiveSummary', v)}
                placeholder="핵심 성과 또는 리스크 요약 입력"
                multiline
                style={{ fontSize: 13, color: '#334155', lineHeight: 1.65 }}
              />
            </div>
          </Section>

          <Section title="의사결정 필요사항" color="#ef4444">
            <div style={{
              background: '#fff8f8', borderRadius: 8, padding: '10px 12px',
              border: '1px solid #fecaca',
            }}>
              <InlineEdit
                value={meta.helpNeeded || ''}
                onChange={v => onMetaChange('helpNeeded', v)}
                placeholder="임원 판단 또는 승인이 필요한 사항 입력"
                multiline
                style={{ fontSize: 13, color: '#334155', lineHeight: 1.65 }}
              />
            </div>
          </Section>

          {members.length > 0 && (
            <Section title="투입 인력" color="#0891b2">
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {members.map(m => (
                  <div key={m.name} style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    background: '#f0f9ff', border: '1px solid #bae6fd',
                    borderRadius: 20, padding: '4px 12px',
                  }}>
                    <span style={{ fontSize: 14 }}>{m.avatar || '👤'}</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#0369a1' }}>
                      {m.name}
                    </span>
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
                  <div key={i} style={{
                    display: 'flex', gap: 8, padding: '6px 10px',
                    background: '#f8fafc', borderRadius: 6,
                    borderLeft: '3px solid #e2e8f0',
                  }}>
                    {t.category && (
                      <span style={{
                        fontSize: 10, background: '#f1f5f9', color: '#64748b',
                        padding: '1px 6px', borderRadius: 4, flexShrink: 0,
                        alignSelf: 'flex-start', marginTop: 2,
                      }}>
                        {t.category}
                      </span>
                    )}
                    <span
                      style={{ fontSize: 12, color: '#374151', lineHeight: 1.55 }}
                      dangerouslySetInnerHTML={{ __html: t.content }}
                    />
                  </div>
                ))}
              </div>
            </Section>
          )}

          {thisTasks.length > 0 && (
            <Section title="금주 계획" color="#0891b2">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {thisTasks.map((t, i) => (
                  <div key={i} style={{
                    display: 'flex', gap: 8, padding: '6px 10px',
                    background: '#f0f9ff', borderRadius: 6,
                    borderLeft: '3px solid #bae6fd',
                  }}>
                    {t.category && (
                      <span style={{
                        fontSize: 10, background: '#e0f2fe', color: '#0891b2',
                        padding: '1px 6px', borderRadius: 4, flexShrink: 0,
                        alignSelf: 'flex-start', marginTop: 2,
                      }}>
                        {t.category}
                      </span>
                    )}
                    <span
                      style={{ fontSize: 12, color: '#374151', lineHeight: 1.55 }}
                      dangerouslySetInnerHTML={{ __html: t.content }}
                    />
                  </div>
                ))}
              </div>
            </Section>
          )}
        </div>

        {/* 하단 힌트 */}
        <div style={{
          padding: '10px 24px', borderTop: '1px solid #f1f5f9',
          background: '#fafaf9', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span style={{ fontSize: 11, color: '#94a3b8' }}>
            RAG 배지 클릭 → 상태 변경 · 텍스트 클릭 → 편집 (자동 저장)
          </span>
          <button
            onClick={onClose}
            style={{
              fontSize: 12, color: '#64748b', background: '#f1f5f9',
              border: 'none', borderRadius: 6, padding: '4px 12px',
              cursor: 'pointer',
            }}
          >
            닫기
          </button>
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
    <div style={{
      background: bg,
      border: `1.5px solid ${accent}40`,
      borderRadius: 12,
      padding: '14px 20px 12px',
      position: 'relative',
      overflow: 'hidden',
      boxShadow: `0 2px 10px ${accent}14`,
    }}>
      {/* 배경 장식 */}
      <div style={{
        position: 'absolute', right: -10, top: -10,
        width: 70, height: 70, borderRadius: '50%',
        background: `${accent}10`,
      }} />

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', position: 'relative' }}>
        <div>
          <p style={{ fontSize: 12, fontWeight: 700, color: '#6b7280', marginBottom: 4, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            {label}
          </p>
          <p style={{
            fontSize: 48, fontWeight: 900, color,
            lineHeight: 1, marginBottom: sub ? 5 : 0,
            letterSpacing: '-0.04em',
          }}>
            {value}
          </p>
          {sub && (
            <p style={{ fontSize: 12, color: '#9ca3af', fontWeight: 500 }}>{sub}</p>
          )}
        </div>
        {Icon && (
          <div style={{
            width: 38, height: 38, borderRadius: 10, background: `${accent}18`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <Icon size={20} color={color} strokeWidth={2.2} />
          </div>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   메인 컴포넌트
───────────────────────────────────────────── */
export default function ExecutiveDashboard() {
  const { data, loading, error } = useWeeklyData();
  const [meta, setMeta]   = useState(loadMeta);
  const [drawer, setDrawer] = useState(null);
  const [filterRag, setFilterRag] = useState('ALL'); // ALL | RED | AMBER | GREEN

  // 프로젝트 목록 추출
  const projects = data ? [...new Set(
    data.members.flatMap(m => [
      ...m.prevWeek.map(t => t.project),
      ...m.thisWeek.map(t => t.project),
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
    return meta[name] || { ragStatus: 'GREEN', currentPhase: '', executiveSummary: '', helpNeeded: '' };
  }

  // RAG 순 정렬
  const sorted = [...projects].sort((a, b) => {
    const ra = RAG[getProjectMeta(a).ragStatus || 'GREEN'].order;
    const rb = RAG[getProjectMeta(b).ragStatus || 'GREEN'].order;
    return ra - rb;
  });

  const filtered = filterRag === 'ALL' ? sorted : sorted.filter(p => getProjectMeta(p).ragStatus === filterRag);

  const total  = sorted.length;
  const reds   = sorted.filter(p => getProjectMeta(p).ragStatus === 'RED').length;
  const ambers = sorted.filter(p => getProjectMeta(p).ragStatus === 'AMBER').length;
  const greens = sorted.filter(p => getProjectMeta(p).ragStatus === 'GREEN').length;
  const issues = reds + ambers;

  const drawerProject = drawer ? sorted.find(p => p === drawer) : null;
  const now = new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#f8fafc', overflowY: 'auto' }}>
      <style>{`
        .exec-table tbody tr:hover { filter: brightness(0.97); }
        .proj-link { transition: color 0.12s; }
        .proj-link:hover { color: #4f46e5 !important; }
        .rag-filter-btn { transition: all 0.15s; }
        .rag-filter-btn:hover { filter: brightness(0.95); transform: translateY(-1px); }
        .exec-scroll::-webkit-scrollbar { height: 4px; }
        .exec-scroll::-webkit-scrollbar-track { background: transparent; }
        .exec-scroll::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 4px; }
      `}</style>

      {/* ── 헤더 바 ── */}
      <div style={{
        padding: '10px 20px',
        background: 'white',
        borderBottom: '1px solid #e2e8f0',
        flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 10,
            background: 'linear-gradient(135deg,#4f46e5,#7c3aed)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 8px #4f46e540',
          }}>
            <BarChart3 size={16} color="white" strokeWidth={2.5} />
          </div>
          <div>
            <h1 style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>
              대시보드
            </h1>
            {data && (
              <p style={{ fontSize: 12, color: '#94a3b8', margin: 0, marginTop: 1 }}>
                {data.sheetName}주차 · {now} 기준
              </p>
            )}
          </div>
        </div>

        {/* RAG 필터 버튼 */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {[
            { key: 'ALL', label: '전체', color: '#64748b', bg: '#f1f5f9', activeBg: '#1e293b', activeColor: 'white' },
            { key: 'RED', label: `🔴 Red (${reds})`, color: '#b91c1c', bg: '#fee2e2', activeBg: '#ef4444', activeColor: 'white' },
            { key: 'AMBER', label: `🟡 Amber (${ambers})`, color: '#92400e', bg: '#fef3c7', activeBg: '#f59e0b', activeColor: 'white' },
            { key: 'GREEN', label: `🟢 Green (${greens})`, color: '#15803d', bg: '#dcfce7', activeBg: '#22c55e', activeColor: 'white' },
          ].map(btn => (
            <button
              key={btn.key}
              className="rag-filter-btn"
              onClick={() => setFilterRag(btn.key)}
              style={{
                fontSize: 12, fontWeight: 700, padding: '5px 14px', borderRadius: 20,
                border: 'none', cursor: 'pointer', letterSpacing: '0.02em',
                background: filterRag === btn.key ? btn.activeBg : btn.bg,
                color: filterRag === btn.key ? btn.activeColor : btn.color,
                boxShadow: filterRag === btn.key ? `0 2px 8px ${btn.activeBg}50` : 'none',
              }}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      {/* 로딩 / 에러 */}
      {loading && (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: 13 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 8, animation: 'spin 1s linear infinite' }}>⟳</div>
            데이터 불러오는 중...
          </div>
        </div>
      )}
      {error && !loading && (
        <div style={{ margin: 24, color: '#ef4444', fontSize: 13, background: '#fef2f2', padding: '12px 16px', borderRadius: 10, border: '1px solid #fecaca' }}>
          연결 오류: {error}
        </div>
      )}

      {!loading && !error && data && (
        <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 12, width: '100%' }}>

          {/* ── 종합 현황 메트릭 카드 3개 ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            <SummaryCard
              label="전체 프로젝트"
              value={total}
              color="#4f46e5"
              bg="#eef2ff"
              accent="#4f46e5"
              icon={BarChart3}
            />
            <SummaryCard
              label="정상 순항 🟢"
              value={greens}
              sub={greens === total ? '전체 정상 운영 중' : `전체 ${total}건 중 ${greens}건`}
              color="#16a34a"
              bg="#f0fdf4"
              accent="#22c55e"
              icon={CheckCircle2}
            />
            <SummaryCard
              label="이슈 / 지연 ⚠️"
              value={issues}
              sub={issues > 0 ? `🔴 Red ${reds}건  ·  🟡 Amber ${ambers}건` : '이슈 없음 — 순항 중'}
              color={issues > 0 ? '#dc2626' : '#16a34a'}
              bg={issues > 0 ? '#fef2f2' : '#f0fdf4'}
              accent={issues > 0 ? '#ef4444' : '#22c55e'}
              icon={issues > 0 ? AlertTriangle : CheckCircle2}
            />
          </div>

          {/* ── RAG 마스터 테이블 ── */}
          <div style={{
            background: 'white', borderRadius: 12,
            border: '1px solid #e2e8f0',
            boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
            overflow: 'hidden',
          }}>
            {/* 테이블 헤더 */}
            <div style={{
              padding: '10px 16px',
              borderBottom: '1px solid #f1f5f9',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div>
                <h2 style={{ fontSize: 15, fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '-0.01em' }}>
                  프로젝트 RAG 현황
                </h2>
                <p style={{ fontSize: 12, color: '#94a3b8', margin: 0, marginTop: 1 }}>
                  🔴 Red → 🟡 Amber → 🟢 Green 순 정렬 · 프로젝트명 클릭 → 상세 드로워
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{
                  fontSize: 12, color: '#94a3b8',
                  background: '#f8fafc', padding: '3px 10px',
                  borderRadius: 6, border: '1px solid #e2e8f0',
                }}>
                  총 {filtered.length}건
                </span>
              </div>
            </div>

            {/* 테이블 */}
            <div className="exec-scroll" style={{ overflowX: 'auto' }}>
              <table className="exec-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                    {[
                      { label: '프로젝트명' },
                      { label: '카테고리' },
                      { label: '현재 단계' },
                      { label: 'RAG 상태' },
                      { label: '이번 주 핵심 성과 / 리스크' },
                      { label: '비고 (의사결정 필요사항)' },
                    ].map(col => (
                      <th key={col.label} style={{
                        textAlign: 'left', padding: '9px 14px',
                        fontSize: 12, fontWeight: 700, color: '#475569',
                        letterSpacing: '0.03em', textTransform: 'uppercase',
                        whiteSpace: 'nowrap',
                      }}>
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((name, idx) => {
                    const m   = getProjectMeta(name);
                    const cfg = RAG[m.ragStatus || 'GREEN'];
                    const isIssue = m.ragStatus === 'RED' || m.ragStatus === 'AMBER';

                    const cats = [...new Set(data.members.flatMap(member => [
                      ...member.prevWeek.filter(t => t.project === name).map(t => t.category),
                      ...member.thisWeek.filter(t => t.project === name).map(t => t.category),
                    ]).filter(Boolean))];

                    return (
                      <tr
                        key={name}
                        style={{
                          background: cfg.rowBgSolid,
                          borderBottom: '1px solid #f1f5f9',
                          borderLeft: isIssue ? `3px solid ${cfg.dot}` : '3px solid transparent',
                          transition: 'filter 0.12s',
                        }}
                      >
                        {/* 프로젝트명 */}
                        <td style={{ padding: '11px 14px', whiteSpace: 'nowrap' }}>
                          <button
                            className="proj-link"
                            onClick={() => setDrawer(name)}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 5,
                              color: '#1e40af', fontWeight: 800, fontSize: 14,
                              background: 'none', border: 'none', cursor: 'pointer',
                              padding: 0, textAlign: 'left',
                            }}
                          >
                            {name}
                            <ChevronRight size={13} style={{ opacity: 0.5, flexShrink: 0 }} />
                          </button>
                        </td>

                        {/* 카테고리 */}
                        <td style={{ padding: '11px 14px' }}>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                            {cats.slice(0, 3).map(c => (
                              <span key={c} style={{
                                fontSize: 11, background: '#f1f5f9', color: '#64748b',
                                padding: '2px 7px', borderRadius: 4, fontWeight: 600,
                              }}>
                                {c}
                              </span>
                            ))}
                          </div>
                        </td>

                        {/* 현재 단계 */}
                        <td style={{ padding: '11px 14px' }}>
                          <InlineEdit
                            value={m.currentPhase || ''}
                            onChange={v => updateMeta(name, 'currentPhase', v)}
                            placeholder="단계 입력"
                            style={{ fontSize: 13, color: '#374151' }}
                          />
                        </td>

                        {/* RAG 상태 */}
                        <td style={{ padding: '11px 14px', whiteSpace: 'nowrap' }}>
                          <RagBadge
                            status={m.ragStatus || 'GREEN'}
                            onChange={s => updateMeta(name, 'ragStatus', s)}
                          />
                        </td>

                        {/* 핵심 성과 / 리스크 */}
                        <td style={{ padding: '11px 14px' }}>
                          <InlineEdit
                            value={m.executiveSummary || ''}
                            onChange={v => updateMeta(name, 'executiveSummary', v)}
                            placeholder="핵심 성과 또는 리스크 요약"
                            multiline
                            style={{ fontSize: 13, color: '#374151', lineHeight: 1.55 }}
                          />
                        </td>

                        {/* 비고 */}
                        <td style={{ padding: '11px 14px' }}>
                          <InlineEdit
                            value={m.helpNeeded || ''}
                            onChange={v => updateMeta(name, 'helpNeeded', v)}
                            placeholder="의사결정 필요사항"
                            multiline
                            style={{ fontSize: 13, color: '#374151', lineHeight: 1.55 }}
                          />
                        </td>
                      </tr>
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
              </table>
            </div>
          </div>

          {/* ── 하단 안내 ── */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20,
            paddingBottom: 4,
          }}>
            {[
              { icon: '👆', text: '프로젝트명 클릭 → 상세 드로워 열기' },
              { icon: '🔄', text: 'RAG 배지 클릭 → 상태 순환' },
              { icon: '✏️', text: '셀 클릭 → 인라인 편집' },
              { icon: '💾', text: '자동 저장' },
            ].map(item => (
              <span key={item.text} style={{
                fontSize: 12, color: '#94a3b8',
                display: 'flex', alignItems: 'center', gap: 4,
              }}>
                {item.icon} {item.text}
              </span>
            ))}
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
