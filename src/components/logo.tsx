import Link from "next/link";

export function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <defs>
        <linearGradient id="olwe-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FF6A3D" />
          <stop offset="1" stopColor="#FFB547" />
        </linearGradient>
      </defs>
      <circle cx="32" cy="32" r="24" fill="none" stroke="url(#olwe-g)" strokeWidth="8" />
      <path d="M27 22.5v19l15-9.5z" fill="url(#olwe-g)" />
    </svg>
  );
}

export function Logo({ href = "/", size = 28 }: { href?: string; size?: number }) {
  return (
    <Link href={href} className="flex items-center gap-2" aria-label="Olwe — início">
      <LogoMark size={size} />
      <span className="font-display text-2xl font-semibold tracking-tight lowercase" style={{ fontSize: size * 0.85 }}>
        olwe
      </span>
    </Link>
  );
}
