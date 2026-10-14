import "server-only";
import { ARCHIVE_SHELVES, archiveTextQuery, getArchiveDetails, searchArchive } from "./sources/archive";
import { COMMONS_SHELVES, commonsTextQuery, getCommonsDetails, searchCommons } from "./sources/commons";
import { cleanTitle, mapLimit } from "./sources/shared";
import { findMovieArtwork, isDemoCatalog } from "./tmdb";
import type { FullMovieSource, Title, TitleDetails } from "./types";

// Filmes completos e gratuitos de fontes com licença aberta: Wikimedia Commons (HD) e Internet Archive.

export type FreeShelf = { key: string; label: string; source: FullMovieSource; kids: boolean };

// O perfil infantil só recebe a coleção de desenhos curada pelo Internet Archive. As buscas abertas
// do Commons não têm moderação de conteúdo para crianças.
export const FREE_SHELVES: FreeShelf[] = [
  ...COMMONS_SHELVES.map((s) => ({ key: s.key, label: s.label, source: "commons" as const, kids: false })),
  ...ARCHIVE_SHELVES.map((s) => ({ key: s.key, label: s.label, source: "archive" as const, kids: s.key === "desenhos" })),
];

export const KIDS_SHELVES = FREE_SHELVES.filter((s) => s.kids);

/**
 * Troca a miniatura da fonte pelo pôster (e pela sinopse em português) do TMDB quando acha o mesmo
 * filme: título exato e ano até 1 de diferença. Sem ano não há como confirmar, então fica a arte da fonte.
 */
async function withArtwork<T extends Title>(item: T): Promise<T> {
  if (!item.year) return item;
  const lookup = await findMovieArtwork(cleanTitle(item.title), item.year);
  // Sem a verificação no TMDB não dá para saber se é adulto ou qual a classificação: fica oculto.
  if (lookup.status === "error") return { ...item, ratingUnconfirmed: true };
  if (lookup.status === "none") return item;
  const match = lookup.match;
  // Filme marcado como adulto no TMDB: some de todas as listas e páginas.
  if (match.adult) return { ...item, adult: true };
  return {
    ...item,
    tmdbMatchId: match.id,
    // Os gêneros do TMDB entram na estimativa de classificação quando o filme não tem classificação.
    genreIds: [...new Set([...item.genreIds, ...match.genreIds])],
    poster: match.poster ?? item.poster,
    backdrop: match.backdrop ?? match.poster ?? item.backdrop,
    overview: match.overview || item.overview,
  };
}

const enrich = (items: Title[]) => mapLimit(items, 8, withArtwork);

// Quantos resultados do Internet Archive cada página cobre (cada um exige uma consulta de metadados).
const ARCHIVE_ROW_WINDOW = 32;
const ARCHIVE_PAGE_WINDOW = 48;

/** Fileira de uma prateleira (primeiros `rows` filmes). */
export async function getFreeShelf(key: string, rows = 16): Promise<Title[]> {
  const shelf = FREE_SHELVES.find((s) => s.key === key);
  if (!shelf) return [];
  if (isDemoCatalog) return DEMO.filter((t) => t.type === shelf.source).slice(0, rows);

  if (shelf.source === "commons") {
    const s = COMMONS_SHELVES.find((c) => c.key === key)!;
    return enrich((await searchCommons(s.query, s.minMinutes, { rows })).items);
  }
  const s = ARCHIVE_SHELVES.find((a) => a.key === key)!;
  return enrich((await searchArchive(s.query, { window: ARCHIVE_ROW_WINDOW, rows })).items);
}

/** Página do "Ver tudo": todos os aprovados daquela página da fonte, e se existe próxima página. */
export async function getFreeShelfPage(key: string, page: number): Promise<{ items: Title[]; hasMore: boolean }> {
  const shelf = FREE_SHELVES.find((s) => s.key === key);
  if (!shelf) return { items: [], hasMore: false };
  if (isDemoCatalog) return { items: page === 1 ? DEMO.filter((t) => t.type === shelf.source) : [], hasMore: false };

  const commons = COMMONS_SHELVES.find((c) => c.key === key);
  const result = commons
    ? await searchCommons(commons.query, commons.minMinutes, { page })
    : await searchArchive(ARCHIVE_SHELVES.find((a) => a.key === key)!.query, { window: ARCHIVE_PAGE_WINDOW, page });
  return { items: await enrich(result.items), hasMore: result.hasMore };
}

export async function getFreeTitle(type: FullMovieSource, id: string): Promise<TitleDetails | null> {
  if (isDemoCatalog) return DEMO.find((t) => t.type === type && t.id === id) ?? null;
  const details = type === "commons" ? await getCommonsDetails(id) : await getArchiveDetails(id);
  return details ? withArtwork(details) : null;
}

/** Busca nas fontes livres; perfis infantis buscam só na coleção de desenhos do Internet Archive. */
export async function searchFree(text: string, { kids = false }: { kids?: boolean } = {}): Promise<Title[]> {
  if (isDemoCatalog) {
    const needle = text.trim().toLocaleLowerCase("pt-BR");
    return needle ? DEMO.filter((t) => (!kids || t.type === "archive") && t.title.toLocaleLowerCase("pt-BR").includes(needle)) : [];
  }
  const commonsQuery = kids ? null : commonsTextQuery(text);
  const archiveQuery = archiveTextQuery(text, { kids });
  const [commons, archive] = await Promise.all([
    commonsQuery ? searchCommons(commonsQuery, 5, { rows: 15 }) : { items: [] },
    archiveQuery ? searchArchive(archiveQuery, { window: 20, rows: 10 }) : { items: [] },
  ]);
  // HD primeiro.
  return enrich([...commons.items, ...archive.items]);
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
  isNew: id === "Olwe demo Origami.webm",
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
