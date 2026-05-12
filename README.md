# JADE Solana Anchor

On-chain anchoring rail for JADE Classification Records (JCRs).
Built during Colosseum Frontier 2026.

JADE is the classification rail for sustainable capital — a standards body publishing structured, machine-readable records for sustainable capital deals. This repo contains the Solana integration: the on-chain piece that anchors each JCR's cryptographic hash on Solana devnet, making the classification publicly verifiable in milliseconds.

- Network: Solana devnet
- Cost: ~$0.0001 per anchor
- Custom programs: none — SPL Memo only
- Wallet: Phantom

## What it does

1. Build a JADE Classification Record (JCR) — a canonical JSON describing a sustainable capital deal's framework alignment, mandate fit, structure, and lifecycle.
2. Canonicalize it (sorted keys, no whitespace) and SHA-256 it.
3. Write `JCR|v1|<record_id>|<sha256>|<content_addr>` to the SPL Memo program on Solana devnet.
4. Store the off-chain JCR in Postgres, keyed by transaction signature.
5. `/verify/:signature` recomputes the hash and proves it matches the on-chain memo. Trust-minimized verification.

Also supports `BUILD|<milestone>|<file_hash>|<iso>|<wallet>` build attestations — the timestamps anchored on Solana during the hackathon window prove the code was written in-window.

## Stack

- Vite + React + TypeScript + Tailwind + shadcn/ui
- `@solana/web3.js`
- Phantom wallet
- SPL Memo program (program ID: `MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr`)
- Postgres for the off-chain canonical store (Supabase in the demo; any Postgres works — see "Storage adapter" below)
- SHA-256 (Web Crypto API)
- Ed25519 signatures (Phantom)

## Files

- `src/lib/solana.ts` — anchor / verify primitives, canonical JSON, SHA-256, memo format
- `src/components/anchor/AnchorPanel.tsx` — anchor UI with hash preview
- `src/components/anchor/VerifyPage.tsx` — public verifier
- `src/hooks/useWallet.ts` + `src/components/wallet/WalletPill.tsx` — Phantom connect UI
- `supabase/migrations/0001_anchor_tables.sql` — `cr_records` + `build_attestations` schema (RLS, public read)

## Setup

```bash
pnpm install
pnpm dev
```

Set Phantom to **Devnet** in its settings. Get free SOL at https://faucet.solana.com.

---

## Hybrid by design

This kit is deliberately hybrid. Each layer does the one thing it is best at.

```text
┌─────────────────────────────────────────────────────────────┐
│ ON-CHAIN  — Solana (SPL Memo)                               │
│ • 32-byte SHA-256 of canonical JSON                         │
│ • Ed25519 signature of the issuer wallet                    │
│ • Permanent, censorship-resistant, ~$0.0001 / record        │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│ OFF-CHAIN CANONICAL  — Postgres                             │
│ • Stores the JSON keyed by transaction signature            │
│ • Contract: { signature → canonical_json }                  │
│ • Demo uses Supabase; any Postgres or KV store fits         │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│ DECENTRALIZED MIRROR  — IPFS / Arweave  (roadmap, Q3 2026)  │
│ • Content-addressed copy of the canonical JSON              │
│ • Slot already reserved in the memo (5th field)             │
│ • Survives the off-chain provider entirely                  │
└─────────────────────────────────────────────────────────────┘
```

**Why hybrid.** Putting full JCRs on-chain is wasteful: most records are 5–50 KB and per-byte storage is real money. Putting nothing on-chain leaves nothing to verify against. The hash-on-chain / data-off-chain split is the same pattern used by tokenized-asset issuers (BlackRock BUIDL, Franklin BENJI, Ondo) and W3C Verifiable Credentials.

### Memo format JCR|v1|<record_id>|<sha256_hex>|<content_addr>

The 5th field — `content_addr` — is empty today. When the decentralized mirror ships it will hold the IPFS CID or Arweave transaction id of the same canonical JSON. The verifier already parses it.

### Storage adapter

The off-chain store is touched in exactly two places: `AnchorPanel.tsx` (insert after anchoring) and `VerifyPage.tsx` (select by signature). The contract is `{ signature → JSON }`. Swap Supabase for vanilla `pg`, DynamoDB, S3 + key index, or anything else by replacing those two call sites.

---

## Anti-tamper — survives the vendor

Once a JCR is anchored, no one — including JADE — can tamper with it without detection.

- **The on-chain hash is permanent.** Solana finality + the issuer wallet's Ed25519 signature mean the SHA-256 is immutable and provably authored.
- **Any change to the off-chain JSON breaks verification.** The verifier recomputes SHA-256 from the canonical JSON and compares to the on-chain value. One byte changes → mismatch.
- **The decentralized mirror (Q3 2026) survives the provider.** Once IPFS/Arweave content addresses are populated, the JCR outlives JADE as an organization. If JADE shut down tomorrow, every previously-anchored JCR remains independently verifiable using only a Solana RPC node and the public mirror.

JADE — or any future operator of this kit — is structurally prevented from rewriting history. The only honest move is to anchor a new corrected record and link it to the original.

---

## Verification

Anyone can independently verify an anchored JCR using the on-chain transaction.

The `/verify/{signature}` page is part of the JADE platform. The public Solscan transaction provides independent verification of the on-chain hash without requiring JADE platform access — the SHA-256 is visible directly in the memo on Solscan and can be recomputed against the canonical JSON by any third party. Post-hackathon, JADE will publish a standalone verify endpoint at `jade.app/verify/{signature}` accessible without JADE platform access.

The verification algorithm has five steps. Anyone with the transaction signature and the JSON can run them.

Step 1: fetch the memo from Solana.
Step 2: fetch the JSON from the off-chain store, or from IPFS/Arweave once populated.
Step 3: recompute SHA-256 of the canonical JSON.
Step 4: confirm the recomputed hash equals the on-chain hash.
Step 5: confirm the transaction was signed by the expected issuer wallet.

---

## Build-proof timestamps

Five milestones of this build were anchored on Solana devnet during the hackathon window, signed by the same wallet that anchors JCRs:

- T0 (scaffolds) — [Solscan link]
- T1 (Solana helper) — [Solscan link]
- T2 (JCR panel) — [Solscan link]
- T3 (deal ingest) — [Solscan link]
- T4 (verify page) — [Solscan link]

## Hero anchored JCRs

- ACWA Power / PIF / Aramco $6.0B — [Solscan link]
- Brookfield Catalytic Transition Fund $2.4B — [Solscan link]
- M-KOPA Series E — [Solscan link]

---

## Disclosure

This repo contains the on-chain integration code built during the Colosseum Frontier hackathon — the JCR schema, signing logic, hash format, and Solana anchoring mechanism (Phantom wallet connect, SHA-256, Memo program transaction, Solscan verification). The JCR format and the publish-to-Solana flow are the integration submitted for judging.

JADE's underlying classification engine and database schema, which feed inputs into the JCR producer, were built prior and are not part of this submission.

This is V1 of a larger on-chain architecture. Future phases including programmable mandate enforcement and cross-chain mirroring are on the post-hackathon roadmap.

## License

MIT

## Built for

[Colosseum Frontier Hackathon 2026](https://colosseum.com/frontier)

JADE — The classification rail for sustainable capital.
And we're just getting started.
