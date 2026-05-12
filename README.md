# JADE Solana Anchor

On-chain anchoring rail for JADE Classification Records (JCRs).
Built during Colosseum Frontier 2026.

JADE is the classification rail for sustainable capital — a standards
body publishing structured, machine-readable records for sustainable
capital deals. This repo contains the Solana integration: the
on-chain piece that anchors each JCR's cryptographic hash on Solana
devnet, making the classification publicly verifiable in milliseconds.

## What it does

1. Build a JADE Classification Record (JCR) — a canonical JSON
   describing a sustainable capital deal's framework alignment,
   mandate fit, structure, and lifecycle.
2. Canonicalize it (sorted keys, no whitespace) and SHA-256 it.
3. Write `CR|v1|<record_id>|<sha256>` to the SPL Memo program
   on Solana devnet.
4. Store the off-chain JCR in Supabase, keyed by transaction signature.
5. `/verify/:signature` recomputes the hash and proves it matches
   the on-chain memo. Trust-minimized verification.

Also supports `BUILD|<milestone>|<file_hash>|<iso>|<wallet>` build
attestations — the timestamps anchored on Solana during the
hackathon window prove the code was written in-window.

Architecture

Off-chain (the substance):** JADE produces canonical JSONs for
each sustainable capital deal, based on a classification engine
crosswalking every major sustainability framework regime.

On-chain (the rail):** SHA-256 hash of the canonical JSON, signed
with JADE's Ed25519 key via Phantom wallet, published to Solana's
SPL Memo program on devnet.

Verification:** Any party fetches the on-chain hash, fetches the
off-chain JSON from JADE, recomputes the hash, and confirms match.
No trust required. The math is the trust.

Build-proof timestamps

Five milestones of this build were anchored on Solana devnet during
the hackathon window, signed by the same wallet that anchors JCRs:

- T0 (scaffolds) — [Solscan link]
- T1 (Solana helper) — [Solscan link]
- T2 (JCR panel) — [Solscan link]
- T3 (deal ingest) — [Solscan link]
- T4 (verify page) — [Solscan link]

Hero anchored JCRs

- ACWA Power / PIF / Aramco $6.0B — [Solscan link]
- Brookfield Catalytic Transition Fund $2.4B — [Solscan link]
- M-KOPA Series E — [Solscan link]

Disclosure

This repo contains the on-chain integration code built during the
Colosseum Frontier hackathon — the JCR schema, signing logic, hash
format, and Solana anchoring mechanism (Phantom wallet connect,
SHA-256, Memo program transaction, Solscan verification). The JCR
format and the publish-to-Solana flow are the integration submitted
for judging.

JADE's underlying classification engine and database schema, which
feed inputs into the JCR producer, were built prior and are not
part of this submission.

This is V1 of a larger on-chain architecture. Future phases including
programmable mandate enforcement and cross-chain mirroring are on
the post-hackathon roadmap.

Stack

- React + Vite + TypeScript + Tailwind + shadcn/ui
- `@solana/web3.js`
- Phantom wallet
- SPL Memo program (program ID: `MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr`)
- Supabase (off-chain JSON storage)
- SHA-256 (Web Crypto API)
- Ed25519 signatures (Phantom)

Files

- `src/lib/solana.ts` — Phantom + memo + canonical-JSON + verifier
- `src/hooks/useWallet.ts` — Phantom connect/disconnect hook
- `src/components/wallet/WalletPill.tsx` — connected-wallet chip
- `src/components/anchor/AnchorPanel.tsx` — anchor UI
- `src/pages/VerifyPage.tsx` — public `/verify/:signature` route
- `supabase/migrations/0001_anchor_tables.sql` — DB tables

Setup

```bash
npm install
cp .env.example .env   # set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY
npm run dev
```

Run the migration in `supabase/migrations/` against your Supabase project.

Cost

A memo write on Devnet is effectively free; on Mainnet it's ~$0.0001.
Switch the network by changing `SOLANA_NETWORK` in `src/lib/solana.ts`.

License

MIT

Built for

[Colosseum Frontier Hackathon 2026](https://colosseum.com/frontier)

JADE — The classification rail for sustainable capital.
And we're just getting started.
