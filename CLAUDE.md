# Olwe: memória do projeto

Contexto para continuar o trabalho em novas sessões. Atualizado em 15/10/2026.

## O que é

Streaming brasileiro em https://olwe.vercel.app (repositório Corrar/Olwe-Studio; a Vercel publica a `main` sozinha).

- **Modelo:** Olwe Grátis com anúncios + Olwe Premium sem anúncios (R$ 9,90/mês pelo Mercado Pago: cartão recorrente ou Pix de 30 dias).
- **Catálogo:** sinopses e trailers do TMDB, filmes completos de domínio público (Internet Archive, Wikimedia Commons) e filmes licenciados cadastrados em `/admin/titles` (arquivo, vídeo do dono no YouTube ou upload para o Mux com HLS).
- **Administração:** painel em `/admin` (lucro, licenças a pagar, usuários, estatísticas estilo YouTube Studio) e catálogo licenciado em `/admin/titles`. Quem é admin vem de `ADMIN_EMAILS`, e as páginas chamam `requireAdmin()`.

## Stack e convenções

- Next.js 16.4 (App Router), React 19.3, Tailwind CSS 4, TypeScript, Drizzle ORM + libSQL/Turso.
- Esta versão do Next.js muda APIs: ler o guia em `node_modules/next/dist/docs/` antes de escrever código (ver AGENTS.md).
- Migrações em `drizzle/`, geradas com `npx drizzle-kit generate --name <nome>`. Rodam sozinhas na inicialização (`src/db/index.ts`). A última é `0010_analytics`.
- Português do Brasil em tudo: interface, comentários no código e mensagens de commit.
- Datas e "dias" das estatísticas no horário de Brasília (UTC−3, sem horário de verão).
- Antes de enviar: `npm run lint` e `npm run typecheck`.
- **Testes:** Playwright (Chromium em `/opt/pw-browsers`) contra `npx next dev`, com `DATABASE_URL=file:./data/<teste>.db` e sem `TMDB_API_KEY` (catálogo de demonstração).
  - YouTube, TMDB e Mercado Pago não são acessíveis no ambiente de nuvem: simular as respostas (rota do Playwright ou `fetch` substituído).
- **Painel:** os números vêm de `charges` (cobranças aprovadas), `title_stats` (visualizações, tempo e anúncios por título e dia) e `daily_activity` (contas ativas). O `/api/stats` valida tudo no servidor; não afrouxar essas regras sem pensar em fraude.

## Infra (Vercel)

- **Projeto:** `prj_FBodGirbVbRUuYDWoSaNp0AN5v6x`, time `team_boHR5HKaBgxuWff3stQypEfG`. Plano Hobby: logs de execução ficam só ~1 h.
- **Variáveis já configuradas:**
  - TMDB_API_KEY, DATABASE_URL, DATABASE_AUTH_TOKEN, SESSION_SECRET;
  - MUX_TOKEN_ID, MUX_TOKEN_SECRET, MUX_SIGNING_KEY_ID, MUX_SIGNING_KEY_PRIVATE;
  - APP_URL, ADMIN_EMAILS;
  - SMTP_USER (Gmail olwe.studio@gmail.com) e SMTP_PASS (senha de app do Google).
- **Ainda não configuradas:**
  - MERCADOPAGO_ACCESS_TOKEN (e MERCADOPAGO_WEBHOOK_SECRET): pagamentos desligados;
  - AD_TAG_URL: anúncios desligados.
- Nunca pedir nem colar valores de chaves e senhas no chat. A pessoa coloca direto na Vercel e só confirmamos os nomes.

## O que já foi feito

- **PRs #1 a #3:**
  - Premium com Mercado Pago (cartão e Pix, webhook assinado);
  - anúncio antes do filme (Google IMA/VAST);
  - catálogo licenciado com upload para o Mux;
  - cartões de plano no cadastro;
  - e-mails de confirmação e troca de senha por SMTP do Gmail, com o design escuro da marca.
  - O usuário quer manter esse design de e-mail; as versões "mais profissional" e "estilo Netflix" foram recusadas.
- **PR #4:**
  - player do trailer: nome, classificação e aviso só nos 5 s iniciais de vídeo, com fade como na Netflix; também carregamento, erros e tela de fim;
  - correção do destaque com zoom alto;
  - painel `/admin`, com custo da licença por filme e configuração de CPM e custos fixos.
- **PR #5:** correções de duas revisões automáticas.
  - estatísticas à prova de fraude no `/api/stats`;
  - estornos e contestações do Mercado Pago saem da receita;
  - player mais robusto;
  - eixo do gráfico;
  - gêneros de Filmes e Séries quebrando linha em telas menores.
- As estatísticas de uso e de visualização começaram a contar a partir do deploy do PR #4.

## Pendências e próximos passos

- Ligar os pagamentos (token do Mercado Pago) e os anúncios (AD_TAG_URL) na Vercel quando o usuário decidir.
- No painel, cadastrar o custo de cada filme licenciado e preencher o CPM e os custos fixos por mês.
- **Oferecido e ainda sem resposta:** dois ajustes no e-mail sem mudar o visual.
  - O logo aparece levemente achatado: o arquivo tem 209×72 e é exibido em 98×36; o certo seria ~105×36.
  - O texto do botão no modo escuro do Gmail.

## Como o usuário gosta de trabalhar

- Conversa em português, com respostas curtas e diretas.
- Testa pelo preview da Vercel e faz o merge ele mesmo.
- Abrir pull request só quando ele pedir ("pode abrir o pull request"). Depois de abrir, acompanhar o PR (deploy e comentários).
- Branch de trabalho: `claude/peaceful-noether-06kuiq`. Depois de cada merge, recomeçar da `main`.
