import type { ReactNode } from "react";

// Ícones do Olwe: traço arredondado de 1,85 numa grade de 24×24, sempre na cor do texto (currentColor).
// Para preencher um ícone de traço (estrela de nota, por exemplo), use className="fill-current".
const ICONS = {
  play: <path d="M8 4.5v15L20 12z" fill="currentColor" />,
  pause: (
    <>
      <rect x="6.5" y="5" width="3" height="14" rx="0.75" fill="currentColor" />
      <rect x="14.5" y="5" width="3" height="14" rx="0.75" fill="currentColor" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5.5M12 7.75h.01" />
    </>
  ),
  "chevron-left": <path d="m15 6-6 6 6 6" />,
  "chevron-right": <path d="m9 6 6 6-6 6" />,
  "chevron-down": <path d="m6 9 6 6 6-6" />,
  "chevron-up": <path d="m6 15 6-6 6 6" />,
  x: <path d="M6 6l12 12M18 6 6 18" />,
  search: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4.5 4.5" />
    </>
  ),
  home: <path d="M4.5 10.2 12 4l7.5 6.2V19a1.5 1.5 0 0 1-1.5 1.5h-3.5V15a1 1 0 0 0-1-1h-3a1 1 0 0 0-1 1v5.5H6A1.5 1.5 0 0 1 4.5 19z" />,
  film: (
    <>
      <rect x="3.5" y="4" width="17" height="16" rx="2" />
      <path d="M7.5 4v16M16.5 4v16M3.5 12h17M3.5 8h4M3.5 16h4M16.5 8h4M16.5 16h4" />
    </>
  ),
  tv: (
    <>
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="m8.5 3 3.5 4 3.5-4" />
    </>
  ),
  sparkles: (
    <>
      <path d="m10 3 1.9 5.1L17 10l-5.1 1.9L10 17l-1.9-5.1L3 10l5.1-1.9z" />
      <path d="m18 14.5.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z" />
    </>
  ),
  list: <path d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01" />,
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4.5 20.5c.8-3.8 3.9-6 7.5-6s6.7 2.2 7.5 6" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20c.6-3.4 3.2-5.5 6.5-5.5s5.9 2.1 6.5 5.5M15.5 4.6a3.5 3.5 0 0 1 0 6.8M17.5 14.8c2.1.6 3.5 2.4 4 5.2" />
    </>
  ),
  pencil: <path d="M4 20h4.5L19.3 9.2a2 2 0 0 0 0-2.8l-1.7-1.7a2 2 0 0 0-2.8 0L4 15.5zM13.5 6l4.5 4.5" />,
  lock: (
    <>
      <rect x="5" y="10.5" width="14" height="10" rx="2" />
      <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5M12 14.5v2" />
    </>
  ),
  unlock: (
    <>
      <rect x="5" y="10.5" width="14" height="10" rx="2" />
      <path d="M8 10.5V8a4 4 0 0 1 7.75-1.4M12 14.5v2" />
    </>
  ),
  trash: (
    <path d="M4 6.5h16M9.5 6.5V4.8a.8.8 0 0 1 .8-.8h3.4a.8.8 0 0 1 .8.8v1.7M6 6.5l.9 12.6a1.5 1.5 0 0 0 1.5 1.4h7.2a1.5 1.5 0 0 0 1.5-1.4L18 6.5M10 10.5v6M14 10.5v6" />
  ),
  logout: <path d="M9.5 20H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h3.5M16 16.5l4.5-4.5L16 7.5M20.5 12H9.5" />,
  settings: (
    <>
      <path d="M10.46 5.07 10.76 2.58A9.5 9.5 0 0 1 13.24 2.58L13.54 5.07A7.1 7.1 0 0 1 15.81 6.01L17.78 4.46A9.5 9.5 0 0 1 19.54 6.22L17.99 8.19A7.1 7.1 0 0 1 18.93 10.46L21.42 10.76A9.5 9.5 0 0 1 21.42 13.24L18.93 13.54A7.1 7.1 0 0 1 17.99 15.81L19.54 17.78A9.5 9.5 0 0 1 17.78 19.54L15.81 17.99A7.1 7.1 0 0 1 13.54 18.93L13.24 21.42A9.5 9.5 0 0 1 10.76 21.42L10.46 18.93A7.1 7.1 0 0 1 8.19 17.99L6.22 19.54A9.5 9.5 0 0 1 4.46 17.78L6.01 15.81A7.1 7.1 0 0 1 5.07 13.54L2.58 13.24A9.5 9.5 0 0 1 2.58 10.76L5.07 10.46A7.1 7.1 0 0 1 6.01 8.19L4.46 6.22A9.5 9.5 0 0 1 6.22 4.46L8.19 6.01A7.1 7.1 0 0 1 10.46 5.07Z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  volume: <path d="M4 9.5v5a1 1 0 0 0 1 1h3l4.5 4v-15L8 8.5H5a1 1 0 0 0-1 1zM16 9a4 4 0 0 1 0 6M18.5 6.5a7.5 7.5 0 0 1 0 11" />,
  "volume-x": <path d="M4 9.5v5a1 1 0 0 0 1 1h3l4.5 4v-15L8 8.5H5a1 1 0 0 0-1 1zM16 9.5l5 5M21 9.5l-5 5" />,
  maximize: <path d="M4 9V5a1 1 0 0 1 1-1h4M15 4h4a1 1 0 0 1 1 1v4M20 15v4a1 1 0 0 1-1 1h-4M9 20H5a1 1 0 0 1-1-1v-4" />,
  minimize: <path d="M9 4v4a1 1 0 0 1-1 1H4M20 9h-4a1 1 0 0 1-1-1V4M15 20v-4a1 1 0 0 1 1-1h4M4 15h4a1 1 0 0 1 1 1v4" />,
  // Voltar e avançar 10 segundos: seta circular com o "10" desenhado (sem depender de fonte).
  "rewind-10": (
    <>
      <path d="M4.5 12a7.5 7.5 0 1 0 7.5-7.5M14.5 2 12 4.5 14.5 7" />
      <path d="m9.3 10.3 1.3-.9v5.2" strokeWidth="1.5" />
      <ellipse cx="14.1" cy="12" rx="1.5" ry="2.6" strokeWidth="1.5" />
    </>
  ),
  "forward-10": (
    <>
      <path d="M19.5 12A7.5 7.5 0 1 1 12 4.5M9.5 2 12 4.5 9.5 7" />
      <path d="m9.3 10.3 1.3-.9v5.2" strokeWidth="1.5" />
      <ellipse cx="14.1" cy="12" rx="1.5" ry="2.6" strokeWidth="1.5" />
    </>
  ),
  pip: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <rect x="12.5" y="11.5" width="5.5" height="4.5" rx="0.75" fill="currentColor" />
    </>
  ),
  "arrow-left": <path d="M19 12H5M11 6l-6 6 6 6" />,
  star: <path d="M12 3.2 14.65 8.96 20.94 9.7 16.28 13.99 17.53 20.2 12 17.1 6.47 20.2 7.72 13.99 3.06 9.7 9.35 8.96Z" />,
  share: <path d="M12 15V3.5M7.5 8 12 3.5 16.5 8M5 13v5.5A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5V13" />,
  gauge: (
    <>
      <path d="M4.64 18.25a8.5 8.5 0 1 1 14.72 0M12 14l3.5-3.5" />
      <circle cx="12" cy="14" r="0.6" fill="currentColor" />
    </>
  ),
  layers: <path d="M12 3.5 3 8.2l9 4.8 9-4.8zM3 12.2l9 4.8 9-4.8M3 16.2l9 4.8 9-4.8" />,
  mail: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m4 7.5 8 5.5 8-5.5" />
    </>
  ),
  eye: (
    <>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
      <circle cx="12" cy="12" r="2.75" />
    </>
  ),
  "eye-off": (
    <path d="M3.5 3.5l17 17M10.6 5.6a10 10 0 0 1 1.4-.1c6 0 9.5 6.5 9.5 6.5a17 17 0 0 1-2.7 3.5M6.6 6.6C3.9 8.3 2.5 12 2.5 12s3.5 6.5 9.5 6.5a9.6 9.6 0 0 0 5.4-1.6M9.9 9.9a3 3 0 0 0 4.2 4.2" />
  ),
  alert: <path d="M10.3 4.2 2.6 17.5a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 4.2a2 2 0 0 0-3.4 0zM12 9.5V14M12 17.25h.01" />,
  calendar: (
    <>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2" />
      <path d="M3.5 10h17M8 3v4M16 3v4" />
    </>
  ),
  trophy: (
    <path d="M7 4.5h10v5a5 5 0 0 1-10 0zM7 6.5H4.5V8a3 3 0 0 0 3 3M17 6.5h2.5V8a3 3 0 0 1-3 3M12 14.5v6M8.5 20.5h7" />
  ),
  menu: <path d="M4 6.5h16M4 12h16M4 17.5h16" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  globe: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z" />
    </>
  ),
  monitor: (
    <>
      <rect x="2.5" y="4" width="19" height="13" rx="2" />
      <path d="M8.5 20.5h7M12 17v3.5" />
    </>
  ),
  smartphone: (
    <>
      <rect x="6.5" y="2.5" width="11" height="19" rx="2.5" />
      <path d="M11 18.5h2" />
    </>
  ),
} satisfies Record<string, ReactNode>;

export type IconName = keyof typeof ICONS;

/**
 * Ícone em SVG. Decorativo (aria-hidden) por padrão; com title, vira imagem com nome acessível.
 * size é em px na escala normal; vira rem para crescer junto com o texto nas TVs (classes size-* sobrepõem).
 */
export function Icon({ name, size = 20, className, title }: { name: IconName; size?: number; className?: string; title?: string }) {
  const length = `${size / 16}rem`;
  return (
    <svg
      width={length}
      height={length}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.85}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      {title && <title>{title}</title>}
      {ICONS[name]}
    </svg>
  );
}
