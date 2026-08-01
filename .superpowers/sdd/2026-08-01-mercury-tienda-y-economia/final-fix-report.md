# Final fix report — feat/tienda-economia

## FIX 1 (Important, I4) — external checkout no longer reserves stock
`src/app/api/checkout/route.ts`: the per-item stock-decrement loop (`tx.productVariant.updateMany` guard + `STOCK:` throw) is now wrapped in `if (s.paymentMethod === "merycoin") { ... }`, so `external` orders are created `pending` without touching stock. Added comment: `// v1: externo no reserva stock — reserve-on-pay cuando exista el procesador real`.

## FIX 2 (Minor, M1) — checkout re-validates variant active
Same file, same `updateMany` guard: `where` now includes `active: true` alongside `stock: { gte: it.qty }`, so a variant deactivated after being added to cart fails the guard (`dec.count === 0`) and returns `Sin stock: <name>` instead of selling it.

## FIX 3 (Minor, M2) — withdraw amountCents capped
`src/app/api/wallet/withdraw/route.ts`: added a server-side cap right after computing `amountCents = credits * cfg.rateCents;`:
```
if (amountCents > 2_000_000_000) return NextResponse.json({ error: "Monto demasiado grande" }, { status: 400 });
```
placed before the `$transaction` call.

## FIX 4 (Minor, M4) — resolveZone country normalized
`src/app/api/checkout/route.ts`: added `const shipCountry = s.shipCountry.trim().toUpperCase();` right after computing `subtotalCents`, and switched both `resolveZone(shipCountry)` and the `Order.shipCountry` field write to use the normalized value (previously `resolveZone(s.shipCountry)` and `shipCountry: s.shipCountry`). A lowercase API call now still matches uppercase-stored zone countries.

## FIX 5 (Minor, B6c) — spend(0) avoided on fully-free carts
Same file: the merycoin `spend` call is now guarded with `(subtotalCredits + shippingCredits) > 0` in addition to `paymentMethod === "merycoin"`. A zero-total merycoin order is created `status: "paid"` without invoking `spend`, avoiding the throw on a 0-amount spend.

## Verification
- `npx tsc --noEmit` — passed, no output/errors.
- `npm run lint` — 10 pre-existing errors / 152 pre-existing warnings across unrelated files (login/page.tsx, AgeGate.tsx, FeedTabs.tsx, PostComposer.tsx, PostMedia.tsx, SearchBar.tsx, SlidePublish.tsx, icons.tsx, etc. — all `react-hooks/set-state-in-effect`, `react-hooks/refs`, `react/display-name`, and no-img-element rules, none touching this change). Zero errors or warnings in the two touched files (`src/app/api/checkout/route.ts`, `src/app/api/wallet/withdraw/route.ts`).

## Commit
Single commit on `feat/tienda-economia`:
```
fix(tienda/wallet): externo no reserva stock, variante activa en checkout, tope amountCents, país case-insensitive, evitar spend(0)
```
