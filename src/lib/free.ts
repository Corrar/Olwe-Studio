import "server-only";
import { ARCHIVE_SHELVES, archiveTextQuery, getArchiveDetails, searchArchive } from "./sources/archive";
import { COMMONS_SHELVES, commonsTextQuery, getCommonsDetails, searchCommons } from "./sources/commons";
import { cleanTitle, mapLimit } from "./sources/shared";
import { findMovieArtwork, isDemoCatalog } from "./tmdb";
import type { FullMovieSource, Title, TitleDetails } from "./types";

// Filmes completos e gratuitos de fontes com licença aberta: Wikimedia Commons (HD) e Internet Archive.

export type FreeShelf = { key: string; label: string; source: FullMovieSource; kids: boolean };

export const FREE_SHELVES: FreeShelf[] = [
  ...COMMONS_SHELVES.map((s) => ({ key: s.key, label: s.label, source: "commons" as const, kids: s.key === "animacao-hd" })),
  ...ARCHIVE_SHELVES.map((s) => ({ key: s.key, label: s.label, source: "archive" as const, kids: s.key === "desenhos" })),
];

export const KIDS_SHELVES = FREE_SHELVES.filter((s) => s.kids);

/** Troca a miniatura da fonte pelo pôster do TMDB quando acha o mesmo filme. */
async function withArtwork<T extends Title>(item: T): Promise<T> {
  const match = await findMovieArtwork(cleanTitle(item.title), item.year);
  if (!match) return item;
  return {
    ...item,
    poster: match.poster ?? item.poster,
    backdrop: match.backdrop ?? match.poster ?? item.backdrop,
    overview: match.overview || item.overview,
  };
}

const enrich = (items: Title[]) => mapLimit(items, 8, withArtwork);

export async function getFreeShelf(key: string, rows = 20, page = 1): Promise<Title[]> {
  const shelf = FREE_SHELVES.find((s) => s.key === key);
  if (!shelf) return [];
  if (isDemoCatalog) return page === 1 ? DEMO.filter((t) => t.type === shelf.source).slice(0, rows) : [];

  if (shelf.source === "commons") {
    const s = COMMONS_SHELVES.find((c) => c.key === key)!;
    return enrich(await searchCommons(s.query, s.minMinutes, rows, page));
  }
  const s = ARCHIVE_SHELVES.find((a) => a.key === key)!;
  return enrich(await searchArchive(s.query, rows, page));
}

export async function getFreeTitle(type: FullMovieSource, id: string): Promise<TitleDetails | null> {
  if (isDemoCatalog) return DEMO.find((t) => t.type === type && t.id === id) ?? null;
  const details = type === "commons" ? await getCommonsDetails(id) : await getArchiveDetails(id);
  return details ? withArtwork(details) : null;
}

export async function searchFree(text: string): Promise<Title[]> {
  if (isDemoCatalog) {
    const needle = text.trim().toLocaleLowerCase("pt-BR");
    return needle ? DEMO.filter((t) => t.title.toLocaleLowerCase("pt-BR").includes(needle)) : [];
  }
  const commonsQuery = commonsTextQuery(text);
  const archiveQuery = archiveTextQuery(text);
  const [commons, archive] = await Promise.all([
    commonsQuery ? searchCommons(commonsQuery, 5, 15) : [],
    archiveQuery ? searchArchive(archiveQuery, 15) : [],
  ]);
  // HD primeiro.
  return enrich([...commons, ...archive]);
}

// Itens de demonstração (sem TMDB_API_KEY): fictícios e sem vídeo.
const DEMO: TitleDetails[] = (
  [
    ["archive", "olwe-demo-farol", "O Farol de Papel", "1934", "SD", "Comédia muda sobre um faroleiro que constrói um farol inteiro de jornal."],
    ["archive", "olwe-demo-trem", "Último Trem para Vila Serena", "1948", "SD", "Um detetive cansado investiga um roubo dentro de um trem noturno."],
    ["archive", "olwe-demo-lua", "Viagem à Lua de Prata", "1952", "HD", "Três inventores constroem um foguete no quintal e decolam por engano."],
    ["archive", "olwe-demo-pradaria", "Pradaria Vermelha", "1939", "SD", "Um xerife sem arma precisa manter a paz numa cidade de fronteira."],
    ["commons", "Olwe demo Neblina.webm", "Neblina sobre o Cais", "1927", "Full HD", "Curta mudo restaurado sobre pescadores que esperam um barco que não volta."],
    ["commons", "Olwe demo Origami.webm", "Origami", null, "4K", "Animação aberta sobre um pássaro de papel que aprende a voar numa tempestade."],
  ] as const
).map(([type, id, title, year, quality, overview]) => ({
  id,
  type,
  title,
  overview,
  poster: null,
  backdrop: null,
  year,
  rating: 0,
  genreIds: [],
  quality,
  tagline: null,
  genres: [],
  runtime: type === "commons" ? 12 : 80,
  seasons: [],
  cast: [],
  trailerKey: null,
  certification: null,
  recommendations: [],
  providers: null,
  videoSources: [],
  sourceUrl: null,
  sourceName: type === "commons" ? "Wikimedia Commons" : "Internet Archive",
  license: null,
  licenseName: type === "commons" ? "CC BY 4.0" : "Domínio público",
  credit: type === "commons" ? "Estúdio fictício de demonstração" : null,
}));
