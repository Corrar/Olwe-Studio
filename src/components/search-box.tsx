"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export function SearchBox() {
  const router = useRouter();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");

  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        if (q.trim()) router.push(`/search?q=${encodeURIComponent(q.trim())}`);
      }}
    >
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Buscar títulos"
        aria-label="Buscar títulos"
        className="w-36 rounded-full border border-line bg-surface/80 px-4 py-1.5 text-sm placeholder:text-muted focus:w-56 focus:border-amber focus:outline-none sm:w-48 transition-all"
      />
    </form>
  );
}
