// Valores em reais guardados em centavos (inteiros): sem erro de arredondamento ao somar.

/** "R$ 1.234,56". */
export const formatCents = (cents: number) => (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/** "1.234,56", sem o símbolo (para campos de formulário). */
export const centsInput = (cents: number) => (cents / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/**
 * Centavos de um valor digitado em reais: "1.500,00", "1500,5", "R$ 0,05", "1500.00" ou "1500".
 * null quando não é um valor válido.
 */
export function parseMoney(input: string): number | null {
  let v = input.replace(/R\$|\s/g, "");
  if (!v) return null;
  if (v.includes(",")) v = v.replace(/\./g, "").replace(",", ".");
  else if (/^\d{1,3}(\.\d{3})+$/.test(v)) v = v.replace(/\./g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(v)) return null;
  const cents = Math.round(Number(v) * 100);
  return Number.isSafeInteger(cents) ? cents : null;
}
