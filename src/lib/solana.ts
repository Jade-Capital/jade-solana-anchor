// Solana Devnet anchor primitives — Phantom-only, SPL Memo program.
// Memo format v1 (5 fields, pipe-delimited):
//   JCR|v1|<record_id>|<sha256_hex>|<content_addr>
// content_addr is empty today; reserved for an IPFS CID or Arweave tx id
// once the decentralized mirror ships (roadmap Q3 2026). Parser is back-compat
// with 4-field memos written before the slot existed.

import {
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
  clusterApiUrl,
} from "@solana/web3.js";

export const MEMO_PROGRAM_ID = new PublicKey(
  "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr"
);
export const NETWORK = "devnet" as const;
export const connection = new Connection(clusterApiUrl(NETWORK), "confirmed");

// ---------- Phantom wallet ----------
type PhantomProvider = {
  isPhantom?: boolean;
  publicKey: PublicKey | null;
  connect: (opts?: { onlyIfTrusted?: boolean }) => Promise<{ publicKey: PublicKey }>;
  disconnect: () => Promise<void>;
  signAndSendTransaction: (tx: Transaction) => Promise<{ signature: string }>;
  on: (event: string, cb: (...args: unknown[]) => void) => void;
};

export function getPhantom(): PhantomProvider {
  const w = window as unknown as { solana?: PhantomProvider };
  if (!w.solana?.isPhantom) {
    throw new Error("Phantom wallet not found. Install from phantom.app");
  }
  return w.solana;
}

// ---------- Canonical JSON + SHA-256 ----------
export function canonicalize(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(canonicalize).join(",") + "]";
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return "{" + keys.map((k) => JSON.stringify(k) + ":" + canonicalize(obj[k])).join(",") + "}";
}

export async function sha256Hex(input: string): Promise<string> {
  const buf = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// ---------- Memo build ----------
export function buildMemo(
  recordId: string,
  sha256_hex: string,
  contentAddr = ""
): string {
  return `JCR|v1|${recordId}|${sha256_hex}|${contentAddr}`;
}

// ---------- Anchor ----------
export type AnchorResult = {
  signature: string;
  memo: string;
  sha256: string;
  wallet: string;
  network: typeof NETWORK;
};

export async function anchorJCR(
  recordId: string,
  payload: unknown,
  contentAddr = ""
): Promise<AnchorResult> {
  const phantom = getPhantom();
  const { publicKey } = await phantom.connect();

  const canonical = canonicalize(payload);
  const sha = await sha256Hex(canonical);
  const memo = buildMemo(recordId, sha, contentAddr);

  const ix = new TransactionInstruction({
    keys: [{ pubkey: publicKey, isSigner: true, isWritable: true }],
    programId: MEMO_PROGRAM_ID,
    data: Buffer.from(memo, "utf8"),
  });

  const tx = new Transaction().add(ix);
  tx.feePayer = publicKey;
  const { blockhash } = await connection.getLatestBlockhash();
  tx.recentBlockhash = blockhash;

  const { signature } = await phantom.signAndSendTransaction(tx);
  await connection.confirmTransaction(signature, "confirmed");

  return { signature, memo, sha256: sha, wallet: publicKey.toBase58(), network: NETWORK };
}

export async function anchorBuildProof(
  milestone: string,
  fileHash: string
): Promise<AnchorResult> {
  return anchorJCR(`build:${milestone}`, { milestone, fileHash });
}

// ---------- Verify / fetch memo ----------
export type VerifyResult =
  | {
      ok: true;
      signature: string;
      wallet: string;
      memo: string;
      parsed: {
        kind: "jcr";
        version: "v1";
        record_id: string;
        sha256: string;
        content_addr: string;
      };
    }
  | { ok: false; reason: string };

export async function fetchMemo(signature: string): Promise<VerifyResult> {
  const tx = await connection.getParsedTransaction(signature, {
    maxSupportedTransactionVersion: 0,
  });
  if (!tx) return { ok: false, reason: "Transaction not found on devnet" };

  const memoIx = tx.transaction.message.instructions.find(
    (i) => "program" in i && i.program === "spl-memo"
  ) as { parsed?: string } | undefined;

  const memo = memoIx?.parsed;
  if (!memo) return { ok: false, reason: "No memo found in transaction" };

  const parts = memo.split("|");
  if (parts.length < 4 || parts[0] !== "JCR" || parts[1] !== "v1") {
    return { ok: false, reason: "Memo is not a JCR|v1 record" };
  }

  const wallet =
    tx.transaction.message.accountKeys.find((k) => k.signer)?.pubkey.toBase58() ?? "";

  return {
    ok: true,
    signature,
    wallet,
    memo,
    parsed: {
      kind: "jcr",
      version: "v1",
      record_id: parts[2],
      sha256: parts[3],
      content_addr: parts[4] ?? "",
    },
  };
}

// ---------- Utilities ----------
export function shortAddr(addr: string, n = 4): string {
  if (!addr || addr.length <= n * 2 + 1) return addr;
  return `${addr.slice(0, n)}…${addr.slice(-n)}`;
}

export function explorerTx(signature: string): string {
  return `https://solscan.io/tx/${signature}?cluster=${NETWORK}`;
}
