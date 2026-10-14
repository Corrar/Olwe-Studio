"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { deleteLicensedTitle, saveLicensedTitle } from "@/app/actions/licensed";
import { Icon } from "@/components/icons";
import { FIELD, useManualSubmit } from "@/app/profiles/[id]/edit/form-kit";

/** Valores do formulário (texto, como nos campos). */
export type TitleFormValues = {
  id?: string;
  title: string;
  originalTitle: string;
  overview: string;
  year: string;
  runtime: string;
  tmdbId: string;
  poster: string;
  backdrop: string;
  genres: number[];
  ageRating: string;
  ratingDescriptors: string;
  video: string;
  videoHeight: string;
  tier: "free" | "premium";
  licensor: string;
  licenseName: string;
  credit: string;
  licenseStart: string;
  licenseEnd: string;
  notes: string;
  published: boolean;
};

const LABEL = "block text-sm text-muted";
const HINT = "mt-1 text-xs text-muted/80";

function Field({ name, label, hint, error, children }: { name: string; label: string; hint?: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={name} className={LABEL}>
        {label}
      </label>
      <div className="mt-1.5">{children}</div>
      {error ? (
        <p role="alert" className="mt-1 text-xs text-ember">
          {error}
        </p>
      ) : (
        hint && <p className={HINT}>{hint}</p>
      )}
    </div>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="space-y-4 rounded-2xl border border-line bg-surface p-5 sm:p-6">
      <legend className="px-1 font-display text-lg font-semibold">{title}</legend>
      {children}
    </fieldset>
  );
}

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="bg-brand inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-8 font-semibold text-ink transition hover:brightness-110 active:scale-[0.98] disabled:opacity-70"
    >
      <Icon name="check" size={18} />
      {pending ? "Salvando…" : "Salvar filme"}
    </button>
  );
}

export function TitleForm({ values, genres }: { values: TitleFormValues; genres: [number, string][] }) {
  const [state, action] = useActionState(saveLicensedTitle, undefined);
  const onSubmit = useManualSubmit(action);
  const err = (name: string) => (state?.field === name ? state.error : undefined);
  const input = (name: keyof TitleFormValues, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <input id={name} name={name} defaultValue={String(values[name] ?? "")} className={FIELD} aria-invalid={state?.field === name || undefined} {...props} />
  );

  return (
    <form action={action} onSubmit={onSubmit} className="space-y-5">
      {values.id && <input type="hidden" name="id" value={values.id} />}

      <Group title="Filme">
        <Field name="title" label="Título em português *" error={err("title")}>
          {input("title", { required: true, maxLength: 200 })}
        </Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field name="tmdbId" label="ID no TMDB" hint="Preenche pôster, sinopse e gêneros que ficarem em branco." error={err("tmdbId")}>
            {input("tmdbId", { inputMode: "numeric" })}
          </Field>
          <Field name="year" label="Ano" error={err("year")}>
            {input("year", { inputMode: "numeric", maxLength: 4 })}
          </Field>
          <Field name="runtime" label="Duração (min)" error={err("runtime")}>
            {input("runtime", { inputMode: "numeric", maxLength: 3 })}
          </Field>
        </div>
        <Field name="originalTitle" label="Título original" error={err("originalTitle")}>
          {input("originalTitle", { maxLength: 200 })}
        </Field>
        <Field name="overview" label="Sinopse" error={err("overview")}>
          <textarea id="overview" name="overview" rows={4} maxLength={4000} defaultValue={values.overview} className={FIELD} />
        </Field>
        <div>
          <p className={LABEL}>Gêneros</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {genres.map(([id, name]) => (
              <label key={id} className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-full border border-line px-3.5 text-sm has-checked:border-amber has-checked:bg-amber/10">
                <input type="checkbox" name="genres" value={id} defaultChecked={values.genres.includes(id)} className="accent-amber" />
                {name}
              </label>
            ))}
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field name="poster" label="Pôster (URL HTTPS)" hint="Em branco, usa o do TMDB." error={err("poster")}>
            {input("poster", { type: "url" })}
          </Field>
          <Field name="backdrop" label="Imagem de fundo (URL HTTPS)" error={err("backdrop")}>
            {input("backdrop", { type: "url" })}
          </Field>
        </div>
      </Group>

      <Group title="Vídeo">
        <Field
          name="video"
          label="Link do vídeo *"
          hint="Vídeo oficial no YouTube (do dono dos direitos) ou arquivo MP4/WebM em HTTPS. Arquivos próprios passam com o anúncio do Olwe Grátis."
          error={err("video")}
        >
          {input("video", { required: true, maxLength: 1000 })}
        </Field>
        <Field name="videoHeight" label="Qualidade do arquivo" hint="Só para arquivos próprios.">
          <select id="videoHeight" name="videoHeight" defaultValue={values.videoHeight} className={FIELD}>
            <option value="">Não informar</option>
            <option value="2160">4K (2160p)</option>
            <option value="1080">Full HD (1080p)</option>
            <option value="720">HD (720p)</option>
            <option value="480">SD (480p)</option>
          </select>
        </Field>
      </Group>

      <Group title="Classificação e plano">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            name="ageRating"
            label="Classificação indicativa *"
            hint="Use a do ClassInd ou a informada pelo licenciante. 18 anos não é aceito no Olwe."
            error={err("ageRating")}
          >
            <select id="ageRating" name="ageRating" defaultValue={values.ageRating} required className={FIELD}>
              <option value="" disabled>
                Escolha
              </option>
              <option value="0">Livre (L)</option>
              <option value="10">10 anos</option>
              <option value="12">12 anos</option>
              <option value="14">14 anos</option>
              <option value="16">16 anos</option>
            </select>
          </Field>
          <Field name="ratingDescriptors" label="Motivos da classificação" hint="Ex.: Violência, Linguagem imprópria">
            {input("ratingDescriptors", { maxLength: 200 })}
          </Field>
        </div>
        <div>
          <p className={LABEL}>Disponível em</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {(
              [
                ["free", "Olwe Grátis e Premium", "Todos assistem; no Grátis, com anúncio antes."],
                ["premium", "Só Olwe Premium", "Exclusivo para assinantes, sem anúncios."],
              ] as const
            ).map(([value, label, hint]) => (
              <label key={value} className="flex cursor-pointer gap-3 rounded-xl border border-line p-3.5 has-checked:border-amber has-checked:bg-amber/10">
                <input type="radio" name="tier" value={value} defaultChecked={values.tier === value} className="mt-1 accent-amber" />
                <span>
                  <span className="block text-sm font-semibold">{label}</span>
                  <span className="block text-xs text-muted">{hint}</span>
                </span>
              </label>
            ))}
          </div>
        </div>
      </Group>

      <Group title="Licença">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field name="licensor" label="Quem cedeu os direitos *" hint="Distribuidora, produtora ou autor." error={err("licensor")}>
            {input("licensor", { required: true, maxLength: 200 })}
          </Field>
          <Field name="licenseName" label="Tipo de licença *" hint="Ex.: Contrato de licenciamento, CC BY 4.0, Autorização do autor" error={err("licenseName")}>
            {input("licenseName", { required: true, maxLength: 120 })}
          </Field>
        </div>
        <Field name="credit" label="Créditos exigidos" hint="Aparecem nos detalhes do filme." error={err("credit")}>
          {input("credit", { maxLength: 500 })}
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field name="licenseStart" label="Início da licença" hint="Em branco: já vale." error={err("licenseStart")}>
            {input("licenseStart", { type: "date" })}
          </Field>
          <Field name="licenseEnd" label="Fim da licença (último dia)" hint="Em branco: sem prazo. Depois dele, o filme some sozinho." error={err("licenseEnd")}>
            {input("licenseEnd", { type: "date" })}
          </Field>
        </div>
        <Field name="notes" label="Anotações internas" hint="Contrato, contato, repasse. Ninguém além do painel vê.">
          <textarea id="notes" name="notes" rows={3} maxLength={4000} defaultValue={values.notes} className={FIELD} />
        </Field>
      </Group>

      <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-line bg-surface p-5">
        <input type="checkbox" name="published" defaultChecked={values.published} className="size-5 accent-amber" />
        <span>
          <span className="block font-semibold">Publicado</span>
          <span className="block text-sm text-muted">Desmarcado, o filme fica como rascunho e não aparece no app.</span>
        </span>
      </label>

      {state?.error && !state.field && (
        <p role="alert" className="flex items-center gap-2 text-sm text-ember">
          <Icon name="alert" size={16} />
          {state.error}
        </p>
      )}
      {state?.error && state.field && (
        <p role="alert" className="text-sm text-ember">
          Confira o campo destacado: {state.error}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <SaveButton />
      </div>
    </form>
  );
}

export function DeleteTitleButton({ id, title }: { id: string; title: string }) {
  return (
    <form
      action={deleteLicensedTitle}
      onSubmit={(e) => {
        if (!confirm(`Excluir "${title}" do catálogo? Isso não pode ser desfeito.`)) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button type="submit" className="inline-flex min-h-11 items-center gap-2 rounded-full px-5 text-sm font-semibold text-ember ring-1 ring-inset ring-ember/40 transition hover:bg-ember/10">
        <Icon name="trash" size={16} />
        Excluir filme
      </button>
    </form>
  );
}
