# Olwe

Plataforma de streaming de filmes e séries com dois planos: **Olwe Grátis** (com um anúncio curto antes
dos filmes completos) e **Olwe Premium** (sem anúncios, pago pelo Mercado Pago). Identidade visual própria.
Next.js 16 (App Router) + TypeScript + Tailwind CSS 4, backend nas rotas do próprio Next,
banco libSQL/SQLite via Drizzle ORM e dois catálogos:

- **Filmes completos e grátis** do [Internet Archive](https://archive.org): só itens com licença declarada de
  domínio público ou Creative Commons. Tocam inteiros no player do Olwe.
- **Filmes e séries do [TMDB](https://www.themoviedb.org/)**: só sinopse, elenco e trailer, marcados como
  "Só sinopse e trailer", com a seção "Onde assistir" (dados do JustWatch) apontando para serviços legais.
  As fileiras "grátis em outros apps" mostram o que está grátis no Brasil em serviços como Pluto TV, Vix e Plex.

## Catálogo licenciado

Filmes com licença própria do Olwe (contrato com distribuidora, autorização do autor ou licença aberta),
cadastrados no painel **`/admin/titles`**, aberto só para as contas de `ADMIN_EMAILS` (num perfil adulto).

- Vídeo por **link oficial do YouTube** (do dono dos direitos), **arquivo MP4/WebM** ou **HLS (.m3u8)** em
  HTTPS, ou **envio direto para o Mux** pelo próprio painel. Fora do YouTube, tocam no player do Olwe, com o
  anúncio do Olwe Grátis antes. O HLS toca nativo no Safari/iPhone e pelo hls.js nos outros navegadores.
- **Mux**: o arquivo vai do navegador direto para o Mux, em partes (retoma se a rede oscilar); o painel espera
  o vídeo ficar pronto e preenche duração e qualidade. Com chave de assinatura, os vídeos ficam privados e o
  player recebe links que vencem em 6 horas. Trocar o vídeo ou excluir o filme apaga o vídeo antigo no Mux.
- **Janela da licença** (início e último dia): fora dela o filme some sozinho do app. O painel avisa as
  licenças que vencem nos próximos 30 dias.
- **Plano**: Grátis + Premium, ou **só Premium** (exclusivo para assinantes).
- **Classificação indicativa** obrigatória (L a 16; 18 não é aceito), seguida pelos perfis e pelo infantil.
- Com o **ID do TMDB**, pôster, sinopse, ano, duração e gêneros deixados em branco vêm de lá.
- Rascunhos (não publicados) só aparecem no painel. As anotações internas nunca aparecem no app.

## Planos e anúncios

- **Olwe Grátis**: um anúncio antes dos filmes completos (padrão VAST, Google IMA), da rede configurada em
  `AD_TAG_URL`. Sem a variável, ninguém vê anúncio. **Perfis infantis nunca veem anúncios** (Resolução 163
  do Conanda e CDC). Se o anúncio falhar, for bloqueado ou demorar mais de 8 segundos, o filme começa direto.
- **Olwe Premium** (padrão R$ 9,90/mês, `PREMIUM_PRICE`): assinatura mensal no cartão (preapproval do
  Mercado Pago) ou 30 dias avulsos no Pix. Cancelar a renovação mantém o Premium até o fim do período pago.
- O webhook fica em `/api/webhooks/mercadopago` (eventos *Pagamentos* e *Planos e assinaturas*). Ele só avisa
  o que mudou: o Olwe sempre consulta o Mercado Pago de novo antes de liberar o Premium. A página do Pix e a
  volta do checkout também consultam, então tudo funciona mesmo antes de configurar o webhook.

## Funcionalidades

- Cadastro, login e sessão (cookie JWT assinado, senha com bcrypt)
- Até 5 perfis por conta, com avatar e **perfil infantil** (catálogo filtrado)
- Início com destaque rotativo e fileiras: Continuar assistindo, Minha Lista, Em alta, populares, mais bem avaliados
- Páginas de Filmes e Séries por gênero, página do título (elenco, temporadas, recomendações), busca
- Minha Lista por perfil
- Player que toca o filme completo (Internet Archive) salvando o progresso para "Continuar", ou o trailer do TMDB
- Layout responsivo com navegação inferior no celular

## Rodando localmente

```bash
cp .env.example .env.local   # preencha TMDB_API_KEY e SESSION_SECRET
npm install
npm run dev                  # aplica as migrações e sobe em http://localhost:3000
```

Sem `TMDB_API_KEY` o app usa um **catálogo de demonstração** com títulos fictícios, então dá para
testar tudo sem chave. Crie a chave grátis em <https://www.themoviedb.org/settings/api>
(serve tanto a "API Key" v3 quanto o "Read Access Token" v4).

## Variáveis de ambiente

| Variável | Para quê |
| --- | --- |
| `TMDB_API_KEY` | Catálogo real do TMDB. Vazio = catálogo de demonstração. |
| `SESSION_SECRET` | Assina o cookie de sessão. **Obrigatória em produção** (`openssl rand -base64 32`). |
| `DATABASE_URL` | `file:./data/olwe.db` local, ou `libsql://…turso.io` em produção. |
| `DATABASE_AUTH_TOKEN` | Token do Turso (só em produção). |
| `DEMO_VIDEO_URL` | Opcional: arquivo de vídeo tocado no player no lugar do trailer. |
| `MERCADOPAGO_ACCESS_TOKEN` | Access Token do Mercado Pago. Vazio = assinaturas desligadas. |
| `MERCADOPAGO_WEBHOOK_SECRET` | Assinatura secreta dos webhooks do Mercado Pago (recomendada). |
| `PREMIUM_PRICE` | Preço mensal do Premium em reais (padrão `9.90`). |
| `AD_TAG_URL` | Tag VAST da rede de anúncios (HTTPS). Vazio = sem anúncios. |
| `MUX_TOKEN_ID` / `MUX_TOKEN_SECRET` | Access Token do Mux (Mux Video, leitura e escrita). Vazio = sem envio ao Mux. |
| `MUX_SIGNING_KEY_ID` / `MUX_SIGNING_KEY_PRIVATE` | Chave de assinatura do Mux: vídeos privados com links temporários. |
| `MUX_VIDEO_QUALITY` | `basic` (padrão) ou `plus`. |
| `ADMIN_EMAILS` | E-mails (separados por vírgula) que abrem o painel do catálogo licenciado. |

## Deploy (Vercel + Turso)

1. Crie um banco no [Turso](https://turso.tech) e pegue a URL e o token.
2. Defina `DATABASE_URL` e `DATABASE_AUTH_TOKEN` na Vercel. As migrações rodam sozinhas quando o app inicia
   (ou manualmente: `DATABASE_URL=… DATABASE_AUTH_TOKEN=… npm run db:migrate`).
3. Importe o repositório na Vercel e defina as variáveis acima.

## Scripts

`npm run dev` · `npm run build` · `npm run lint` · `npm run typecheck` ·
`npm run db:generate` (gera migração após mudar `src/db/schema.ts`) · `npm run db:migrate`

## Estrutura

```
src/app/(auth)      login e cadastro
src/app/(app)       páginas logadas (início, filmes, séries, título, busca, minha lista, conta)
src/app/profiles    escolha e gestão de perfis
src/app/watch       player em tela cheia
src/app/actions     server actions (auth, perfis, minha lista)
src/app/api         rota de progresso do player
src/lib             sessão, camada de dados, cliente TMDB, catálogo de demonstração
src/db              schema Drizzle e conexão
drizzle/            migrações SQL
```

Este produto usa a API do TMDB, mas não é endossado nem certificado pelo TMDB.
