"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { Icon } from "./icons";

const DEBOUNCE_MS = 350;
const MIN_CHARS = 2;
// Tipo da transição da busca ao digitar: o <ViewTransition> do layout (app) não anima a página a cada letra.
const SEARCH_TRANSITION = "olwe-search";

/**
 * Busca do cabeçalho, como na Netflix: uma lupa que se abre num campo. O campo cobre a lupa mesmo
 * fechado, então clicar, tocar ou chegar com Tab já abre e foca. Digitando, os resultados aparecem
 * sozinhos em /search; Enter busca na hora; Esc limpa e, com o campo vazio, fecha.
 */
export function SearchBox() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const onSearchPage = pathname === "/search";
  const urlQuery = onSearchPage ? (params.get("q") ?? "") : "";

  const [q, setQ] = useState(urlQuery);
  const [focused, setFocused] = useState(false);
  // A URL mudou por fora (voltar, sair da busca): o campo acompanha, a não ser que a pessoa esteja digitando.
  const [seenUrl, setSeenUrl] = useState(urlQuery);
  if (urlQuery !== seenUrl) {
    setSeenUrl(urlQuery);
    if (!focused) setQ(urlQuery);
  }

  const inputRef = useRef<HTMLInputElement>(null);
  const lastSent = useRef(urlQuery);
  useEffect(() => {
    lastSent.current = urlQuery;
  }, [urlQuery]);

  function search(query: string) {
    if (query === lastSent.current) return;
    lastSent.current = query;
    const href = query ? `/search?q=${encodeURIComponent(query)}` : "/search";
    // Na busca, troca a URL sem empilhar histórico; de outra página, entra na busca uma vez.
    if (onSearchPage) router.replace(href, { scroll: false, transitionTypes: [SEARCH_TRANSITION] });
    else router.push(href);
  }

  const searchLater = useEffectEvent((query: string) => {
    if (query.length >= MIN_CHARS || (query === "" && onSearchPage)) search(query);
  });
  useEffect(() => {
    const timer = setTimeout(() => searchLater(q.trim()), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [q]);

  function clear() {
    setQ("");
    if (onSearchPage) search("");
  }

  const open = focused || q !== "" || onSearchPage;

  return (
    <form
      role="search"
      action="/search"
      data-search-open={open ? "" : undefined}
      onSubmit={(e) => {
        e.preventDefault();
        const query = q.trim();
        if (query) search(query);
        // No celular, fecha o teclado para mostrar os resultados.
        if (query && window.matchMedia("(hover: none)").matches) inputRef.current?.blur();
      }}
      className={`relative flex h-10 w-10 items-center rounded-full border transition-[width,flex-grow,background-color,border-color] duration-500 ease-out-expo ${
        open ? "grow bg-ink/85 sm:w-64 sm:grow-0 lg:w-56 xl:w-72 3xl:w-80" : "grow-0 hover:bg-white/10"
      } ${focused ? "border-amber/80" : open ? "border-white/25" : "border-transparent"}`}
    >
      <Icon name="search" size={20} className="pointer-events-none absolute left-2.5 text-text" />
      <input
        ref={inputRef}
        type="search"
        name="q"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onKeyDown={(e) => {
          if (e.key !== "Escape") return;
          e.preventDefault();
          if (q) clear();
          else inputRef.current?.blur();
        }}
        placeholder="Buscar filmes e séries"
        aria-label="Buscar títulos"
        autoComplete="off"
        enterKeyHint="search"
        maxLength={100}
        className={`h-full w-full min-w-0 rounded-full bg-transparent pl-10 text-base outline-none placeholder:text-muted sm:text-sm [&::-webkit-search-cancel-button]:appearance-none ${
          open ? "pr-9" : "cursor-pointer pr-0 placeholder:text-transparent"
        }`}
      />
      {q && (
        <button
          type="button"
          // Não tira o foco do campo ao clicar.
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            clear();
            inputRef.current?.focus();
          }}
          aria-label="Limpar busca"
          className="absolute right-1.5 flex size-7 animate-fade-in items-center justify-center rounded-full text-muted transition-colors hover:bg-white/10 hover:text-text"
        >
          <Icon name="x" size={16} />
        </button>
      )}
    </form>
  );
}

/** Lugar da busca enquanto a URL ainda não foi lida (mesmo tamanho, sem campo: só há um campo de busca). */
export function SearchBoxFallback() {
  return (
    <span aria-hidden="true" className="flex size-10 items-center justify-center">
      <Icon name="search" size={20} />
    </span>
  );
}
