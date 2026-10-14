// Regras legais do catálogo para transmissão no Brasil. Sem dependências de servidor: testáveis isoladamente.
//
// 1. Direito autoral (Lei 9.610/98, art. 44): obras audiovisuais ficam protegidas por 70 anos contados
//    de 1º de janeiro do ano seguinte ao da divulgação. Muitos filmes marcados como "domínio público"
//    no Internet Archive e no Commons só estão livres nos EUA (registro não renovado, falta de aviso de
//    copyright etc.) e continuam protegidos no Brasil. Só passam os que já caíram em domínio público
//    aqui pela idade, ou os que têm licença Creative Commons dada pelo próprio titular.
// 2. Lei 7.716/89 (art. 20): veicular propaganda nazista ou conteúdo que incite discriminação racial é
//    crime. Filmes de propaganda nazista e desenhos racistas retirados de circulação ficam fora.
// 3. Títulos com proibição judicial ou com exploração sexual de menores (ECA, arts. 240 e 241).

export type LicenseKind = "public-domain" | "cc0" | "cc";

/** Último ano de lançamento já em domínio público no Brasil (ex.: em 2026, filmes de até 1955). */
export function brazilPublicDomainYear(now = new Date()) {
  return now.getFullYear() - 71;
}

// As licenças Creative Commons foram publicadas em dezembro de 2002.
const FIRST_CC_YEAR = 2002;

function yearNumber(year: string | number | null | undefined) {
  const y = Number(year);
  return Number.isInteger(y) && y >= 1880 && y <= 2100 ? y : null;
}

/**
 * Um filme livre pode ser transmitido no Brasil? Sim se já está em domínio público aqui pela idade;
 * senão, só com licença Creative Commons (CC BY, CC BY-SA, CC0) posterior à criação das licenças.
 * "Domínio público" declarado para um filme recente (ou sem ano) não vale no Brasil.
 */
export function streamableInBrazil(kind: LicenseKind, year: string | number | null | undefined, now = new Date()) {
  const y = yearNumber(year);
  if (y !== null && y <= brazilPublicDomainYear(now)) return true;
  if (kind === "public-domain") return false;
  // Um filme antigo "licenciado em Creative Commons" quase sempre foi enviado por quem não é o titular.
  return y === null || y >= FIRST_CC_YEAR;
}

type Restricted = { names: string[]; year?: number; reason: string };

const NAZI = "Propaganda nazista (Lei 7.716/89, art. 20)";
const RACIST = "Conteúdo racista retirado de circulação (Lei 7.716/89)";
const COURT = "Exibição proibida ou conteúdo com exploração de menores";

// Títulos em alemão, inglês e português (os nomes passam pela mesma normalização dos títulos).
const RESTRICTED: Restricted[] = [
  { names: ["triumph des willens", "triumph of the will", "o triunfo da vontade", "triunfo da vontade"], year: 1935, reason: NAZI },
  { names: ["sieg des glaubens", "victory of faith", "a vitoria da fe"], year: 1933, reason: NAZI },
  { names: ["tag der freiheit"], year: 1935, reason: NAZI },
  { names: ["der ewige jude", "the eternal jew", "o judeu eterno"], year: 1940, reason: NAZI },
  { names: ["jud suss", "jud suess", "o judeu suss"], year: 1940, reason: NAZI },
  { names: ["die rothschilds"], year: 1940, reason: NAZI },
  { names: ["hitlerjunge quex"], year: 1933, reason: NAZI },
  { names: ["hans westmar"], year: 1933, reason: NAZI },
  { names: ["sa mann brand"], year: 1933, reason: NAZI },
  { names: ["kolberg"], year: 1945, reason: NAZI },
  { names: ["ohm kruger", "ohm krueger"], year: 1941, reason: NAZI },
  { names: ["heimkehr"], year: 1941, reason: NAZI },
  { names: ["ich klage an"], year: 1941, reason: NAZI },
  { names: ["stukas"], year: 1941, reason: NAZI },
  { names: ["kadetten"], year: 1941, reason: NAZI },
  { names: ["feuertaufe", "baptism of fire"], year: 1940, reason: NAZI },
  { names: ["feldzug in polen", "campaign in poland"], year: 1940, reason: NAZI },
  { names: ["der sieg im westen", "victory in the west"], year: 1941, reason: NAZI },
  { names: ["the birth of a nation", "o nascimento de uma nacao"], year: 1915, reason: RACIST },
  // "Censored Eleven" da Warner e desenhos da Segunda Guerra com caricaturas raciais.
  { names: ["hittin the trail for hallelujah land"], year: 1931, reason: RACIST },
  { names: ["sunday go to meetin time"], year: 1936, reason: RACIST },
  { names: ["clean pastures"], year: 1937, reason: RACIST },
  { names: ["uncle tom s bungalow", "uncle toms bungalow"], year: 1937, reason: RACIST },
  { names: ["jungle jitters"], year: 1938, reason: RACIST },
  { names: ["the isle of pingo pongo", "isle of pingo pongo"], year: 1938, reason: RACIST },
  { names: ["all this and rabbit stew"], year: 1941, reason: RACIST },
  { names: ["coal black and de sebben dwarfs"], year: 1943, reason: RACIST },
  { names: ["tin pan alley cats"], year: 1943, reason: RACIST },
  { names: ["angel puss"], year: 1944, reason: RACIST },
  { names: ["goldilocks and the jivin bears"], year: 1944, reason: RACIST },
  { names: ["bugs bunny nips the nips"], year: 1944, reason: RACIST },
  { names: ["tokio jokio"], year: 1943, reason: RACIST },
  { names: ["you re a sap mr jap", "youre a sap mr jap"], year: 1942, reason: RACIST },
  { names: ["scrap the japs"], year: 1942, reason: RACIST },
  { names: ["japoteurs"], year: 1942, reason: RACIST },
  { names: ["a serbian film", "srpski film", "um filme servio"], year: 2010, reason: COURT },
  { names: ["maladolescenza"], year: 1977, reason: COURT },
];

// Assuntos (tags) do Internet Archive que marcam propaganda nazista ou racista.
const RESTRICTED_SUBJECT = /\b(nazi propaganda|propaganda nazista|antisemitic propaganda|anti-semitic propaganda|racist propaganda)\b/i;

/** Mesma normalização para títulos e nomes da lista: minúsculas, sem acentos nem pontuação. */
export function normalizeTitle(text: string) {
  return text
    .replace(/ß/g, "ss")
    .toLocaleLowerCase("en")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * Motivo legal para o título não ser exibido, ou null. Compara o título (e o original) com a lista,
 * como palavras inteiras, e o ano com tolerância de 1 (sem ano conhecido, vale só o nome).
 */
export function legalRestriction(
  item: { title: string; originalTitle?: string | null; year?: string | number | null },
  subjects: string[] = [],
): string | null {
  if (subjects.some((s) => RESTRICTED_SUBJECT.test(s))) return NAZI;
  const titles = [item.title, item.originalTitle ?? ""].filter(Boolean).map((t) => ` ${normalizeTitle(t)} `);
  const year = yearNumber(item.year);
  for (const entry of RESTRICTED) {
    if (entry.year && year !== null && Math.abs(year - entry.year) > 1) continue;
    if (entry.names.some((name) => titles.some((t) => t.includes(` ${name} `)))) return entry.reason;
  }
  return null;
}
