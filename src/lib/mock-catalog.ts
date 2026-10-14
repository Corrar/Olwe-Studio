import { todayInBrazil, type Episode, type MediaType, type TitleDetails } from "./types";

// Catálogo fictício usado quando TMDB_API_KEY não está definida.
// Todos os títulos e sinopses são originais, criados para demonstração.
type Seed = [id: number, type: MediaType, title: string, year: string, rating: number, genres: number[], overview: string];

const SEEDS: Seed[] = [
  [9001, "movie", "Maré de Cobre", "2025", 7.8, [28, 53], "Uma mergulhadora de resgate descobre que o navio afundado que ela explora guarda a prova de um crime que a cidade inteira quer esquecer."],
  [9002, "movie", "O Último Farol de Itaúna", "2024", 8.1, [18, 9648], "Quando o faroleiro mais velho do litoral desaparece, sua neta volta para casa e encontra cartas que reescrevem a história da família."],
  [9003, "movie", "Órbita Baixa", "2026", 7.4, [878, 12], "Seis técnicos ficam presos numa estação de reparos depois que uma tempestade solar corta a comunicação com a Terra."],
  [9004, "movie", "Cozinha de Domingo", "2023", 7.1, [35, 10751], "Três irmãos que não se falam há anos precisam reabrir o restaurante da avó em apenas uma semana."],
  [9005, "movie", "Sombra no Canavial", "2025", 6.9, [27, 9648], "Uma equipe de documentário vai filmar uma lenda rural e percebe tarde demais que alguém está seguindo o roteiro por eles."],
  [9006, "movie", "Passos de Vidro", "2024", 7.6, [18, 10402], "Uma bailarina com uma lesão no tornozelo troca o palco pela batalha de dança de rua mais disputada de Salvador."],
  [9007, "movie", "A Caçada de Vento Norte", "2026", 7.2, [12, 14], "Uma cartógrafa aprendiz segue um mapa vivo que muda de forma a cada lua cheia."],
  [9008, "movie", "Protocolo Jacarandá", "2025", 7.0, [28, 80], "Um negociador aposentado é chamado de volta para mediar um sequestro dentro do maior shopping de Curitiba."],
  [9009, "movie", "Pequenos Gigantes", "2023", 7.9, [16, 10751], "Uma colônia de formigas inventoras precisa salvar o jardim antes que a reforma da casa o transforme em estacionamento."],
  [9010, "movie", "Duas Margens", "2024", 7.5, [10749, 18], "Um barqueiro e uma bióloga se encontram todo verão na mesma travessia do rio, por dez anos seguidos."],
  [9011, "movie", "Arquivo Morto", "2022", 6.8, [53, 80], "Uma estagiária de cartório encontra uma escritura assinada por alguém que morreu cinquenta anos antes."],
  [9012, "movie", "Gente da Serra", "2025", 8.3, [99], "Um retrato de quatro estações das famílias que mantêm vivas as últimas plantações de café de altitude da Mantiqueira."],
  [9013, "movie", "Noite Sem Volta", "2025", 6.4, [53, 80], "Título fictício classificado como 18 anos, usado para testar que conteúdo adulto nunca aparece no Olwe."],
  [9101, "tv", "Linha Vermelha", "2024", 8.4, [80, 18], "Uma delegada recém-transferida desmonta, caso a caso, a rede de corrupção do próprio departamento."],
  [9102, "tv", "Estação Aurora", "2025", 7.9, [10765, 9648], "Em uma cidade onde o sol não se põe há três anos, um adolescente encontra a primeira noite escondida num sótão."],
  [9103, "tv", "Os Vizinhos do 302", "2023", 7.3, [35], "Um condomínio barulhento, uma síndica implacável e uma reunião de moradores que nunca termina."],
  [9104, "tv", "Coroa de Areia", "2026", 8.0, [10759, 18], "Duas famílias rivais disputam o controle das rotas de comércio de um deserto inventado."],
  [9105, "tv", "Laboratório Lúdico", "2024", 7.7, [10762, 16], "Uma cientista mirim e seu robô de papelão respondem às perguntas mais curiosas das crianças."],
  [9106, "tv", "Fronteira Fria", "2025", 7.6, [9648, 80], "Num posto de fronteira isolado nos Andes, cada viajante esconde um segredo e a nevasca não dá trégua."],
  [9107, "tv", "Mesa Posta", "2023", 7.2, [99], "Chefs de cozinha viajam pelo interior do Brasil reaprendendo receitas que só existem na memória de quem as faz."],
  [9108, "tv", "Código Âmbar", "2026", 7.8, [10765, 10759], "Uma hacker descobre que a inteligência artificial que ela ajudou a criar está tentando falar com ela."],
  [9109, "tv", "Família Quase Perfeita", "2022", 7.0, [35, 10751], "Depois de um sorteio milionário, uma família comum tenta continuar exatamente igual. Não consegue."],
  [9110, "tv", "Ecos do Sertão", "2025", 8.2, [18, 10768], "Uma saga de três gerações marcada pela seca, pela política e por uma promessa feita na beira de um açude."],
];

// Estreias fictícias da fileira "Em breve": a data conta a partir de hoje, então estão sempre no futuro.
type UpcomingSeed = [id: number, title: string, daysAhead: number, genres: number[], overview: string];

const UPCOMING_SEEDS: UpcomingSeed[] = [
  [9201, "Céu de Chumbo", 6, [28, 878], "Quando uma nuvem metálica para sobre Belo Horizonte, uma piloto de drones de entrega é a única que consegue chegar ao centro dela."],
  [9202, "A Feira das Coisas Perdidas", 13, [14, 10751], "Toda primeira lua do mês, uma feira aparece no fim da linha do trem e vende tudo o que alguém já perdeu. Uma menina vai buscar a voz do avô."],
  [9203, "Bairro Alto, 1979", 27, [18, 10402], "Uma banda de garagem paulistana tem um verão para gravar o primeiro disco antes que a gravadora feche as portas."],
  [9204, "O Silêncio da Ilha Rasa", 41, [53, 9648], "Uma perita em acústica é enviada a uma ilha onde, há uma semana, nenhum som se propaga depois do pôr do sol."],
  [9205, "Corrida dos Vaga-lumes", 64, [16, 12], "Um vaga-lume que não acende se inscreve na corrida mais famosa da floresta, guiado por uma coruja que não enxerga de dia."],
];

// Classificações coerentes com cada sinopse (o 9013 existe só para testar que 18+ é removido).
const CERTIFICATIONS: Record<number, string> = {
  9001: "14", 9002: "12", 9003: "12", 9004: "L", 9005: "16", 9006: "10", 9007: "10", 9008: "14", 9009: "L",
  9010: "12", 9011: "14", 9012: "L", 9013: "18", 9101: "16", 9102: "12", 9103: "10", 9104: "14", 9105: "L",
  9106: "14", 9107: "L", 9108: "12", 9109: "10", 9110: "14", 9201: "14", 9202: "L", 9203: "12", 9204: "14",
  9205: "L",
};

// Ranking fictício do Top 10 (inclui o 18+, que forViewer sempre remove).
const TOP_TRENDING: Record<"movie" | "tv", number[]> = {
  movie: [9003, 9001, 9007, 9013, 9002, 9008, 9006, 9009, 9005, 9012, 9010, 9004, 9011],
  tv: [9104, 9101, 9108, 9110, 9102, 9106, 9103, 9105, 9107, 9109],
};

const CAST_NAMES = ["Lia Monteiro", "Caio Rezende", "Iara Batista", "Tomás Albuquerque", "Nina Sayuri", "Rafael Okoye", "Bea Lacerda", "Joca Martins"];

const DAY = 24 * 60 * 60 * 1000;
const TODAY = todayInBrazil();
const CURRENT_YEAR = Number(TODAY.slice(0, 4));
const isoDay = (time: number) => new Date(time).toISOString().slice(0, 10);

/** Data de lançamento fixa dentro do ano do título, nunca depois de ontem. */
function pastRelease(id: number, year: string) {
  const y = Number(year);
  return isoDay(Math.max(Date.UTC(y, 0, 1), Math.min(Date.UTC(y, id % 12, 1 + (id % 28)), Date.parse(TODAY) - DAY)));
}

function build(seed: Seed, releaseDate: string): TitleDetails {
  const [id, type, title, year, rating, genreIds, overview] = seed;
  return {
    id: String(id),
    type,
    title,
    overview,
    poster: null,
    backdrop: null,
    year,
    releaseDate,
    rating,
    genreIds,
    isNew: releaseDate <= TODAY && Number(year) >= CURRENT_YEAR,
    tagline: null,
    genres: [],
    runtime: type === "movie" ? 95 + (id % 7) * 6 : null,
    // Uma temporada por ano desde a estreia, sem passar do ano atual.
    seasons:
      type === "tv"
        ? Array.from({ length: Math.min(1 + (id % 3), CURRENT_YEAR - Number(year) + 1) }, (_, i) => ({
            number: i + 1,
            name: `Temporada ${i + 1}`,
            episodeCount: 6 + ((id + i) % 5),
            year: String(Number(year) + i),
          }))
        : [],
    cast: CAST_NAMES.slice(id % 3, (id % 3) + 5).map((name, i) => ({
      id: id * 10 + i,
      name,
      character: `Personagem ${i + 1}`,
      photo: null,
    })),
    trailerKey: null,
    certification: CERTIFICATIONS[id] ?? "14",
    recommendations: [],
    providers: null,
    videoSources: [],
    sourceUrl: null,
    sourceName: null,
    license: null,
    licenseName: null,
    credit: null,
  };
}

export const MOCK_TITLES: TitleDetails[] = [
  ...SEEDS.map((seed) => build(seed, pastRelease(seed[0], seed[3]))),
  ...UPCOMING_SEEDS.map(([id, title, daysAhead, genres, overview]) => {
    const date = isoDay(Date.parse(TODAY) + daysAhead * DAY);
    return build([id, "movie", title, date.slice(0, 4), 0, genres, overview], date);
  }),
];

/** Títulos já lançados (as estreias de "Em breve" só entram nas listas quando a data chega). */
export function mockList(filter: (t: TitleDetails) => boolean = () => true, offset = 0) {
  const today = todayInBrazil();
  const list = MOCK_TITLES.filter((t) => (!t.releaseDate || t.releaseDate <= today) && filter(t));
  return [...list.slice(offset % Math.max(list.length, 1)), ...list.slice(0, offset % Math.max(list.length, 1))];
}

export function mockTopTrending(type: "movie" | "tv"): TitleDetails[] {
  return TOP_TRENDING[type]
    .map((id) => MOCK_TITLES.find((t) => t.type === type && t.id === String(id)))
    .filter((t): t is TitleDetails => !!t);
}

const EPISODE_NAMES = [
  "O Primeiro Sinal", "Fora do Mapa", "Linha Cruzada", "A Noite Mais Longa", "Moeda de Troca", "Ponto Cego",
  "Velhos Conhecidos", "Contra a Corrente", "O Que Ficou para Trás", "Terra Firme", "Sem Saída", "A Outra Margem",
  "Fogo Cruzado", "Hora da Verdade", "Maré Alta", "Tudo ou Nada",
];

const EPISODE_PLOTS = [
  "Uma visita inesperada muda os planos de todo mundo.",
  "Um segredo antigo volta à tona no pior momento possível.",
  "Uma decisão difícil divide o grupo ao meio.",
  "Uma pista nova leva a um lugar que ninguém esperava.",
  "As alianças são postas à prova quando a pressão aumenta.",
  "Um dia comum sai completamente do controle.",
  "Uma escolha do passado finalmente cobra seu preço.",
  "Uma reviravolta coloca tudo o que foi conquistado em risco.",
  "Um reencontro reacende velhas disputas.",
  "Quando tudo parece resolvido, surge um novo problema.",
  "Uma noite em claro termina com uma revelação.",
  "Um plano arriscado precisa dar certo na primeira tentativa.",
];

/** Episódios fictícios e determinísticos de uma temporada das séries de demonstração. */
export function mockSeason(tvId: string, season: number): Episode[] | null {
  const show = MOCK_TITLES.find((t) => t.type === "tv" && t.id === tvId);
  const info = show?.seasons.find((s) => s.number === season);
  if (!show || !info) return null;
  const id = Number(show.id);
  const minutes = show.genreIds.includes(10762) ? 12 : show.genreIds.includes(35) ? 24 : 42;
  // Estreia no primeiro semestre do ano da temporada, um episódio por semana.
  const premiere = Date.UTC(Number(info.year), (id + season) % 6, 1 + (id % 20));
  return Array.from({ length: info.episodeCount }, (_, i) => {
    const number = i + 1;
    return {
      number,
      name: season === 1 && number === 1 ? "Piloto" : EPISODE_NAMES[(id * 7 + season * 5 + number * 3) % EPISODE_NAMES.length],
      overview: EPISODE_PLOTS[(id + season * 3 + number) % EPISODE_PLOTS.length],
      still: null,
      runtime: minutes + ((id + season + number) % 4) * 3,
      airDate: isoDay(premiere + i * 7 * DAY),
    };
  });
}
