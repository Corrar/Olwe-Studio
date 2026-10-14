"use client";

import { useEffect } from "react";
import { forgetActiveProfile } from "@/app/actions/profiles";

/**
 * Ao abrir "Quem está assistindo?", sai do perfil que estava ativo (como na Netflix): um perfil
 * bloqueado não fica aberto por trás da tela de escolha para quem voltar ao navegador.
 */
export function ForgetActiveProfile() {
  useEffect(() => {
    void forgetActiveProfile();
  }, []);
  return null;
}
