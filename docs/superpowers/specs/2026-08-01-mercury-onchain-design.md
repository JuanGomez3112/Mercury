# Mercury — MeryCoin On-Chain (token real, modelo híbrido custodial)

- **Fecha:** 2026-08-01
- **Estado:** DISEÑO / documentado. **No implementado.** Decisión **grande** con implicaciones **regulatorias, financieras y de seguridad de custodia** — requiere abogado y decisiones de negocio. La IA no despliega contratos ni mueve fondos reales.
- **Proyecto:** Mercury (`E:\Proyectos\Proyectos\Programacion\Mercury`).

> ⚠️ **No es asesoría legal/financiera.** Emitir un token puede ser un valor/instrumento regulado; custodiar fondos de terceros = licencias, KYC/AML, seguros. Ver [[2026-08-01-mercury-cumplimiento-design]] y [[2026-08-01-mercury-onramp-pagos-design]]. Trata esto como diseño técnico, no como vía libre.

## Objetivo

Llevar **MeryCoin** a una blockchain como token real (la gran decisión diferida del concepto), con un **modelo híbrido custodial**: la app sigue rápida y gratis por dentro (off-chain), y la cadena aporta valor/liquidez real vía **depósito y retiro** del token.

## Modelo híbrido custodial (elegido)

- **Off-chain (ledger actual):** propinas, PPV, suscripción, P2P, compras — siguen en la DB (`balance`/`earnings`/`treasury`), **instantáneas y sin gas**. Es la capa de aplicación. No cambia.
- **On-chain:** solo **depositar** (traer tokens reales a tu saldo in-app) y **retirar** (sacar tu saldo a tu wallet). La plataforma **custodia** una wallet (treasury on-chain); el `treasury`/`reserve` off-chain se respalda con el balance on-chain real.
- Analogía: un exchange centralizado. Dentro = libro contable rápido; fronteras (depósito/retiro) = on-chain.
- **Reconciliación:** `supply on-chain circulante fuera de la plataforma + saldos in-app = maxSupply`. La wallet custodial de la plataforma tiene los tokens que respaldan los saldos in-app.

## Cadena (decisión del usuario)

Presenta trade-offs; se elige al construir:
| Opción | Pros | Contras |
|---|---|---|
| **ERC-20 en L2** (Base / Polygon / Arbitrum) | Ecosistema EVM enorme, tooling maduro (viem/ethers), fees bajos en L2, puentes/DEX | Fees no-cero, EVM gas |
| **SPL en Solana** | Fees ínfimos, rápido | Ecosistema/tooling distinto, menos librerías server |
Recomendación general: **ERC-20 en una L2** por tooling/ecosistema, salvo que priorices fees mínimos → Solana. (El vault ya barajaba ambas.)

## Contrato del token

- Estándar (ERC-20 / SPL) con **max supply fijo = 1e9** (igual al `maxSupply` off-chain → migración 1:1).
- **Mint controlado:** solo la plataforma (owner/multisig) puede mint/burn según entradas/salidas reales; idealmente **pre-mintear el supply** a la treasury on-chain y no volver a mintear (supply fijo verdadero) — el "treasury off-chain" es cuánto de ese supply está sin distribuir.
- Ownership: **multisig** (no una sola llave) para mint/pausa/upgrade. Auditoría del contrato antes de mainnet.
- Metadata: nombre "MeryCoin", símbolo (ej. MERY), decimales.

## Custodia y llaves (crítico)

- Wallet **hot** (operativa, para procesar retiros) + **cold/multisig** (reserva). 
- Gestión de llaves: **custodio/MPC** (Fireblocks, Cobo, etc.) o self-custody con multisig (Safe) — **decisión de seguridad**. Nunca llaves en el server/app.
- Límites: hot wallet con fondos mínimos; reposición desde cold con aprobación.

## Modelo de datos (adiciones)

```prisma
model User {
  walletAddress String?  // wallet on-chain del usuario (para retiros)
}

model ChainDeposit {
  id          String   @id @default(cuid())
  userId      String
  txHash      String   @unique   // idempotencia por tx on-chain
  amount      String              // en unidades del token (string/bigint)
  credits     Int                 // ☾ acreditados off-chain
  confirmations Int   @default(0)
  status      String   @default("pending") // pending | credited | reorged
  createdAt   DateTime @default(now())
}

model ChainWithdrawal {
  id          String   @id @default(cuid())
  userId      String
  toAddress   String
  credits     Int                 // ☾ debitados off-chain
  amount      String
  txHash      String?  @unique     // tx de salida
  status      String   @default("pending") // pending | sent | confirmed | failed
  createdAt   DateTime @default(now())
  sentAt      DateTime?
}
```
`TokenConfig` gana referencia al contrato (`chain`, `tokenAddress`, `custodyAddress`).

## Flujos

### Depósito (on-chain → in-app)
1. Usuario ve una **dirección de depósito** (única por usuario o un memo/tag) en `/cartera`.
2. Envía MERY a esa dirección desde su wallet.
3. Un **watcher** (servicio que escucha la cadena / indexer / webhook de Alchemy-Helius) detecta la tx → crea `ChainDeposit(pending)`.
4. Tras N confirmaciones → `$transaction`: acredita ☾ off-chain (`balance`), `status=credited`. **Idempotente por `txHash`**. Maneja **reorgs** (revertir si la tx se cae).

### Retiro (in-app → on-chain)
1. Usuario da su `walletAddress` + monto → gate (`launched`, `idVerified`, `kycVerified`).
2. `$transaction`: débito atómico de `earnings` (retirable) → `ChainWithdrawal(pending)`.
3. Servicio de payout firma y envía la tx desde la hot wallet (**fuera del server web**, con la custodia) → `txHash`, `status=sent` → tras confirmación `confirmed`. Reintentos/idempotencia por `ChainWithdrawal.id`.
4. Nunca se firma en el proceso Next; el envío lo hace el sistema de custodia.

### Migración off-chain → on-chain (1:1)
- Al lanzar el token: pre-mint del supply a la custodia; los saldos in-app existentes ya cuadran con `maxSupply − treasury`. La `reserve` on-chain = tokens en custodia respaldando saldos in-app. Retiros empiezan a habilitarse (con cumplimiento).

## Seguridad e integridad

- **Idempotencia** por `txHash` (depósitos) y por id (retiros); claim atómico (mismo patrón que la economía).
- **Reorgs/finalidad:** esperar confirmaciones suficientes antes de acreditar; revertir en reorg.
- **Firma fuera de la app:** el server web nunca tiene llaves; usa el servicio de custodia/firma.
- **Reconciliación continua:** balance on-chain de la custodia ≥ suma de saldos in-app respaldados. Alertas.
- **Auditoría** del contrato + pentest de la custodia antes de mainnet. Testnet primero.

## Bloques (cuando se construya)

| # | Bloque | Depende |
|---|--------|---------|
| 1 | Contrato del token (testnet) + auditoría + custodia/multisig | cadena elegida, seguridad |
| 2 | Schema (`walletAddress`, `ChainDeposit`, `ChainWithdrawal`, config contrato) | — |
| 3 | Watcher de depósitos (indexer/webhook) + acreditación idempotente + reorgs | 1,2 |
| 4 | Retiro on-chain (débito earnings → payout vía custodia) | 1,2, cumplimiento |
| 5 | Reconciliación/solvencia on-chain + panel admin | 3,4 |
| 6 | Mainnet + habilitar (tras auditoría + cumplimiento) | todo |

## Decisiones bloqueantes (externas a la IA)

1. **Cadena** (ERC-20 L2 / SPL Solana).
2. **Custodia** (MPC/custodio vs multisig self-custody) — decisión de seguridad y costo.
3. **Regulatorio/legal:** ¿el token es un valor? licencias, KYC/AML, jurisdicción, impuestos — **abogado**.
4. Auditoría del contrato (firma externa).
5. Tokenomics finales (símbolo, decimales, si hay más supply que el 1e9 actual, utilidad/gobernanza).

## Fuera de alcance

Desarrollo/auditoría del contrato, integración con custodia concreta, DEX/liquidez, gobernanza, staking, puentes cross-chain, aspectos legales.
