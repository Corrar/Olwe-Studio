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
