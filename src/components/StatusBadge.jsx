const STATUS_CONFIG = {
  done:    { label: '완료',   bg: 'bg-green-500',  hover: 'hover:bg-green-600' },
  working: { label: '진행중', bg: 'bg-orange-400', hover: 'hover:bg-orange-500' },
  stuck:   { label: '이슈',   bg: 'bg-red-500',   hover: 'hover:bg-red-600' },
  pending: { label: '보류',   bg: 'bg-gray-300',  hover: 'hover:bg-gray-400', text: 'text-gray-600' },
};

export default function StatusBadge({ status, onClick, size = 'sm' }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  const textColor = cfg.text || 'text-white';
  const padding = size === 'lg' ? 'px-3 py-1 text-sm' : 'px-2 py-0.5 text-xs';

  return (
    <span
      onClick={onClick}
      className={`inline-flex items-center justify-center rounded font-semibold cursor-pointer transition-colors
        ${cfg.bg} ${cfg.hover} ${textColor} ${padding}`}
    >
      {cfg.label}
    </span>
  );
}
