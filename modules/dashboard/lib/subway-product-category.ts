export function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .trim();
}

export function getProductCategory(description: string) {
  const normalized = normalizeText(description);

  if (normalized.includes("COMBO")) return "COMBO";
  if (normalized.includes("BEBIDA") || normalized.includes("GASEOSA") || normalized.includes("AGUA")) return "BEBIDA";
  if (normalized.includes("EXTRA") || normalized.includes("ADICIONAL")) return "EXTRA";
  if (normalized.includes("ENSALADA")) return "ENSALADA";
  if (normalized.includes("COOKIE") || normalized.includes("GALLETA")) return "COOKIE";
  if (normalized.includes("SUB")) return "SUB";

  return "OTROS";
}
