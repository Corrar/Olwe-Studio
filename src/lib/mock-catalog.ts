import type { MediaType, TitleDetails } from "./types";

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

const CAST_NAMES = ["Lia Monteiro", "Caio Rezende", "Iara Batista", "Tomás Albuquerque", "Nina Sayuri", "Rafael Okoye", "Bea Lacerda", "Joca Martins"];

function build(seed: Seed): TitleDetails {
  const [id, type, title, year, rating, genreIds, overview] = seed;
  return {
    id,
    type,
    title,
    overview,
    posterPath: null,
    backdropPath: null,
    year,
    rating,
    genreIds,
    tagline: null,
    genres: [],
    runtime: type === "movie" ? 95 + (id % 7) * 6 : null,
    seasons:
      type === "tv"
        ? Array.from({ length: 1 + (id % 3) }, (_, i) => ({
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
      profilePath: null,
    })),
    trailerKey: null,
    certification: ["L", "10", "12", "14", "16"][id % 5],
    recommendations: [],
  };
}

export const MOCK_TITLES: TitleDetails[] = SEEDS.map(build);

export function mockList(filter: (t: TitleDetails) => boolean = () => true, offset = 0) {
  const list = MOCK_TITLES.filter(filter);
  return [...list.slice(offset % Math.max(list.length, 1)), ...list.slice(0, offset % Math.max(list.length, 1))];
}
