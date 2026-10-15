"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { billingEnabled, cancelSubscriptions, createPixCharge, startCardSubscription } from "@/lib/billing";
import { getCurrentProfile, requireUser } from "@/lib/dal";
import { withinLimit } from "@/lib/rate-limit";
import type { FormState } from "./auth";

/** Só a conta logada, com um perfil adulto aberto, contrata ou cancela o Premium. */
async function payingUser() {
  const user = await requireUser();
  const profile = await getCurrentProfile();
  if (!profile) redirect("/profiles");
  if (profile.isKids) return { error: "Perfis infantis não podem mudar o plano." } as const;
  if (!billingEnabled()) return { error: "Os pagamentos ainda não estão disponíveis." } as const;
  return { user } as const;
}

const emailSchema = z.email("Informe o e-mail da sua conta do Mercado Pago.").max(254);

export async function subscribeWithCard(_: FormState, formData: FormData): Promise<FormState> {
  const auth = await payingUser();
  if ("error" in auth) return { error: auth.error };
  const parsed = emailSchema.safeParse(String(formData.get("payerEmail") ?? "").trim().toLowerCase());
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  if (!(await withinLimit(`checkout:user:${auth.user.id}`, 10, 60 * 60))) {
    return { error: "Muitas tentativas. Espere um pouco e tente de novo." };
  }

  let checkout: string;
  try {
    checkout = await startCardSubscription(auth.user, parsed.data);
  } catch {
    return { error: "Não foi possível abrir o pagamento agora. Tente de novo em instantes." };
  }
  redirect(checkout);
}

export async function payWithPix(): Promise<FormState> {
  const auth = await payingUser();
  if ("error" in auth) return { error: auth.error };
  if (!(await withinLimit(`checkout:user:${auth.user.id}`, 10, 60 * 60))) {
    return { error: "Muitas tentativas. Espere um pouco e tente de novo." };
  }

  let id: string;
  try {
    id = (await createPixCharge(auth.user)).id;
  } catch {
    return { error: "Não foi possível gerar o Pix agora. Tente de novo em instantes." };
  }
  redirect(`/plans/pix/${id}`);
}

export async function cancelPremium(): Promise<FormState> {
  const auth = await payingUser();
  if ("error" in auth) return { error: auth.error };
  try {
    await cancelSubscriptions(auth.user.id);
  } catch {
    return { error: "Não foi possível cancelar agora. Tente de novo em instantes." };
  }
  revalidatePath("/account");
  revalidatePath("/plans");
  return { notice: "Renovação cancelada. O Premium continua até o fim do período já pago." };
}
