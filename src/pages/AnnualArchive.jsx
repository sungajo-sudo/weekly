import { useState, useMemo } from 'react';
import { ChevronDown, Archive, Save, Trash2, ChevronRight, Users, User, Calendar, Loader, FolderOpen, PlusCircle, X } from 'lucide-react';
import { useWeeklyData } from '../hooks/useWeeklyData';

/* ─────────────────────────────────────────────
   로컬스토리지 유틸
───────────────────────────────────────────── */
const ARCHIVE_KEY = 'annual-archive-v1';

function loadArchive() {
  try { return JSON.parse(localStorage.getItem(ARCHIVE_KEY) || '[]'); } catch { return []; }
}
function saveArchive(data) { localStorage.setItem(ARCHIVE_KEY, JSON.stringify(data)); }

/* ─────────────────────────────────────────────
   필터 드롭다운
───────────────────────────────────────────── */
function Filter({ label, value, onChange, options }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <span style={{ fontSize: 13, color: '#6b7280', fontWeight: 600 }}>{label}</span>
      <div style={{ position: 'relative' }}>
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          style={{
            appearance: 'none', paddingLeft: 10, paddingRight: 26, paddingTop: 5, paddingBottom: 5,
            fontSize: 13, border: '1px solid #e2e8f0', borderRadius: 7, background: 'white',
            color: '#374151', cursor: 'pointer', outline: 'none', fontWeight: 600,
          }}
        >
          {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <ChevronDown size={12} style={{ position: 'absolute', right: 7, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', pointerEvents: 'none' }} />
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   아카이브 항목 카드 (저장된 기록 보기)
───────────────────────────────────────────── */
function ArchiveCard({ entry, onDelete }) {
  const [open, setOpen] = useState(false);
  const isTeam = entry.type === 'team';

  return (
    <div style={{
      background: 'white', borderRadius: 12, border: '1px solid #e2e8f0',
      boxShadow: '0 2px 8px rgba(0,0,0,0.04)', overflow: 'hidden',
      transition: 'box-shadow 0.2s',
    }}>
      {/* 헤더 */}
      <div
        onClick={() => setOpen(v => !v)}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 18px', cursor: 'pointer',
          background: open ? '#f8fafc' : 'white',
          borderBottom: open ? '1px solid #f1f5f9' : 'none',
          transition: 'background 0.15s',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 10,
            background: isTeam ? 'linear-gradient(135deg,#4f46e5,#7c3aed)' : 'linear-gradient(135deg,#0891b2,#06b6d4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            {isTeam ? <Users size={16} color="white" /> : <User size={16} color="white" />}
          </div>
          <div>
            <p style={{ fontSize: 15, fontWeight: 800, color: '#0f172a', margin: 0 }}>
              {isTeam ? '팀 전체' : entry.memberName}
              <span style={{ fontSize: 13, fontWeight: 600, color: '#6366f1', marginLeft: 8 }}>
                {entry.year}년 {entry.weekCode ? `${entry.weekCode}주차` : '연간 아카이브'}
              </span>
            </p>
            <p style={{ fontSize: 12, color: '#9ca3af', margin: '2px 0 0', fontWeight: 500 }}>
              저장 일시: {new Date(entry.savedAt).toLocaleString('ko-KR')} · 업무 {entry.tasks?.length || 0}건
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={e => { e.stopPropagation(); onDelete(entry.id); }}
            style={{ border: 'none', background: '#fee2e2', color: '#ef4444', borderRadius: 7, padding: '5px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 700 }}
            onMouseEnter={e => e.currentTarget.style.background = '#fecaca'}
            onMouseLeave={e => e.currentTarget.style.background = '#fee2e2'}
          >
            <Trash2 size={12} /> 삭제
          </button>
          <ChevronRight size={18} color="#94a3b8" style={{ transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }} />
        </div>
      </div>

      {/* 내용 */}
      {open && (
        <div style={{ padding: '16px 18px' }}>
          {isTeam ? (
            /* 팀 전체 보기 */
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {Object.entries(
                (entry.tasks || []).reduce((acc, t) => {
                  (acc[t.member] = acc[t.member] || []).push(t);
                  return acc;
                }, {})
              ).map(([member, tasks]) => (
                <div key={member}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 7 }}>
                    <span style={{ fontSize: 13, fontWeight: 800, color: '#374151' }}>{member}</span>
                    <span style={{ fontSize: 11, background: '#f1f5f9', color: '#6b7280', borderRadius: 4, padding: '2px 6px', fontWeight: 600 }}>{tasks.length}건</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {tasks.map((t, i) => (
                      <TaskRow key={i} task={t} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* 개인 보기 */
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {(entry.tasks || []).map((t, i) => <TaskRow key={i} task={t} />)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TaskRow({ task }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 8,
      padding: '7px 11px', background: '#f8fafc',
      borderRadius: 7, borderLeft: `3px solid ${task.weekType === 'prev' ? '#e2e8f0' : '#bae6fd'}`,
    }}>
      {task.project && (
        <span style={{ fontSize: 12, background: task.weekType === 'prev' ? '#f1f5f9' : '#e0f2fe', color: task.weekType === 'prev' ? '#64748b' : '#0891b2', padding: '2px 7px', borderRadius: 4, flexShrink: 0, fontWeight: 600 }}>
          {task.project}
        </span>
      )}
      <span style={{ fontSize: 13, color: '#374151', lineHeight: 1.55, flex: 1 }} dangerouslySetInnerHTML={{ __html: task.content }} />
      <span style={{ fontSize: 11, color: '#94a3b8', flexShrink: 0, fontWeight: 600, marginTop: 1 }}>
        {task.weekType === 'prev' ? '지난주' : '금주'}
      </span>
    </div>
  );
}

/* ─────────────────────────────────────────────
   저장 확인 모달
───────────────────────────────────────────── */
function SaveModal({ onSave, onClose, memberOptions, sheetName }) {
  const [type, setType] = useState('member');
  const [selectedMember, setSelectedMember] = useState(memberOptions[0]?.value || '');
  const [note, setNote] = useState('');
  const year = new Date().getFullYear();

  function handleSave() {
    onSave({ type, memberName: type === 'member' ? selectedMember : null, note });
    onClose();
  }

  return (
    <>
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', zIndex: 100, backdropFilter: 'blur(3px)' }}
      />
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        background: 'white', borderRadius: 16, padding: '28px 30px',
        width: 420, zIndex: 101, boxShadow: '0 20px 60px rgba(0,0,0,0.22)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 9, background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Save size={16} color="white" />
            </div>
            <h3 style={{ fontSize: 17, fontWeight: 800, color: '#0f172a', margin: 0 }}>아카이브 저장</h3>
          </div>
          <button onClick={onClose} style={{ border: 'none', background: '#f1f5f9', borderRadius: 7, padding: 7, cursor: 'pointer', display: 'flex' }}>
            <X size={16} color="#64748b" />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
          {/* 저장 유형 */}
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 8 }}>저장 유형</p>
            <div style={{ display: 'flex', gap: 8 }}>
              {[{ value: 'member', label: '팀원별', icon: User }, { value: 'team', label: '팀 전체', icon: Users }].map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setType(opt.value)}
                  style={{
                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                    padding: '10px 14px', borderRadius: 9, cursor: 'pointer',
                    border: type === opt.value ? '2px solid #6366f1' : '1.5px solid #e2e8f0',
                    background: type === opt.value ? '#eef2ff' : 'white',
                    fontSize: 14, fontWeight: 700, color: type === opt.value ? '#4f46e5' : '#64748b',
                    transition: 'all 0.15s',
                  }}
                >
                  <opt.icon size={15} /> {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* 팀원 선택 (팀원별일 때만) */}
          {type === 'member' && (
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 8 }}>팀원 선택</p>
              <div style={{ position: 'relative' }}>
                <select
                  value={selectedMember}
                  onChange={e => setSelectedMember(e.target.value)}
                  style={{
                    width: '100%', appearance: 'none', padding: '8px 12px',
                    border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 14,
                    color: '#374151', background: 'white', outline: 'none', fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {memberOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <ChevronDown size={14} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', pointerEvents: 'none' }} />
              </div>
            </div>
          )}

          {/* 메모 */}
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 8 }}>메모 (선택)</p>
            <input
              type="text"
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder={`${sheetName}주차 업무 아카이브`}
              style={{
                width: '100%', padding: '8px 12px', border: '1.5px solid #e2e8f0',
                borderRadius: 8, fontSize: 14, color: '#374151', outline: 'none',
                boxSizing: 'border-box',
              }}
              onFocus={e => e.target.style.borderColor = '#6366f1'}
              onBlur={e => e.target.style.borderColor = '#e2e8f0'}
            />
          </div>

          {/* 안내 */}
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '10px 13px', fontSize: 13, color: '#15803d', lineHeight: 1.55 }}>
            현재 <strong>{sheetName}주차</strong> 데이터가 브라우저 로컬스토리지에 저장됩니다.<br />
            {type === 'member' ? `${selectedMember || '선택한 팀원'}의 ` : '팀 전체의 '}업무 내역이 기록됩니다.
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 22 }}>
          <button
            onClick={onClose}
            style={{ flex: 1, padding: '10px', borderRadius: 9, border: '1.5px solid #e2e8f0', background: 'white', fontSize: 14, fontWeight: 700, color: '#64748b', cursor: 'pointer' }}
          >
            취소
          </button>
          <button
            onClick={handleSave}
            style={{ flex: 2, padding: '10px', borderRadius: 9, border: 'none', background: 'linear-gradient(135deg,#4f46e5,#6366f1)', fontSize: 14, fontWeight: 800, color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}
          >
            <Archive size={15} /> 아카이브 저장
          </button>
        </div>
      </div>
    </>
  );
}

/* ─────────────────────────────────────────────
   메인 컴포넌트
───────────────────────────────────────────── */
export default function AnnualArchive() {
  const { data, loading, error } = useWeeklyData();
  const [archives, setArchives] = useState(loadArchive);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [filterType, setFilterType] = useState('all');
  const [filterMember, setFilterMember] = useState('all');
  const [filterYear, setFilterYear] = useState('all');
  const [viewTab, setViewTab] = useState('current'); // 'current' | 'archived'

  /* 현재 주차 필터 */
  const [curFilterMember, setCurFilterMember] = useState('all');
  const [curFilterProject, setCurFilterProject] = useState('all');

  const members = data?.members || [];
  const allProjects = [...new Set(members.flatMap(m => [
    ...m.prevWeek.map(t => t.project),
    ...m.thisWeek.map(t => t.project),
  ]))].filter(Boolean).sort();

  const memberOptions = members.map(m => ({ value: m.name, label: m.name }));

  /* ── 아카이브 저장 ── */
  function handleSave({ type, memberName, note }) {
    if (!data) return;
    const year = new Date().getFullYear();

    let tasks = [];
    if (type === 'team') {
      tasks = members.flatMap(m => [
        ...m.prevWeek.map(t => ({ member: m.name, ...t, weekType: 'prev' })),
        ...m.thisWeek.map(t => ({ member: m.name, ...t, weekType: 'this' })),
      ]);
    } else {
      const member = members.find(m => m.name === memberName);
      if (member) {
        tasks = [
          ...member.prevWeek.map(t => ({ member: member.name, ...t, weekType: 'prev' })),
          ...member.thisWeek.map(t => ({ member: member.name, ...t, weekType: 'this' })),
        ];
      }
    }

    const entry = {
      id: `${Date.now()}`,
      type,
      memberName: type === 'member' ? memberName : null,
      year,
      weekCode: data.sheetName,
      savedAt: new Date().toISOString(),
      note,
      tasks,
    };

    const next = [entry, ...archives];
    setArchives(next);
    saveArchive(next);
  }

  /* ── 아카이브 삭제 ── */
  function handleDelete(id) {
    if (!window.confirm('이 아카이브 항목을 삭제하시겠습니까?')) return;
    const next = archives.filter(a => a.id !== id);
    setArchives(next);
    saveArchive(next);
  }

  /* ── 필터된 아카이브 ── */
  const filteredArchives = useMemo(() => {
    return archives.filter(a => {
      if (filterType !== 'all' && a.type !== filterType) return false;
      if (filterMember !== 'all' && a.memberName !== filterMember) return false;
      if (filterYear !== 'all' && String(a.year) !== filterYear) return false;
      return true;
    });
  }, [archives, filterType, filterMember, filterYear]);

  const archiveYears = [...new Set(archives.map(a => String(a.year)))].sort((a, b) => b - a);

  /* ── 현재 주차 필터된 팀원 ── */
  const displayMembers = useMemo(() => {
    const base = curFilterMember === 'all' ? members : members.filter(m => m.name === curFilterMember);
    return base.filter(m => {
      if (curFilterProject === 'all') return true;
      return [...m.prevWeek, ...m.thisWeek].some(t => t.project === curFilterProject);
    });
  }, [members, curFilterMember, curFilterProject]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#f8fafc' }}>
      <style>{`
        .archive-tab { transition: all 0.15s; cursor: pointer; }
        .archive-tab:hover { background: #f1f5f9 !important; }
        .archive-row { transition: background 0.12s; }
        .archive-row:hover { background: #f8fafc !important; }
      `}</style>

      {/* ── 헤더 ── */}
      <div style={{
        padding: '11px 22px', background: 'white', borderBottom: '1px solid #e2e8f0',
        flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px #4f46e540' }}>
            <Archive size={18} color="white" strokeWidth={2.5} />
          </div>
          <div>
            <h1 style={{ fontSize: 19, fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '-0.02em' }}>연간 업무 아카이브</h1>
            {data && <p style={{ fontSize: 13, color: '#94a3b8', margin: 0, marginTop: 1 }}>현재 시트: {data.sheetName}주차 · 저장된 아카이브 {archives.length}건</p>}
          </div>
        </div>
        {data && (
          <button
            onClick={() => setShowSaveModal(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 18px', borderRadius: 10, border: 'none',
              background: 'linear-gradient(135deg,#4f46e5,#6366f1)',
              color: 'white', fontSize: 14, fontWeight: 800, cursor: 'pointer',
              boxShadow: '0 2px 10px #6366f140',
              transition: 'transform 0.12s, box-shadow 0.12s',
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 16px #6366f150'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 10px #6366f140'; }}
          >
            <PlusCircle size={15} />
            현재 주차 아카이브 저장
          </button>
        )}
      </div>

      {/* ── 탭 ── */}
      <div style={{ padding: '0 22px', background: 'white', borderBottom: '1px solid #e2e8f0', flexShrink: 0, display: 'flex', gap: 0 }}>
        {[
          { key: 'current', label: '현재 주차 보기', icon: Calendar },
          { key: 'archived', label: `저장된 아카이브 (${archives.length})`, icon: FolderOpen },
        ].map(tab => (
          <button
            key={tab.key}
            className="archive-tab"
            onClick={() => setViewTab(tab.key)}
            style={{
              display: 'flex', alignItems: 'center', gap: 7,
              padding: '11px 18px', fontSize: 14, fontWeight: 700,
              border: 'none', background: 'none', cursor: 'pointer',
              color: viewTab === tab.key ? '#4f46e5' : '#64748b',
              borderBottom: viewTab === tab.key ? '2.5px solid #6366f1' : '2.5px solid transparent',
              marginBottom: -1,
              transition: 'color 0.15s',
            }}
          >
            <tab.icon size={15} /> {tab.label}
          </button>
        ))}
      </div>

      {loading && (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, color: '#94a3b8' }}>
          <Loader size={24} style={{ animation: 'spin 1s linear infinite' }} />
          <span style={{ fontSize: 15 }}>Google Sheets 데이터 불러오는 중...</span>
        </div>
      )}
      {error && (
        <div style={{ margin: 24, color: '#ef4444', fontSize: 14, background: '#fef2f2', padding: '13px 18px', borderRadius: 11, border: '1px solid #fecaca' }}>
          연결 오류: {error}
        </div>
      )}

      {!loading && !error && (
        <div style={{ flex: 1, overflowY: 'auto', padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* ═══════════════════════════════════
              현재 주차 탭
          ════════════════════════════════════ */}
          {viewTab === 'current' && (
            <>
              {/* 필터 바 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'white', padding: '11px 16px', borderRadius: 10, border: '1px solid #e2e8f0', flexWrap: 'wrap' }}>
                <span style={{ fontSize: 13, fontWeight: 800, color: '#4f46e5', marginRight: 4 }}>필터</span>
                <Filter label="팀원"
                  value={curFilterMember} onChange={setCurFilterMember}
                  options={[{ value: 'all', label: '전체' }, ...memberOptions]}
                />
                <Filter label="프로젝트"
                  value={curFilterProject} onChange={setCurFilterProject}
                  options={[{ value: 'all', label: '전체' }, ...allProjects.map(p => ({ value: p, label: p }))]}
                />
                {data && (
                  <span style={{ marginLeft: 'auto', fontSize: 13, color: '#94a3b8', fontWeight: 600 }}>
                    {data.sheetName}주차 기준
                  </span>
                )}
              </div>

              {/* 매트릭스 테이블 */}
              <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
                <div style={{ padding: '13px 17px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <h2 style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', margin: 0 }}>팀원별 주간 업무 매트릭스</h2>
                  <span style={{ fontSize: 13, color: '#94a3b8', background: '#f8fafc', padding: '4px 11px', borderRadius: 7, border: '1px solid #e2e8f0', fontWeight: 600 }}>
                    {displayMembers.length}명
                  </span>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                        {['담당자', '지난주 업무', '금주 계획', '건수'].map((h, i) => (
                          <th key={i} style={{
                            textAlign: i === 3 ? 'center' : 'left',
                            padding: '10px 14px', fontSize: 13, fontWeight: 700, color: i === 2 ? '#4f46e5' : '#475569',
                            whiteSpace: 'nowrap', userSelect: 'none',
                          }}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {displayMembers.map((member, mi) => {
                        const prevFiltered = curFilterProject === 'all' ? member.prevWeek : member.prevWeek.filter(t => t.project === curFilterProject);
                        const thisFiltered = curFilterProject === 'all' ? member.thisWeek : member.thisWeek.filter(t => t.project === curFilterProject);
                        return (
                          <tr key={member.name} className="archive-row" style={{ borderBottom: '1px solid #f1f5f9', background: mi % 2 === 0 ? 'white' : '#fafafa' }}>
                            <td style={{ padding: '12px 14px', whiteSpace: 'nowrap', verticalAlign: 'top' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ fontSize: 18 }}>{member.avatar || '👤'}</span>
                                <div>
                                  <p style={{ fontSize: 13, fontWeight: 800, color: '#0f172a', margin: 0 }}>{member.name}</p>
                                  <p style={{ fontSize: 11, color: '#9ca3af', margin: '1px 0 0', fontWeight: 500 }}>{member.part}</p>
                                </div>
                              </div>
                            </td>
                            <td style={{ padding: '12px 14px', verticalAlign: 'top' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                {prevFiltered.map((t, i) => (
                                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                                    <span style={{ fontSize: 11, background: '#f1f5f9', color: '#64748b', padding: '2px 6px', borderRadius: 4, flexShrink: 0, marginTop: 1, fontWeight: 600 }}>{t.project}</span>
                                    <span style={{ fontSize: 13, color: '#374151' }}>{t.content}</span>
                                  </div>
                                ))}
                              </div>
                            </td>
                            <td style={{ padding: '12px 14px', verticalAlign: 'top' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                {thisFiltered.map((t, i) => (
                                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                                    <span style={{ fontSize: 11, background: '#e0f2fe', color: '#0891b2', padding: '2px 6px', borderRadius: 4, flexShrink: 0, marginTop: 1, fontWeight: 600 }}>{t.project}</span>
                                    <span style={{ fontSize: 13, color: '#374151' }}>{t.content}</span>
                                  </div>
                                ))}
                              </div>
                            </td>
                            <td style={{ padding: '12px 14px', textAlign: 'center', verticalAlign: 'top' }}>
                              <span style={{ fontSize: 13, fontWeight: 800, color: '#6366f1' }}>{member.thisWeek.length}건</span>
                            </td>
                          </tr>
                        );
                      })}
                      {displayMembers.length === 0 && (
                        <tr>
                          <td colSpan={4} style={{ textAlign: 'center', padding: '35px', color: '#94a3b8', fontSize: 15 }}>조건에 맞는 팀원이 없습니다.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* ═══════════════════════════════════
              아카이브 탭
          ════════════════════════════════════ */}
          {viewTab === 'archived' && (
            <>
              {/* 필터 바 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'white', padding: '11px 16px', borderRadius: 10, border: '1px solid #e2e8f0', flexWrap: 'wrap' }}>
                <span style={{ fontSize: 13, fontWeight: 800, color: '#4f46e5', marginRight: 4 }}>필터</span>
                <Filter label="유형"
                  value={filterType} onChange={setFilterType}
                  options={[{ value: 'all', label: '전체' }, { value: 'team', label: '팀 전체' }, { value: 'member', label: '팀원별' }]}
                />
                {filterType !== 'team' && (
                  <Filter label="팀원"
                    value={filterMember} onChange={setFilterMember}
                    options={[{ value: 'all', label: '전체' }, ...memberOptions]}
                  />
                )}
                <Filter label="연도"
                  value={filterYear} onChange={setFilterYear}
                  options={[{ value: 'all', label: '전체' }, ...archiveYears.map(y => ({ value: y, label: `${y}년` }))]}
                />
                <span style={{ marginLeft: 'auto', fontSize: 13, color: '#94a3b8', fontWeight: 600 }}>
                  {filteredArchives.length}건
                </span>
              </div>

              {/* 아카이브 목록 */}
              {filteredArchives.length === 0 ? (
                <div style={{
                  flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  gap: 14, color: '#9ca3af', padding: '60px 20px',
                  background: 'white', borderRadius: 12, border: '1px solid #e2e8f0',
                }}>
                  <div style={{ width: 56, height: 56, borderRadius: 16, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <FolderOpen size={28} color="#cbd5e1" />
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: 16, fontWeight: 700, color: '#475569', margin: '0 0 6px' }}>저장된 아카이브가 없습니다</p>
                    <p style={{ fontSize: 14, color: '#94a3b8', margin: 0 }}>상단의 <strong>현재 주차 아카이브 저장</strong> 버튼으로 업무를 아카이빙하세요.</p>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {filteredArchives.map(entry => (
                    <ArchiveCard key={entry.id} entry={entry} onDelete={handleDelete} />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* 저장 모달 */}
      {showSaveModal && data && (
        <SaveModal
          memberOptions={memberOptions}
          sheetName={data.sheetName}
          onSave={handleSave}
          onClose={() => setShowSaveModal(false)}
        />
      )}
    </div>
  );
}
