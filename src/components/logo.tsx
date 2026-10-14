import "@fontsource/outfit/latin-700.css";
import Link from "next/link";
import { useId } from "react";

// Medidas em px na escala normal, convertidas para rem: o logo cresce junto com o texto nas TVs.
const rem = (px: number) => `${px / 16}rem`;

export function LogoMark({ size = 28 }: { size?: number }) {
  // Um id por instância: o degradê continua certo com vários logos na página (cabeçalho e rodapé).
  const gradient = useId();
  return (
    // Mesmo desenho da vinheta de abertura: anel e play de cantos suaves.
    <svg width={rem(size)} height={rem(size)} viewBox="0 0 120 120" aria-hidden="true" focusable="false" className="shrink-0 overflow-visible">
      <defs>
        <linearGradient id={gradient} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#F15A3B" />
          <stop offset="1" stopColor="#F9A94B" />
        </linearGradient>
      </defs>
      <circle cx="60" cy="60" r="47" fill="none" stroke={`url(#${gradient})`} strokeWidth="14" />
      <path d="M50 41 L82 60 L50 79 Z" fill={`url(#${gradient})`} stroke={`url(#${gradient})`} strokeWidth="7" strokeLinejoin="round" />
    </svg>
  );
}

/** Logo com o nome; wordmarkClassName permite esconder o nome (ex.: busca aberta no celular). */
export function Logo({ href = "/", size = 28, wordmarkClassName = "" }: { href?: string; size?: number; wordmarkClassName?: string }) {
  return (
    <Link href={href} className="flex shrink-0 items-center gap-2 rounded-lg" aria-label="Olwe — início">
      <LogoMark size={size} />
      {/* Outfit 700, a fonte do nome na vinheta. */}
      <span
        className={`font-bold lowercase leading-none tracking-[-0.03em] ${wordmarkClassName}`}
        style={{ fontSize: rem(size * 0.9), fontFamily: '"Outfit", var(--font-display)' }}
      >
        olwe
      </span>
    </Link>
  );
}
