import type { Title } from "@/lib/types";
import { Row } from "./row";
import { TitleCard } from "./title-card";

/** Fileira de capas. Sem títulos (por exemplo, todos fora do limite do perfil), a fileira some. */
export function TitleRow({ title, items, href }: { title: string; items: Title[]; href?: string }) {
  if (items.length === 0) return null;
  return (
    <Row title={title} href={href}>
      {items.map((t) => (
        <TitleCard key={`${t.type}-${t.id}`} title={t} />
      ))}
    </Row>
  );
}
