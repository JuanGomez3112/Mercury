# Mercury — Registro multi-paso + Preferencias + Reset de contraseña

- **Fecha:** 2026-08-02
- **Estado:** DISEÑO / documentado. **No implementado.** Fundación de datos para el algoritmo de feed (ver [[2026-08-02-mercury-algoritmo-feed-design]], que consume estas preferencias).
- **Proyecto:** Mercury (`E:\Proyectos\Proyectos\Programacion\Mercury`).
- **Stack:** Next.js 16 · React 19 · TS · Prisma 6 · PostgreSQL · zod · bcryptjs · jose.
- **Diseños:** `public/{registro-1,registro-2,reset-password-1,reset-password-2}.svg` (split-screen morado).

## Objetivo

Reemplazar el registro de un solo formulario por un **wizard de 2 pasos** que recoge datos personales, credenciales y **preferencias** (sexualidad, nacionalidad) que alimentan el algoritmo de feed. Añadir **recuperación de contraseña** en 2 pasos.

## Modelo de datos (adiciones a User)

```prisma
model User {
  // ... existentes (email ya existe opcional) ...
  sexuality     String?    // preferencia declarada (cold-start del algoritmo)
  nationality   String?    // código país ISO (cold-start + descubrir gente af\u00edn)
  phone         String?
  recoveryEmail String?
  tycAcceptedAt DateTime?  // consentimiento T&C/cookies/datos (paso 2)
  // birthdate ya existe
}

model PasswordReset {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  tokenHash String   @unique   // hash del token (nunca el token en claro en DB)
  expiresAt DateTime            // 1h
  usedAt    DateTime?
  createdAt DateTime @default(now())

  @@index([userId])
}
```

`User` gana `passwordResets PasswordReset[]`. `email` pasa a recogerse siempre en registro (sigue `@unique`; validar formato + unicidad).

## Registro — wizard 2 pasos

**Paso 1 (`registro-1.svg`):** Nombre, Apellido, Usuario, **E-mail**, Contraseña, Confirmar. Tabs "Inicia Sesión / Registrate" arriba. Social (Google real; FB/X deshabilitados "pronto").
**Paso 2 (`registro-2.svg`):** Sexualidad (select), Nacionalidad (select), Número de Teléfono, E-mail de Recuperación, Fecha de Nacimiento (día/mes/año), **check de consentimiento T&C** (datos/cookies/confidencialidad + aviso SMS).

- **UX:** un solo componente `RegisterWizard` (client) con estado de paso; el paso 1 valida en cliente antes de avanzar (no crea cuenta aún); el submit final (paso 2) crea la cuenta con todo.
- **API `POST /api/auth/register`:** extiende el schema zod actual con `email` (formato + requerido), `sexuality`, `nationality`, `phone?`, `recoveryEmail?`, `tycAccepted` (bool, requerido true). Sigue exigiendo 18+ por `birthdate` (validación existente `isAdult`). Email/username únicos (P2002 → error claro). Guarda `tycAcceptedAt = now()` si aceptado. Crea sesión y redirige a `/feed`.
- **Constantes:** listas de `SEXUALITIES` y `NATIONALITIES` (o país por librería/estático) en `src/lib/` compartidas cliente/server para validar el `enum`.
- **Diseño:** split-screen (izq. glifo Mercury sobre navy; der. panel morado con degradado, campos en grid 2-col). Reusa/extiende `AuthShell` o nuevo `AuthSplit`.

## Reset de contraseña — 2 pasos

**Paso 1 (`reset-password-1.svg`, `/recuperar`):** input "Usuario ó Correo" → botón Enviar → `POST /api/auth/reset/request`.
- Busca user por username o email. **Siempre responde igual** (no revela si existe — anti-enumeración). Si existe: genera token aleatorio, guarda `PasswordReset{tokenHash, expiresAt=now+1h}`, **envía email** con link `/recuperar/<token>`.
**Paso 2 (`reset-password-2.svg`, `/recuperar/[token]`):** nueva contraseña + confirmar → `POST /api/auth/reset/confirm {token, password}`.
- Hashea el token, busca `PasswordReset` válido (no usado, no expirado), actualiza `passwordHash`, marca `usedAt`. Invalida sesiones (opcional, ver deuda). Redirige a `/login`.

### ⚠️ Dependencia externa: envío de email

Mercury **no tiene infraestructura de correo**. El reset **requiere enviar un email** (el link). Opciones (decisión del usuario):
- **Proveedor transaccional** (Resend / SendGrid / Postmark / SMTP) — tier gratis, API key en `.env`. Recomendado.
- SMTP self-host (Postfix en CT) — problemas de entregabilidad/spam.

**v1 sin proveedor:** se construye todo el flujo (token, páginas, APIs) con una **interfaz `sendEmail()` enchufable**; sin proveedor configurado, en dev **loguea el link** (o lo devuelve en la respuesta solo en modo dev) para probar. El envío real se activa al configurar el proveedor. El registro **no** depende de email-sending (solo lo almacena); solo el reset lo necesita.

## Seguridad

- Contraseñas bcrypt (como hoy). Token de reset: aleatorio fuerte, **solo hash en DB**, expiración 1h, single-use (`usedAt`).
- Anti-enumeración en request (respuesta uniforme).
- Validación server-side de todos los campos (zod); 18+ obligatorio.
- Email/recoveryEmail: formato válido; email principal único.

## Bloques

| # | Bloque | Depende |
|---|--------|---------|
| 1 | Schema (User prefs + PasswordReset) | — |
| 2 | Registro wizard 2 pasos (UI + API extendida + constantes) | 1 |
| 3 | Interfaz `sendEmail()` + reset request/confirm + páginas | 1, (proveedor email para envío real) |
| 4 | Recoger consentimiento T&C + guardar `tycAcceptedAt` | 2 |

## Fuera de alcance

- Verificación de email (doble opt-in), verificación de teléfono/SMS (aviso en T&C pero sin implementar), OAuth social real (FB/X siguen stubs), verificación de edad fuerte (frente de cumplimiento aparte).

## Decisiones bloqueantes

1. **Proveedor de email** para reset (Resend/SendGrid/SMTP + API key). Sin esto, el reset no envía (solo dev-log).
2. Fuente de la lista de **nacionalidades/sexualidades** (estático vs librería).
