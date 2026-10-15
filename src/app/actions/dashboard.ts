"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { saveDashboardSettings } from "@/lib/analytics";
import { parseMoney } from "@/lib/money";
import type { FormState } from "./auth";

/** Configurações do painel: CPM estimado dos anúncios e custos fixos por mês (em branco = zero). */
export async function saveDashboardSettingsAction(_: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const money = (name: string) => {
    const value = String(formData.get(name) ?? "").trim();
    return value ? parseMoney(value) : 0;
  };
  const adCpmCents = money("adCpm");
  if (adCpmCents === null) return { error: "CPM inválido. Use um valor como 12,50.", field: "adCpm" };
  const fixedCostsCents = money("fixedCosts");
  if (fixedCostsCents === null) return { error: "Valor inválido. Use um valor como 150,00.", field: "fixedCosts" };
  await saveDashboardSettings({ adCpmCents, fixedCostsCents });
  revalidatePath("/admin");
  return { notice: "Configurações salvas." };
}
