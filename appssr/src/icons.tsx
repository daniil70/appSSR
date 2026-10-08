import type { IconKey } from '../shared/types';

type P = { size?: number; className?: string };
const base = (size: number) => ({ width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const });

export const Icons = {
  grid: ({ size = 18, className }: P) => (
    <svg {...base(size)} className={className}><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></svg>
  ),
  download: ({ size = 18, className }: P) => (
    <svg {...base(size)} className={className}><path d="M12 3v12" /><path d="m7 10 5 5 5-5" /><path d="M4 21h16" /></svg>
  ),
  star: ({ size = 18, className }: P) => (
    <svg {...base(size)} className={className}><path d="m12 3 2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 17.8 6.2 20.9l1.1-6.5L2.6 9.8l6.5-.9Z" /></svg>
  ),
  starFilled: ({ size = 18, className }: P) => (
    <svg {...base(size)} className={className} fill="currentColor"><path d="m12 3 2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 17.8 6.2 20.9l1.1-6.5L2.6 9.8l6.5-.9Z" /></svg>
  ),
  settings: ({ size = 18, className }: P) => (
    <svg {...base(size)} className={className}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" /></svg>
  ),
  table: ({ size = 18, className }: P) => (
    <svg {...base(size)} className={className}><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 10h18M9 4v16M15 4v16" /></svg>
  ),
  search: ({ size = 16, className }: P) => (
    <svg {...base(size)} className={className}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
  ),
  open: ({ size = 16, className }: P) => (
    <svg {...base(size)} className={className}><path d="M14 3h7v7" /><path d="M21 3 11 13" /><path d="M19 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h5" /></svg>
  ),
  login: ({ size = 16, className }: P) => (
    <svg {...base(size)} className={className}><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" /><path d="m10 17 5-5-5-5" /><path d="M15 12H3" /></svg>
  ),
  trash: ({ size = 16, className }: P) => (
    <svg {...base(size)} className={className}><path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /></svg>
  ),
  check: ({ size = 16, className }: P) => (
    <svg {...base(size)} className={className}><path d="m5 12 5 5L20 7" /></svg>
  ),
  close: ({ size = 16, className }: P) => (
    <svg {...base(size)} className={className}><path d="M18 6 6 18M6 6l12 12" /></svg>
  ),
  dots: ({ size = 18, className }: P) => (
    <svg {...base(size)} className={className} fill="currentColor" stroke="none"><circle cx="5" cy="12" r="1.8" /><circle cx="12" cy="12" r="1.8" /><circle cx="19" cy="12" r="1.8" /></svg>
  ),
  plus: ({ size = 16, className }: P) => (
    <svg {...base(size)} className={className}><path d="M12 5v14M5 12h14" /></svg>
  ),
  chevron: ({ size = 16, className }: P) => (
    <svg {...base(size)} className={className}><path d="m6 9 6 6 6-6" /></svg>
  ),
  arrowLeft: ({ size = 16, className }: P) => (
    <svg {...base(size)} className={className}><path d="m15 18-6-6 6-6" /></svg>
  ),
  arrowRight: ({ size = 16, className }: P) => (
    <svg {...base(size)} className={className}><path d="m9 18 6-6-6-6" /></svg>
  ),
  user: ({ size = 20, className }: P) => (
    <svg {...base(size)} className={className}><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></svg>
  ),
  alert: ({ size = 16, className }: P) => (
    <svg {...base(size)} className={className}><path d="M12 9v4M12 17h.01" /><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" /></svg>
  ),
  edit: ({ size = 16, className }: P) => (
    <svg {...base(size)} className={className}><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
  ),
  folder: ({ size = 16, className }: P) => (
    <svg {...base(size)} className={className}><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" /></svg>
  ),
  refresh: ({ size = 16, className }: P) => (
    <svg {...base(size)} className={className}><path d="M21 12a9 9 0 1 1-2.6-6.4" /><path d="M21 3v6h-6" /></svg>
  ),
};

/** Крупная иконка программы (белый символ на цветной плашке). */
export function AppIcon({ icon, color, size = 48 }: { icon: IconKey; color: string; size?: number }) {
  const s = Math.round(size * 0.55);
  const glyph = (() => {
    switch (icon) {
      case 'assessment':
        return <svg {...base(s)} strokeWidth={2.2}><path d="M4 7v10l8 4 8-4V7" /><path d="m4 7 8 4 8-4-8-4Z" /><path d="M12 11v10" /></svg>;
      case 'analytics':
        return <svg {...base(s)} strokeWidth={2.4}><path d="M5 20V10M12 20V4M19 20v-7" /></svg>;
      case 'lif':
        return <svg {...base(s)} strokeWidth={2.2}><path d="M12 2 3 7v10l9 5 9-5V7Z" /><path d="m3 7 9 5 9-5M12 12v10" /></svg>;
      case 'bc':
        return <svg {...base(s)} strokeWidth={2.2}><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M7 15l3-3 3 2 4-5" /></svg>;
      case 'table':
        return <svg {...base(s)} strokeWidth={2.2}><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 10h18M9 4v16M15 4v16" /></svg>;
      case 'doc':
        return <svg {...base(s)} strokeWidth={2.2}><path d="M6 2h8l5 5v15H6Z" /><path d="M14 2v5h5M9 13h6M9 17h6" /></svg>;
      case 'shield':
        return <svg {...base(s)} strokeWidth={2.2}><path d="M12 2 4 5v6c0 5 3.4 9.4 8 11 4.6-1.6 8-6 8-11V5Z" /></svg>;
      case 'cloud':
        return <svg {...base(s)} strokeWidth={2.2}><path d="M7 18a4 4 0 0 1-.5-8 6 6 0 0 1 11.6 1.5A3.5 3.5 0 0 1 18 18Z" /></svg>;
      case 'drive':
        return <svg {...base(s)} strokeWidth={2.2}><circle cx="12" cy="5" r="2" /><circle cx="6" cy="18" r="2" /><circle cx="18" cy="18" r="2" /><path d="M12 7v4M7.5 16.5 11 11M16.5 16.5 13 11" /></svg>;
      default:
        return <svg {...base(s)} strokeWidth={2.2}><path d="m12 3 8 14H4Z" /><path d="M8.5 17 12 10l3.5 7" /></svg>;
    }
  })();
  return (
    <div className="app-icon" style={{ width: size, height: size, borderRadius: Math.round(size * 0.22), background: `linear-gradient(145deg, ${color}, ${shade(color, -28)})` }}>
      {glyph}
    </div>
  );
}

function shade(hex: string, amount: number): string {
  const n = parseInt(hex.replace('#', ''), 16);
  const c = (v: number) => Math.max(0, Math.min(255, v + amount));
  const r = c((n >> 16) & 255);
  const g = c((n >> 8) & 255);
  const b = c(n & 255);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

export function AlabugaLogo({ light = false }: { light?: boolean }) {
  return (
    <div className={`alabuga-logo ${light ? 'light' : ''}`}>
      <svg width="34" height="30" viewBox="0 0 34 30" fill="none">
        <path d="M17 2 32 28H21.5L17 19.5 12.5 28H2Z" fill={light ? '#fff' : '#0d3b8a'} />
        <path d="M17 2 24.5 15H9.5Z" fill="#2c8cff" />
      </svg>
      <span>Алабуга</span>
    </div>
  );
}
