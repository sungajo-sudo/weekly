import { Camera, Archive, Settings, BarChart3, LineChart, ChevronLeft, ChevronRight } from 'lucide-react';

const NAV_ITEMS = [
  { id: 'executive', icon: LineChart, label: '대시보드' },
  { id: 'slide',     icon: Camera,    label: '상세 업무 진행' },
  { id: 'archive',   icon: Archive,   label: '연간 업무 아카이브' },
  { id: 'settings',  icon: Settings,  label: '데이터 동기화 설정' },
];

export default function Sidebar({ current, onChange, collapsed, onToggle }) {
  return (
    <aside style={{
      width: collapsed ? 52 : 224,
      minWidth: collapsed ? 52 : 224,
      background: 'white',
      borderRight: '1px solid #e5e7eb',
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
      transition: 'width 0.22s cubic-bezier(0.4,0,0.2,1), min-width 0.22s cubic-bezier(0.4,0,0.2,1)',
      overflow: 'hidden',
      position: 'relative',
    }}>
      {/* 로고 헤더 */}
      <div style={{
        padding: collapsed ? '16px 0' : '16px',
        borderBottom: '1px solid #e5e7eb',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        justifyContent: collapsed ? 'center' : 'flex-start',
        overflow: 'hidden',
      }}>
        <div style={{
          width: 28, height: 28, borderRadius: 7,
          background: '#4f46e5',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <BarChart3 size={15} color="white" />
        </div>
        {!collapsed && (
          <div style={{ overflow: 'hidden' }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#111827', lineHeight: '1.2', whiteSpace: 'nowrap' }}>Weekly Board</p>
            <p style={{ fontSize: 11, color: '#9ca3af', whiteSpace: 'nowrap' }}>팀 주간 보고 시스템</p>
          </div>
        )}
      </div>

      {/* 네비게이션 */}
      <nav style={{ flex: 1, padding: collapsed ? '10px 6px' : '10px 10px', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {NAV_ITEMS.map(({ id, icon: Icon, label }) => {
          const active = current === id;
          return (
            <button
              key={id}
              onClick={() => onChange(id)}
              title={collapsed ? label : undefined}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: collapsed ? 0 : 10,
                padding: collapsed ? '9px 0' : '9px 12px',
                justifyContent: collapsed ? 'center' : 'flex-start',
                borderRadius: 8,
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'inherit',
                fontSize: 14,
                fontWeight: 600,
                transition: 'background 0.12s, color 0.12s',
                background: active ? '#eef2ff' : 'transparent',
                color: active ? '#4338ca' : '#6b7280',
                textAlign: 'left',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
              }}
              onMouseEnter={e => { if (!active) e.currentTarget.style.background = '#f3f4f6'; }}
              onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
            >
              <Icon size={17} style={{ flexShrink: 0 }} />
              {!collapsed && <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>}
            </button>
          );
        })}
      </nav>

      {/* 하단 상태 */}
      {!collapsed && (
        <div style={{ padding: '10px 16px', borderTop: '1px solid #e5e7eb' }}>
          <p style={{ fontSize: 11, color: '#9ca3af' }}>Google Sheets 연동 활성</p>
          <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#4ade80', display: 'inline-block' }} />
            <span style={{ fontSize: 11, color: '#16a34a', fontWeight: 600 }}>연결됨</span>
          </div>
        </div>
      )}

      {/* 접기/펼치기 버튼 */}
      <button
        onClick={onToggle}
        style={{
          position: 'absolute',
          bottom: collapsed ? 12 : 12,
          right: collapsed ? '50%' : 10,
          transform: collapsed ? 'translateX(50%)' : 'none',
          width: 26, height: 26,
          borderRadius: '50%',
          background: 'white',
          border: '1.5px solid #e5e7eb',
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#9ca3af',
          boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
          transition: 'color 0.12s, box-shadow 0.12s',
          zIndex: 10,
          flexShrink: 0,
        }}
        onMouseEnter={e => { e.currentTarget.style.color = '#4f46e5'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(79,70,229,0.18)'; }}
        onMouseLeave={e => { e.currentTarget.style.color = '#9ca3af'; e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.08)'; }}
      >
        {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>
    </aside>
  );
}
