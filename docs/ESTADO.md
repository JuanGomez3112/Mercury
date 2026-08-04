# Mercury — Estado del proyecto y roadmap

- **Actualizado:** 2026-08-04
- **Servidor:** Proxmox CT 106 `mercury` (192.168.1.106), `next start` :3000 tras nginx :80, PostgreSQL local, MinIO. Deploy: `ssh proxmox "pct exec 106 -- /usr/local/bin/mercury-deploy"` (git pull + npm ci + prisma db push + build + restart).
- **BTCPay:** CT 107 `btcpay` (192.168.1.107) — nodo Bitcoin en mainnet (IBD), on-ramp cripto.
- **Estado global:** `TokenConfig.launched = false` — sin retiros/ventas con dinero real hasta cerrar la capa legal.

---

## Construido y en producción

### Red social
- Feed con **algoritmo por comportamiento** (`lib/ranking.ts`): ordena Explora (no-seguidos), Feed (seguidos) y Tabú (mezcla) por afinidad de autor + hashtags + popularidad + recencia + cold-start (sexualidad/nacionalidad/mode). No cronológico.
- Publicaciones (texto, imágenes/video, adulto, contenido de pago), likes, **comentarios con likes + filtro relevantes/recientes + avatar**, follows, historias (ángel/diablito), perfiles con **tabs Publicaciones/Tabú**, mensajería (con "visto"), notificaciones, búsqueda, guardados.
- Permalink de post `/p/[id]`; lightbox fullscreen en móvil.

### Auth y registro
- **Registro 2 pasos** (`RegisterWizard`, estilo login dark): datos+credenciales+email / sexualidad+nacionalidad+teléfono+email-recuperación+nacimiento+consentimiento T&C.
- Login (usuario/contraseña + Google cableado sin credenciales). **Reset de contraseña** 2 pasos (`/recuperar`) con token single-use + **email real vía Brevo**.
- 18+ verificado server-side + age-gate. Preferencias alimentan el algoritmo.

### Economía MeryCoin (off-chain, closed-loop)
- Wallet de créditos ☾, ledger `WalletTransaction`, `TokenConfig` (supply fijo 1e9, treasury, reserva, peg `rateCents`).
- Monetización: PPV posts, suscripción a creador, propinas, transferencia P2P.
- Contenido de pago: media privada en bucket `mercury-paid`, proxy `/api/media/[...key]` (**stream server-side**, verifica acceso). Compra/unlock funcional.

### On-ramp cripto (BTCPay, gratis, autohospedado)
- Comprar ☾ pagando BTC/Lightning → webhook → mint ☾ + reserva. Checkout externo de tienda **reserve-on-pay**. Panel admin de **solvencia** + **reembolso/clawback**. Idempotencia por `providerRef`. Probado e2e en regtest.

### Tienda física + Admin
- Productos/variantes/zonas/órdenes; checkout MeryCoin/externo. **Admin hub** `/admin` con **segundo factor PIN**. Gestión tienda, retiros, moderación, pagos.

### Moderación y seguridad
- Reportes (post/user/comment/message), cola admin con prioridad roja (menores/no-consentido), baneo/suspensión, **logout forzado global**. Idempotencia de checkout.

### Móvil (rehecho)
- Contenedor full-width sin radius; lightbox fullscreen (foto + barra like/comentar/compartir); **pantalla dedicada `/publicar`**; bottom nav con FAB central; historias compactas; topbar ajustado. Screenshots headless (Playwright) como método de auditoría.

---

## Pendiente — sin bloqueo (construible ya)

| Ítem | Notas |
|---|---|
| **Marketplace C2C** | Spec listo (`specs/2026-08-01-mercury-marketplace-c2c-design.md`): cualquiera vende, pago ☾ con escrow o efectivo P2P. Usa ☾ existente. |
| **Palabras → iconos en móvil** | Pulido pendiente (botones de perfil, etc.). |
| **Afinar pesos del algoritmo** | Observar el feed con uso real y ajustar `W` en `lib/ranking.ts`. |
| **BTCPay mainnet self-test** | Esperando fin del IBD del nodo + conectar xpub watch-only; luego pagar unos $ de BTC real (self-test, no abierto a usuarios). |

---

## Bloqueado por decisiones externas del usuario

| Ítem | Bloqueador |
|---|---|
| **Activar `launched=true`** (retiros reales) | Capa legal (abogado, KYC/AML, §2257) — ver `specs/2026-08-01-mercury-compliance-checklist.md`. |
| **Payout de retiros** (Bloque 4 on-ramp) | KYC/legal. |
| **MeryCoin on-chain (token real)** | Spec listo (`specs/2026-08-02-mercury-merycoin-token-utilidad-design.md`, **utilidad, NO inversión**): falta legal (¿valor?), auditoría contrato, custodia (Safe/MPC), liquidez (capital), branding/símbolo. |
| **Email a terceros bien / OAuth social** | Dominio propio (hoy email sale desde @gmail vía Brevo → puede caer spam a otros; OAuth Google pausado por falta de dominio HTTPS). |

---

## Especificaciones (docs/superpowers/specs)

Diseñadas: moderación, cumplimiento, checklist compliance, on-ramp pagos, tienda física, on-chain (híbrido), **token utilidad**, **marketplace C2C**, **registro+preferencias+reset**, **algoritmo de feed**. Construidas: moderación, on-ramp, registro+reset, algoritmo (+ tienda/economía/contenido-pago previas).

## Cadena de prioridad hacia el público

1. ✅ Moderación · idempotencia · logout baneados
2. ✅ On-ramp cripto (entrada de dinero) + reembolsos
3. ✅ Registro+preferencias + algoritmo de feed
4. 🔒 **Cumplimiento legal** (abogado + KYC + §2257) ← bloqueador principal
5. 🔒 Activar `launched` + payout de retiros
6. ⏳ (opcional) MeryCoin on-chain, marketplace C2C, pulido móvil restante
