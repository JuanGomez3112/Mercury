import { z } from "zod";

export function isAdult(birthdate: Date): boolean {
  const now = new Date();
  let age = now.getFullYear() - birthdate.getFullYear();
  const m = now.getMonth() - birthdate.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birthdate.getDate())) age--;
  return age >= 18;
}

export const registerSchema = z
  .object({
    nombre: z.string().trim().min(1, "Nombre requerido").max(60),
    apellido: z.string().trim().max(60).optional().default(""),
    username: z
      .string()
      .trim()
      .min(3, "Mínimo 3 caracteres")
      .max(30)
      .regex(/^[a-zA-Z0-9_.]+$/, "Solo letras, números, _ y ."),
    password: z.string().min(8, "Mínimo 8 caracteres").max(200),
    password2: z.string(),
    birthdate: z.string().refine((v) => !Number.isNaN(Date.parse(v)), "Fecha inválida"),
  })
  .refine((d) => d.password === d.password2, {
    message: "Las contraseñas no coinciden",
    path: ["password2"],
  })
  .refine((d) => isAdult(new Date(d.birthdate)), {
    message: "Debes ser mayor de 18 años",
    path: ["birthdate"],
  });

export const loginSchema = z.object({
  username: z.string().trim().min(1, "Requerido"),
  password: z.string().min(1, "Requerido"),
});

export const changePasswordSchema = z
  .object({
    current: z.string().optional().default(""),
    next: z.string().min(8, "Mínimo 8 caracteres").max(200),
    confirm: z.string(),
  })
  .refine((d) => d.next === d.confirm, {
    message: "Las contraseñas no coinciden",
    path: ["confirm"],
  });
