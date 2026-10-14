import { useId } from "react";
import type { Title } from "@/lib/types";
import { Row } from "./row";
import { TitleCard } from "./title-card";

// Geometria em unidades do SVG: 100 = var(--card-w) e 150 = altura do cartão (2:3). Medido na Sora 800:
// algarismos com ~0,75em de altura; o mais largo ("0") tem ~0,67em de tinta. O cartão cobre a ponta direita do número.
const FONT = 170;
const BASELINE = 146;
const OVERLAP = 34;
const SINGLE = { box: 120, anchor: 126 };
const TEN = { box: 186, anchor: 192 };

/** Top 10 no estilo Netflix: número enorme contornado atrás de cada capa. A lista já vem filtrada para o perfil. */
export function Top10Row({ title, items }: { title: string; items: Title[] }) {
  const top = items.slice(0, 10);
  if (top.length === 0) return null;
  return (
    <Row title={title}>
      {top.map((t, i) => (
        <RankedCard key={`${t.type}-${t.id}`} title={t} rank={i + 1} />
      ))}
    </Row>
  );
}

function RankedCard({ title, rank }: { title: Title; rank: number }) {
  const gradient = `rank-${useId().replace(/[^\w-]/g, "")}`;
  const { box, anchor } = rank === 10 ? TEN : SINGLE;
  const numeral = (
    <text x={anchor} y={BASELINE} textAnchor="end" fontSize={FONT} fontWeight={800} paintOrder="stroke" strokeWidth={4} strokeLinejoin="round">
      {/* No "10", o zero chega mais perto do um, como nos números da Netflix. */}
      {rank === 10 ? (
        <>
          <tspan>1</tspan>
          <tspan dx={-12}>0</tspan>
        </>
      ) : (
        rank
      )}
    </text>
  );

  return (
    <div
      className="group/rank relative flex shrink-0 snap-start"
      style={{ paddingLeft: `calc(var(--card-w) * ${(box - OVERLAP) / 100})` }}
    >
      <svg
        aria-hidden="true"
        viewBox={`0 0 ${box} 150`}
        className="absolute left-0 top-0 overflow-visible font-display transition-transform duration-500 ease-out-expo pointer-fine:group-hover/rank:-translate-x-[3%]"
        style={{ width: `calc(var(--card-w) * ${box / 100})`, height: "calc(var(--card-w) * 1.5)" }}
      >
        <defs>
          <linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--amber)" />
            <stop offset="1" stopColor="var(--ember)" />
          </linearGradient>
        </defs>
        <g className="fill-ink stroke-muted/55">{numeral}</g>
        {/* Contorno na cor da marca ao passar o mouse ou focar o cartão. */}
        <g
          className="fill-ink opacity-0 transition-opacity duration-300 group-focus-within/rank:opacity-100 pointer-fine:group-hover/rank:opacity-100"
          stroke={`url(#${gradient})`}
        >
          {numeral}
        </g>
      </svg>
      <TitleCard title={title} rank={rank} />
    </div>
  );
}
