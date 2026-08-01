import { prisma } from "./db";

/** Resuelve la zona de envío para un país (código); cae a la zona por defecto si no hay match. */
export async function resolveZone(country: string) {
  const byCountry = await prisma.shippingZone.findFirst({ where: { countries: { has: country } } });
  if (byCountry) return byCountry;
  return prisma.shippingZone.findFirst({ where: { isDefault: true } });
}
