"use client";

import { useActionState, useState, ViewTransition } from "react";
import { updateProfileDetails } from "@/app/actions/profiles";
import { Avatar, AvatarPicker } from "@/components/avatar";
import { FIELD, FormStatus, PRIMARY_BUTTON, useManualSubmit, useResultKey } from "./form-kit";

const MAX_NAME = 20;

/** Nome e avatar do perfil, com a prévia grande ao lado (sem senha: não libera conteúdo). */
export function DetailsForm({ profileId, name, avatar, isKids }: { profileId: string; name: string; avatar: string; isKids: boolean }) {
  const [state, action, pending] = useActionState(updateProfileDetails.bind(null, profileId), undefined);
  const resultKey = useResultKey(state);
  const onSubmit = useManualSubmit(action);
  const [draftName, setDraftName] = useState(name);
  const [draftAvatar, setDraftAvatar] = useState(avatar);
  const changed = draftName.trim() !== name || draftAvatar !== avatar;
  // Resposta que estava na tela quando a pessoa mexeu por último: o "Perfil atualizado." dela sai.
  const [editedAt, setEditedAt] = useState(-1);
  const hideSaved = editedAt === resultKey && state?.saved;

  return (
    <form action={action} onSubmit={onSubmit} className="flex flex-col gap-6 sm:flex-row sm:items-start sm:gap-8">
      <div className="relative mx-auto shrink-0 sm:mx-0">
        {/* Mesmo nome da grade de "Gerenciar perfis": o avatar viaja da grade até aqui. */}
        <ViewTransition name={`avatar-${profileId}`} share="auto" default="none">
          {/* A chave troca a cada escolha: a prévia entra de novo com o avatar novo. */}
          <Avatar
            key={draftAvatar}
            avatar={draftAvatar}
            className={`size-28 shadow-xl shadow-black/40 sm:size-36 ${draftAvatar === avatar ? "" : "animate-scale-in"}`}
          />
        </ViewTransition>
        {isKids && (
          <span className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-amber px-2.5 py-0.5 text-xs font-bold text-ink shadow-md shadow-black/40">
            Perfil infantil
          </span>
        )}
      </div>

      <div className="min-w-0 flex-1 space-y-6">
        <div className="space-y-1.5">
          <div className="flex items-baseline justify-between gap-3">
            <label htmlFor="profile-name" className="text-sm text-muted">
              Nome
            </label>
            <span aria-hidden="true" className="text-xs tabular-nums text-muted">
              {draftName.length}/{MAX_NAME}
            </span>
          </div>
          <input
            id="profile-name"
            name="name"
            value={draftName}
            onChange={(e) => {
              setDraftName(e.target.value);
              setEditedAt(resultKey);
            }}
            maxLength={MAX_NAME}
            required
            autoComplete="off"
            className={FIELD}
          />
        </div>

        <AvatarPicker
          value={draftAvatar}
          onChange={(id) => {
            setDraftAvatar(id);
            setEditedAt(resultKey);
          }}
          legend="Escolha um avatar"
        />

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <button disabled={pending || !changed} className={PRIMARY_BUTTON}>
            {pending ? "Salvando…" : "Salvar alterações"}
          </button>
          {/* Um erro continua até o próximo envio. */}
          <FormStatus state={hideSaved ? undefined : state} saved="Perfil atualizado." resultKey={resultKey} />
        </div>
      </div>
    </form>
  );
}
