// Vinheta de abertura (src/components/olwe-intro.tsx): chaves na sessionStorage e o script do <head>.
// Fica fora do componente porque o layout (servidor) usa o script, e valores exportados de um módulo
// "use client" chegam ao servidor só como referências.

/** A vinheta já tocou nesta sessão do navegador. */
export const INTRO_PLAYED_KEY = "olwe:intro";
/** Tocar de novo na próxima página do catálogo, com som (marcado ao escolher um perfil). */
export const INTRO_NEXT_KEY = "olwe:intro-next";

/**
 * Roda antes da primeira pintura: se a vinheta já tocou nesta sessão e nenhum perfil acabou de ser
 * escolhido, marca o <html> para o CSS esconder a vinheta (sem piscar na tela).
 */
export const INTRO_HEAD_SCRIPT = `try{var s=sessionStorage;if(s.getItem("${INTRO_PLAYED_KEY}")&&!s.getItem("${INTRO_NEXT_KEY}"))document.documentElement.setAttribute("data-intro-played","")}catch(e){}`;
