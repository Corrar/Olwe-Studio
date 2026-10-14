import Link from "next/link";
import { useId } from "react";
import { AVATARS, avatarById, type AvatarFace, type AvatarPattern } from "@/lib/avatars";
import { Icon } from "./icons";

// Desenhos numa grade de 100×100. Cantos arredondados em 22% (as molduras usam rounded-[22%] para acompanhar).
const DARK_INK = "#16181F";
const round = { fill: "none", strokeLinecap: "round", strokeLinejoin: "round" } as const;

const DOTS = Array.from({ length: 49 }, (_, i) => [8 + (i % 7) * 14, 8 + Math.floor(i / 7) * 14]);
const STARS = [
  [14, 18, 1.6],
  [30, 9, 1],
  [86, 30, 1.3],
  [10, 70, 1.2],
  [90, 84, 1.7],
  [24, 90, 1],
  [70, 92, 1.2],
] as const;

function Pattern({ pattern }: { pattern: AvatarPattern }) {
  switch (pattern) {
    case "rings":
      return (
        <g {...round} stroke="#fff" strokeWidth="5">
          <circle cx="100" cy="100" r="24" />
          <circle cx="100" cy="100" r="42" />
          <circle cx="100" cy="100" r="60" />
        </g>
      );
    case "dots":
      return (
        <g fill="#fff">
          {DOTS.map(([x, y]) => (
            <circle key={`${x}-${y}`} cx={x} cy={y} r="1.9" />
          ))}
        </g>
      );
    case "stripes":
      return <path d="M-10 25 25-10M-10 55 55-10M-10 85 85-10M5 110 110 5M35 110 110 35M65 110 110 65" stroke="#fff" strokeWidth="7" />;
    case "waves":
      return <path {...round} d="M-5 84q13.75-9 27.5 0t27.5 0 27.5 0 27.5 0M-5 97q13.75-9 27.5 0t27.5 0 27.5 0 27.5 0" stroke="#fff" strokeWidth="4.5" />;
    case "grid":
      return <path d="M0 12.5h100M0 87.5h100M12.5 0v100M87.5 0v100M0 25h100M0 75h100M25 0v100M75 0v100" stroke="#fff" strokeWidth="1.4" />;
    case "stars":
      return (
        <g fill="#fff">
          {STARS.map(([x, y, r]) => (
            <circle key={`${x}-${y}`} cx={x} cy={y} r={r * 1.4} />
          ))}
        </g>
      );
    case "none":
      return null;
  }
}

function Face({ face, ink }: { face: AvatarFace; ink: string }) {
  const stroke = { ...round, stroke: ink };
  const eyes = (
    <>
      <rect x="30" y="31" width="10" height="17" rx="5" fill={ink} />
      <rect x="60" y="31" width="10" height="17" rx="5" fill={ink} />
    </>
  );
  switch (face) {
    case "smile":
      return (
        <>
          {eyes}
          <path {...stroke} d="M30 60q20 18 40 0" strokeWidth="7" />
        </>
      );
    case "wink":
      return (
        <>
          <rect x="30" y="31" width="10" height="17" rx="5" fill={ink} />
          <path {...stroke} d="M57 42q8-9 16 0" strokeWidth="6" />
          <path {...stroke} d="M33 61q17 15 34 0" strokeWidth="7" />
        </>
      );
    case "joy":
      return (
        <>
          <path {...stroke} d="M28 44q7-10 14 0M58 44q7-10 14 0" strokeWidth="6" />
          <path d="M31 56h38q0 21-19 21t-19-21z" fill={ink} />
          <path d="M41 71q9-6 18 0-3 6-9 6t-9-6z" fill="#FF8FA0" />
        </>
      );
    case "cool":
      return (
        <>
          <path {...stroke} d="M20 40h60" strokeWidth="4" />
          <rect x="24" y="34" width="23" height="16" rx="6" fill={ink} />
          <rect x="53" y="34" width="23" height="16" rx="6" fill={ink} />
          <path {...round} d="M29 39h6M58 39h6" stroke="#fff" strokeOpacity="0.55" strokeWidth="2.5" />
          <path {...stroke} d="M37 65q13 8 26-3" strokeWidth="6" />
        </>
      );
    case "bot":
      return (
        <>
          <path {...stroke} d="M50 30V20" strokeWidth="4" />
          <circle cx="50" cy="16" r="4.5" fill={ink} />
          <rect x="22" y="30" width="56" height="25" rx="12.5" fill={ink} />
          <circle cx="38" cy="42.5" r="5" fill="#fff" />
          <circle cx="62" cy="42.5" r="5" fill="#fff" />
          <rect {...stroke} x="35" y="63" width="30" height="11" rx="5.5" strokeWidth="4" />
          <path {...stroke} d="M45 63v11M55 63v11" strokeWidth="3" />
        </>
      );
    case "cat":
      return (
        <>
          <path {...stroke} d="M19 37 22 12l18 13M81 37 78 12 60 25" strokeWidth="5" />
          <ellipse cx="36" cy="46" rx="5.5" ry="7.5" fill={ink} />
          <ellipse cx="64" cy="46" rx="5.5" ry="7.5" fill={ink} />
          <path {...stroke} d="M46 57h8l-4 5z" fill={ink} strokeWidth="2.5" />
          <path {...stroke} d="M50 62q-3 6-9 4M50 62q3 6 9 4" strokeWidth="3.5" />
          <path {...stroke} d="M11 55l17 3M11 64l17-2M89 55l-17 3M89 64l-17-2" strokeWidth="3" strokeOpacity="0.75" />
        </>
      );
    case "love":
      return (
        <>
          <path d="M36 50c-12-7-9-19 0-14 9-5 12 7 0 14zM64 50c-12-7-9-19 0-14 9-5 12 7 0 14z" fill={ink} />
          <path {...stroke} d="M32 61q18 16 36 0" strokeWidth="7" />
        </>
      );
    case "wow":
      return (
        <>
          <path {...stroke} d="M27 29q8-6 16 0M57 29q8-6 16 0" strokeWidth="4" />
          <circle cx="35" cy="42" r="6.5" fill={ink} />
          <circle cx="65" cy="42" r="6.5" fill={ink} />
          <ellipse cx="50" cy="67" rx="8" ry="10" fill={ink} />
        </>
      );
    case "grin":
      return (
        <>
          <circle cx="35" cy="39" r="6.5" fill={ink} />
          <circle cx="65" cy="39" r="6.5" fill={ink} />
          <path d="M27 54h46q0 24-23 24t-23-24z" fill={ink} />
          <path d="M32 54h36v5q-18 5-36 0z" fill="#fff" />
        </>
      );
    case "sleepy":
      return (
        <>
          <path {...stroke} d="M27 43q8 7 16 0M57 43q8 7 16 0" strokeWidth="5.5" />
          <path {...stroke} d="M43 64q7 5 14 0" strokeWidth="5.5" />
          <path {...stroke} d="M66 13h10l-10 11h10M81 4h6l-6 7h6" strokeWidth="3.5" />
        </>
      );
  }
}

type AvatarProps = {
  avatar: string;
  /** @deprecated O avatar não mostra mais a inicial do nome; pode ser omitido. */
  name?: string;
  /** Em px na escala normal; vira rem para crescer nas TVs. Classes de tamanho (size-*, w-full) sobrepõem. */
  size?: number;
  className?: string;
};

/** Avatar do perfil: degradê, padrão e rostinho em SVG. Decorativo: o nome do perfil fica ao lado. */
export function Avatar({ avatar, size = 40, className = "" }: AvatarProps) {
  const a = avatarById(avatar);
  // Ids por instância (vários avatares na página); só caracteres seguros dentro de url(#...).
  const uid = useId().replace(/[^\w-]/g, "");
  const length = `${size / 16}rem`;
  return (
    <svg
      width={length}
      height={length}
      viewBox="0 0 100 100"
      aria-hidden="true"
      focusable="false"
      className={`shrink-0 rounded-[22%] ${className}`}
    >
      <defs>
        <linearGradient id={`${uid}-bg`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={a.from} />
          <stop offset="1" stopColor={a.to} />
        </linearGradient>
        <clipPath id={`${uid}-clip`}>
          <rect width="100" height="100" rx="22" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${uid}-clip)`}>
        <rect width="100" height="100" fill={`url(#${uid}-bg)`} />
        <g opacity="0.17">
          <Pattern pattern={a.pattern} />
        </g>
        <Face face={a.face} ink={a.ink ?? DARK_INK} />
      </g>
    </svg>
  );
}

/**
 * Escolha do avatar: um grupo de rádio (as setas do teclado ou do controle remoto trocam a opção).
 * Fica neste arquivo para os formulários de criar e editar perfil; recebe valor e onChange de um
 * componente cliente.
 */
export function AvatarPicker({ value, onChange, legend = "Avatar" }: { value: string; onChange: (id: string) => void; legend?: string }) {
  return (
    <fieldset>
      <legend className="mb-3 text-sm text-muted">{legend}</legend>
      <div className="grid grid-cols-4 gap-3 min-[26rem]:grid-cols-6 sm:gap-3.5">
        {AVATARS.map((a) => {
          const checked = value === a.id;
          return (
            <label key={a.id} className="group relative block cursor-pointer">
              {/* O rádio de verdade fica transparente por cima do desenho: toque, clique e leitor de tela no mesmo lugar. */}
              <input
                type="radio"
                name="avatar"
                value={a.id}
                checked={checked}
                onChange={() => onChange(a.id)}
                aria-label={a.label}
                className="peer absolute inset-0 z-10 cursor-pointer appearance-none opacity-0"
              />
              <Avatar
                avatar={a.id}
                className={`h-auto w-full outline-2 outline-offset-3 outline-transparent transition duration-300 ease-out-expo group-hover:scale-105 group-active:scale-95 peer-focus-visible:scale-105 peer-focus-visible:outline-text ${
                  checked ? "ring-3 ring-amber" : "opacity-80 group-hover:opacity-100"
                }`}
              />
              {checked && (
                <span
                  aria-hidden="true"
                  className="absolute -right-1.5 -top-1.5 grid size-5 animate-scale-in place-items-center rounded-full bg-amber text-ink shadow-md shadow-black/40"
                >
                  <Icon name="check" size={13} />
                </span>
              )}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

// Grade de perfis de "Quem está assistindo?" e "Gerenciar perfis".

/** Largura de cada perfil: 2 por linha nos celulares, até 5; menor no celular deitado (cabe numa linha). */
export const PROFILE_TILE = "w-32 sm:w-36 lg:w-40 xl:w-44 3xl:w-52 4xl:w-60 [@media(max-height:31rem)]:w-22";
/** Moldura do avatar dentro de um .group: anel e leve zoom no mouse e no foco do teclado/controle remoto. */
export const PROFILE_FRAME =
  "relative block aspect-square w-full rounded-[22%] outline-3 outline-offset-3 outline-transparent transition duration-300 ease-out-expo group-hover:scale-105 group-hover:outline-text/90 group-focus-visible:scale-105 group-focus-visible:outline-amber group-active:scale-[0.97]";
/** Nome do perfil embaixo do avatar. */
export const PROFILE_NAME =
  "max-w-full truncate text-sm text-muted transition-colors group-hover:text-text group-focus-visible:text-text sm:text-base 3xl:text-lg";

/** Último item da grade: "Novo perfil" (até MAX_PROFILES). */
export function AddProfileTile({ delay }: { delay: number }) {
  return (
    <li className={`${PROFILE_TILE} animate-fade-up`} style={{ animationDelay: `${delay}ms` }}>
      <Link href="/profiles/new" className="group flex flex-col items-center gap-3 rounded-2xl focus-visible:outline-none!">
        <span
          className={`${PROFILE_FRAME} grid place-items-center border-2 border-dashed border-line bg-white/[0.02] text-muted group-hover:border-text/50 group-hover:text-text`}
        >
          <Icon name="plus" size={40} className="size-1/3 transition-transform duration-300 ease-out-expo group-hover:rotate-90" />
        </span>
        <span className={PROFILE_NAME}>Novo perfil</span>
      </Link>
    </li>
  );
}
