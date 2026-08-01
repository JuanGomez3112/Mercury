# Mercury — Cumplimiento (edad fuerte, T&C, KYC/AML, procesador adulto)

- **Fecha:** 2026-08-01
- **Estado:** DISEÑO / documentado. **No implementado.** Varias piezas requieren **decisión legal y de negocio** (no las decide la IA).
- **Proyecto:** Mercury (`E:\Proyectos\Proyectos\Programacion\Mercury`, GitHub `JuanGomez3112/Mercury`).
- **Stack:** Next.js 16 · React 19 · TS · Tailwind v4 · Prisma **6** · PostgreSQL.

> ⚠️ **No es asesoría legal.** Esto documenta el diseño **técnico/producto** y los requisitos típicos de una plataforma adulta con dinero real. Las obligaciones concretas (leyes de tu jurisdicción, licencias de transmisión de dinero, 18 USC §2257 en EE.UU., GDPR/UE, edad, impuestos) **requieren un abogado**. Trata cada "requisito" como una casilla a validar con asesoría, no como hecho legal.

## Objetivo

Que Mercury pueda operar en público con contenido adulto y dinero real, cumpliendo lo esencial: **verificación de edad fuerte (18+)**, **T&C/privacidad/consentimiento**, **KYC/AML para retiros**, **procesador de pagos apto adulto**, y **moderación/nunca menores** (línea roja — ver [[2026-08-01-mercury-moderacion-design]]).

Es el **frente que desbloquea salir al público** y activar `launched=true` de la economía.

## Piezas y qué decide quién

| Pieza | Decide |
|---|---|
| Verificación de edad fuerte (KYC provider) | **Usuario** elige proveedor + abre cuenta; IA integra la interfaz |
| Procesador de pagos adulto / on-ramp | **Usuario** (CCBill/Segpay/Verotel/cripto) + credenciales; IA integra |
| Textos legales (T&C, privacidad, consentimiento, 2257) | **Abogado** redacta; IA cablea aceptación/versionado |
| Umbrales KYC/AML, sanciones, retención de datos | **Abogado/negocio** define; IA implementa las reglas |

---

## 1. Verificación de edad fuerte (18+) — proveedor KYC externo

Hoy: `birthdate` server-side + age-gate (interstitial). **Débil** (autodeclarado). Se añade verificación fuerte con **proveedor KYC externo** (Veriff / Onfido / Persona / Stripe Identity / Yoti — decisión del usuario; costo por verificación). El usuario sube ID + selfie **al proveedor**, no a Mercury (menos responsabilidad de datos).

**Diseño (proveedor enchufable):**
- Interfaz `IdentityProvider`: `startVerification(userId) → { redirectUrl | sessionToken }`, `handleWebhook(payload) → { userId, status: verified|rejected|pending, dob? }`.
- `User.idVerified Boolean @default(false)`, `User.idVerifiedAt DateTime?`, `User.idVerificationId String?` (ref del proveedor), `User.idVerificationStatus String?` (none|pending|verified|rejected).
- Flujo: `/verificar` → `POST /api/verify/start` (crea sesión con el proveedor, redirige/embebe su widget) → el proveedor procesa → **webhook** `/api/verify/webhook` (firma verificada) marca `idVerified`. Estado visible en `/ajustes`.
- **Datos:** Mercury guarda solo el **resultado** + id de referencia, **no** el documento (lo retiene el proveedor). Si algún flujo guardara imágenes, cifrado + retención mínima + acceso auditado (evitar; preferible no almacenarlas).

**Matriz de gating** (qué exige `idVerified`):
| Acción | Requiere edad fuerte |
|---|---|
| Ver/crear contenido **adulto** (Tabú, `isAdult`, PPV) | **Sí** |
| **Modo creador** / vender contenido/merch | **Sí** (además KYC de pago para retirar) |
| Comprar contenido adulto | **Sí** (recomendado) |
| **Retiro** de MeryCoin (cash-out) | **Sí** (+ KYC/AML, ver §4) |
| Uso general no-adulto (feed sin adulto) | No (age-gate básico basta) |

Gates server-side: helper `requireIdVerified()` en los endpoints/páginas correspondientes → si no, redirige a `/verificar`.

---

## 2. T&C, Privacidad, Consentimiento, 2257

**Redacción = abogado.** El sistema cablea:
- `LegalDoc { key (terms|privacy|adult_consent|creator_terms), version, content/url, publishedAt }` y `LegalAcceptance { userId, key, version, acceptedAt }`. Al registrarse y al cambiar de versión → re-aceptación obligatoria (bloquea uso hasta aceptar).
- **Consentimiento adulto** explícito antes de ver/publicar contenido adulto (además del age-gate).
- **Términos de creador** al activar modo creador (ya hay un checkbox básico — versionarlo).
- **Registro tipo §2257 (EE.UU., si aplica):** para contenido adulto con personas reales, la plataforma/creador debe conservar registro de que los intervinientes son 18+ y su identificación. Diseño: al publicar contenido adulto, el creador (ya `idVerified`) **atestigua** que todos los intervinientes son 18+ y consienten; se guarda registro (`AdultContentRecord { postId, creatorId, attestedAt, ... }`). **Custodio de registros** = decisión legal. (Esto es pesado; validar con abogado si aplica a tu jurisdicción/modelo.)

---

## 3. Procesador de pagos apto adulto + on-ramp

Stripe/PayPal rechazan contenido adulto. Opciones (**decisión del usuario**): **CCBill / Segpay / Verotel** (especializados adulto) o **cripto** (stablecoin/on-chain). Ver el frente de on-ramp (spec aparte, pendiente).
- El on-ramp real (comprar ☾ con dinero real) y el checkout externo de tienda usan este procesador vía la interfaz `PaymentProvider` ya scaffolded.
- **Sin esto, `launched` se queda en `false`** (retiros/on-ramp off) — es la barrera de solvencia documentada en [[05 - Tienda y Economia MeryCoin]].

---

## 4. KYC/AML para retiros (cash-out)

Pagar dinero real a creadores = **transmisión de dinero / e-money** → según jurisdicción: licencia + **KYC** (verificar identidad del que retira) + **AML** (anti-lavado: screening de sanciones, umbrales de reporte, monitoreo).
- Antes del primer retiro: KYC del creador (reusa el proveedor de §1 o uno de pago) + datos fiscales si aplica.
- Reglas (umbrales, screening, límites) = **decisión legal**; el sistema las aplica: `User.kycVerified`, límites por periodo, cola de revisión para montos altos, registro de payouts.
- Enlaza con el modelo de retiro ya construido (`Withdrawal` pending → admin): añadir gate `kycVerified` + `idVerified` + `launched` antes de permitir solicitar.

---

## 5. Moderación / nunca menores (línea roja)

Ver [[2026-08-01-mercury-moderacion-design]]. Cumplimiento exige: reportes con prioridad roja para "menor de edad", acción inmediata, y **conservar evidencia** de contenido retirado por esa causa (posible obligación de reporte a autoridades — decisión legal). Verificación de edad fuerte (§1) reduce el riesgo en origen.

---

## 6. Protección de datos

- Datos sensibles (verificación, pagos): minimizar lo que Mercury almacena (preferir que el proveedor retenga documentos), cifrado en tránsito/reposo, acceso auditado, **retención mínima** y borrado.
- Derechos tipo GDPR (acceso/borrado) si hay usuarios UE — decisión legal.
- El bucket de media adulta ya es privado con proxy (contenido de pago); revisar retención y borrado real al eliminar.

---

## Bloques (cuando se construya)

| # | Bloque | Depende |
|---|--------|---------|
| 1 | Schema cumplimiento (`User.idVerified/kycVerified/...`, `LegalDoc`, `LegalAcceptance`) | — |
| 2 | Verificación de edad fuerte (interfaz `IdentityProvider` + `/verificar` + webhook + gates `requireIdVerified`) | 1, proveedor elegido |
| 3 | Legales (aceptación versionada + re-aceptación + consentimiento adulto) | 1, textos del abogado |
| 4 | KYC/AML de retiro (gate en `Withdrawal`) | 1, 2, reglas legales |
| 5 | Procesador adulto / on-ramp real (activa `launched`) | credenciales del usuario |
| 6 | Registro §2257 / evidencia (si aplica) | decisión legal |

## Decisiones bloqueantes (externas a la IA)

1. **Proveedor KYC** (Veriff/Onfido/Persona/Stripe Identity/Yoti) + cuenta.
2. **Procesador de pagos adulto** (CCBill/Segpay/Verotel) o cripto + credenciales.
3. **Abogado**: T&C/privacidad/consentimiento, §2257, umbrales KYC/AML, retención, jurisdicción, licencias.
4. Jurisdicción de operación (define qué leyes aplican).

## Fuera de alcance

Redacción legal, obtención de licencias, elección de proveedor, integración con proveedor concreto (hasta elegirlo), impuestos.
