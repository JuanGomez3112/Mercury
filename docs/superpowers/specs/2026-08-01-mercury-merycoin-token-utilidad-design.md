# Mercury — MeryCoin como Token de Utilidad On-Chain (tradeable, híbrido custodial)

- **Fecha:** 2026-08-01
- **Estado:** DISEÑO / documentado. **No implementado.** Decisión **grande** con implicaciones **regulatorias, financieras y de seguridad de custodia**. Requiere abogado, auditoría de contrato y decisiones de negocio. La IA no despliega contratos ni mueve fondos reales.
- **Proyecto:** Mercury (`E:\Proyectos\Proyectos\Programacion\Mercury`).
- **Supersede parcialmente:** `2026-08-01-mercury-onchain-design.md` (modelo híbrido custodial base). Este doc lo concreta y extiende con **token tradeable de utilidad**, cadena elegida (Base), precio de mercado y conversión a mercado.

> ⚠️ **No es asesoría legal/financiera.** Emitir un token puede ser un valor/instrumento regulado; custodiar fondos de terceros = licencias, KYC/AML, seguros. Ver [[2026-08-01-mercury-cumplimiento-design]], [[2026-08-01-mercury-onramp-pagos-design]] y [[2026-08-01-mercury-compliance-checklist]]. Trata esto como diseño técnico, no como vía libre.

## Encuadre — token de UTILIDAD, no de inversión

**Decisión explícita y fundacional:** MeryCoin (MERY) se diseña y se presenta como **token de utilidad** — algo que **se usa dentro de Mercury** (propinas, contenido, tienda, pagos entre usuarios). **NO** se construye ni se comercializa como inversión especulativa. No se promete revalorización, no se vende "para que suba". Un token vendido como inversión con expectativa de ganancia por el trabajo del operador es, con alta probabilidad, un **valor regulado** (test de Howey) — y venderlo así sin registro es ilegal, con exposición civil y penal. El precio de mercado puede **emerger** de un mercado libre, pero el discurso y el diseño son utilidad-primero. **El límite entre producto legítimo y delito es precisamente este encuadre.**

## Objetivo

Llevar MeryCoin a **Base** (L2 de Ethereum) como token ERC-20 real y tradeable, manteniendo el modelo **híbrido custodial**: la app sigue rápida y gratis por dentro (☾ off-chain estable), y la cadena aporta un token real, holdeable en la wallet del usuario e intercambiable en un DEX, vía **depósito y retiro** convertidos a **precio de mercado**.

## Modelo económico (crux)

- **Adentro (off-chain):** ☾ = crédito **estable** anclado a fiat (`rateCents`). Propinas, PPV, suscripción, P2P, tienda, marketplace — todo instantáneo y sin gas, sobre el ledger actual (`balance`/`earnings`/`treasury`). **No cambia.**
- **Afuera (on-chain):** **MERY** = ERC-20 en Base, **flota** en Uniswap. Su precio lo pone el mercado.
- **Frontera (depósito/retiro):** convierte **a precio de mercado de MERY**, no al peg interno. Así ☾ siempre vale su $ y **nadie arbitra** el diferencial peg↔mercado.
  - Depósito: `☾ acreditados = (MERY_enviados × precio$_MERY) / (rateCents/100)`.
  - Retiro: `MERY_enviados = (☾_debitados × rateCents/100) / precio$_MERY`.
- **Analogía:** exchange centralizado. Libro contable estable adentro; MERY es la puerta tradeable que entra/sale a valor de mercado.
- **Acoplamiento con liquidez:** la conversión "a mercado" **exige un pool vivo en Uniswap** para leer el precio. **Sin liquidez → sin precio → depósito/retiro no encienden.** El token se despliega y existe, pero la puerta on-chain solo funciona cuando se siembre liquidez (paso financiado, más adelante).

## Cadena y token (elegido)

- **Cadena: Base** (L2 de Ethereum). Razón para este proyecto (Next.js/TS, dev solo): tooling TS maduro (`viem`), watcher de depósitos bien soportado (webhooks Alchemy/QuickNode), contrato estándar OpenZeppelin, custodia Safe estándar, DEX Uniswap, fees en centavos, ecosistema Coinbase. (El diseño es idéntico en Polygon/Arbitrum si se prefiere otra L2.)
- **Contrato: ERC-20 OpenZeppelin.** 18 decimales. **Símbolo: TBD** (pendiente del branding/logo de Mercury y MeryCoin; se fija al desplegar, no bloquea el diseño; el logo se registra aparte en token lists / Uniswap, no en el contrato).
- **Supply fijo 1e9, pre-minteado** a la custodia. **Sin función de mint posterior** — supply real fijo y verificable en cadena (1:1 con el `maxSupply` off-chain actual). El "treasury off-chain" = cuánto de ese supply sigue sin distribuir.
- **Auditoría** del contrato por firma externa antes de mainnet. **Testnet (Base Sepolia) primero.**

## Custodia y firma (el punto crítico — aquí vive el riesgo real)

- **Ahora (gratis, self-custody):** **Safe multisig 2-de-3**, llaves en dispositivos separados + backup, controladas por el operador.
- **Luego (con valor real acumulado):** migrar a **custodio MPC** (Fireblocks/Cobo/etc.) — costo mensual/%, pero seguridad profesional + pólizas.
- **Regla dura:** las llaves privadas **nunca** en el server ni en el proceso Next. Los retiros los firma un **servicio de payout separado**, fuera de la app web, con la custodia.
- **Honesto:** custodiar fondos de terceros siendo operador solo es responsabilidad grande — filtración de llaves = pérdida total. Por eso self-custody multisig al inicio y migración a MPC al crecer. Hot wallet con fondos mínimos para procesar retiros; reserva en cold/multisig con aprobación.

## Oráculo de precio

- Precio de MERY vía **Uniswap v3 TWAP** (time-weighted average price) en Base — resistente a manipulación de un solo bloque. **Nunca precio spot** (manipulable). Es lo que usa la conversión de depósito/retiro.
- Ventana TWAP configurable (p.ej. 30 min). Si no hay pool/liquidez suficiente → oráculo indefinido → depósito/retiro deshabilitados (fail-safe).

## Modelo de datos (adiciones)

```prisma
model User {
  // ...existentes...
  walletAddress String?  // wallet on-chain del usuario (para retiros)
}

model ChainDeposit {
  id            String   @id @default(cuid())
  userId        String
  user          User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  txHash        String   @unique   // idempotencia por tx on-chain
  amountWei     String              // MERY recibido (unidades del token, string/bigint)
  priceCents    Int                 // precio$ de MERY usado en la conversión (snapshot)
  credits       Int                 // ☾ acreditados off-chain
  confirmations Int      @default(0)
  status        String   @default("pending") // pending | credited | reorged
  createdAt     DateTime @default(now())
}

model ChainWithdrawal {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  toAddress   String
  credits     Int                  // ☾ debitados off-chain (de earnings)
  priceCents  Int                  // precio$ de MERY usado (snapshot)
  amountWei   String               // MERY a enviar
  txHash      String?  @unique      // tx de salida
  status      String   @default("pending") // pending | signing | sent | confirmed | failed
  createdAt   DateTime @default(now())
  sentAt      DateTime?
}
```

`TokenConfig` gana: `chain String?` (base), `tokenAddress String?`, `custodyAddress String?`, `tokenDecimals Int @default(18)`. (`reserveCents` y `maxSupply`/`treasury` ya existen.)

## Flujos

### Depósito (on-chain MERY → ☾ off-chain)
1. Usuario ve su **dirección de depósito** (única por usuario, o compartida + memo/derivación) en `/cartera`.
2. Envía MERY desde su wallet.
3. **Watcher** (webhook Alchemy/QuickNode en Base) detecta la tx → crea `ChainDeposit(pending)`.
4. Tras **N confirmaciones** (finalidad): lee precio TWAP → `$transaction`: acredita `☾ = amount × priceCents / rateCents` a `balance`, guarda `priceCents` snapshot, `status=credited`. **Idempotente por `txHash`** (claim atómico). **Maneja reorgs** (si la tx se cae antes de finalidad → `reorged`, revertir crédito si ya se hizo).

### Retiro (☾ off-chain → on-chain MERY)
1. Usuario da su `walletAddress` + monto ☾ → **gate:** `launched` + `idVerified` + `kycVerified` (cumplimiento) + solvencia (reserva/custodia ≥ obligaciones).
2. `$transaction`: **débito atómico de `earnings`** (retirable) → `ChainWithdrawal(pending)`, snapshot `priceCents`, `amountWei` calculado a mercado.
3. **Servicio de payout** (fuera del server web, con la custodia) toma pendientes, firma y envía MERY desde la treasury → `txHash`, `status=sent` → tras confirmación `confirmed`. Reintentos/idempotencia por `ChainWithdrawal.id`. **Nunca se firma en el proceso Next.**

### Migración off-chain → on-chain (1:1)
- Al lanzar: pre-mint del supply 1e9 a la custodia. Los saldos in-app existentes ya cuadran con `maxSupply − treasury`. La custodia tiene los tokens que respaldan los saldos in-app. Retiros se habilitan (con cumplimiento + liquidez).

## Relación con el on-ramp BTCPay (ya construido)

Habrá **dos vías** de obtener ☾, ambas acreditan el mismo saldo estable:
- **BTC vía BTCPay** (on-ramp fiat-ish ya construido): paga BTC → ☾ al **peg** + reserva en `reserveCents`.
- **Depósito MERY on-chain** (este spec): envía MERY → ☾ al **precio de mercado**.
Coexisten. El retiro on-chain (☾ → MERY) es el reverso de la segunda vía.

## Seguridad e integridad

- **Idempotencia:** `txHash` (depósitos) y `id` (retiros); claim atómico (mismo patrón que la economía ya construida).
- **Reorgs/finalidad:** esperar confirmaciones suficientes antes de acreditar; revertir en reorg.
- **Firma fuera de la app:** el server web nunca tiene llaves; usa el servicio de custodia/firma.
- **Reconciliación continua:** balance on-chain de la custodia ≥ suma de saldos in-app respaldados + supply circulante fuera. Panel admin + alertas (extiende la vista de Solvencia ya construida).
- **Auditoría** del contrato + pentest de la custodia antes de mainnet. **Testnet primero.**

## Bloques (cuando se construya)

| # | Bloque | Depende |
|---|--------|---------|
| 1 | Contrato ERC-20 (Base Sepolia testnet) + auditoría + custodia Safe multisig | seguridad, símbolo/branding |
| 2 | Schema (`walletAddress`, `ChainDeposit`, `ChainWithdrawal`, config contrato) | — |
| 3 | Oráculo de precio (Uniswap TWAP) + gating por liquidez | 1, pool sembrado |
| 4 | Watcher de depósitos (webhook) + acreditación idempotente a mercado + reorgs | 1,2,3 |
| 5 | Retiro on-chain (débito earnings → payout vía custodia, a mercado) | 1,2,3, cumplimiento |
| 6 | Reconciliación/solvencia on-chain (extiende panel Solvencia) | 4,5 |
| 7 | Liquidez inicial en Uniswap (pool MERY/USDC) — **paso financiado** | 1, capital |
| 8 | Mainnet + habilitar (tras auditoría + cumplimiento + liquidez) | todo |

## Decisiones bloqueantes (externas a la IA)

1. **Símbolo + branding/logo** de Mercury y MeryCoin (pendiente; el usuario los rehará).
2. **Custodia:** Safe multisig self-custody (ahora) vs MPC (luego) — seguridad y costo.
3. **Regulatorio/legal:** ¿MERY es un valor pese al encuadre de utilidad? licencias, KYC/AML, jurisdicción, impuestos — **abogado**. El contexto adulto amplifica la exposición.
4. **Auditoría** del contrato (firma externa).
5. **Liquidez:** cuánto capital sembrar en el pool y cuándo (define cuándo enciende la puerta on-chain).
6. **Tokenomics finales:** decimales (18 propuesto), confirmar supply 1e9, utilidad exacta.

## Fuera de alcance (no en este spec)

- **Marketplace C2C** (cualquier usuario vende; comprador paga con ☾ o efectivo negociado fuera de plataforma) — **spec separado en cola**. Solo *usa* ☾ (ya funciona); no cambia el token.
- Desarrollo/auditoría del contrato, integración con custodia concreta, provisión de liquidez, gobernanza, staking, puentes cross-chain, aspectos legales.
