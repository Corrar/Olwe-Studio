import "server-only";
import { isPremium } from "./billing";

// Anúncios do Olwe Grátis: um intervalo antes dos filmes completos, no padrão VAST (Google IMA), vindo
// da rede de anúncios configurada em AD_TAG_URL. Sem a variável, ninguém vê anúncio.

export function adsEnabled() {
  return /^https:\/\//.test(process.env.AD_TAG_URL ?? "");
}

/**
 * Tag VAST para este filme, ou null quando não passa anúncio: Premium, perfil infantil (publicidade
 * dirigida a crianças é abusiva: Resolução 163 do Conanda e art. 37, § 2º, do CDC) ou anúncios desligados.
 */
export function adTagFor(user: { premiumUntil: Date | null }, profile: { isKids: boolean }) {
  if (!adsEnabled() || isPremium(user) || profile.isKids) return null;
  return process.env.AD_TAG_URL!;
}
