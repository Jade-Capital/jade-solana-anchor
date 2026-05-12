import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  canonicalize,
  explorerTx,
  fetchMemo,
  sha256Hex,
  shortAddr,
  type VerifyResult,
} from "@/lib/solana";

type StoredRecord = {
  record_id: string;
  cr_json: unknown;
  cr_hash: string;
  wallet: string;
  anchored_at: string;
};

export default function VerifyPage() {
  const { signature = "" } = useParams<{ signature: string }>();
  const [chain, setChain] = useState<VerifyResult | null>(null);
  const [stored, setStored] = useState<StoredRecord | null>(null);
  const [recomputed, setRecomputed] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const [chainRes, storedRes] = await Promise.all([
          fetchMemo(signature),
          supabase
            .from("cr_records")
            .select("record_id, cr_json, cr_hash, wallet, anchored_at")
            .eq("signature", signature)
            .maybeSingle(),
        ]);

        if (cancelled) return;
        setChain(chainRes);

        if (storedRes.data) {
          setStored(storedRes.data as StoredRecord);
          const recompute = await sha256Hex(canonicalize(storedRes.data.cr_json));
          if (!cancelled) setRecomputed(recompute);
        }
      } catch (e) {
        if (!cancelled) setErr(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [signature]);

  const status = useMemo(() => {
    if (!chain || !chain.ok) return null;
    if (!stored || !recomputed) return "no-mirror";
    return recomputed === chain.parsed.sha256 ? "match" : "mismatch";
  }, [chain, stored, recomputed]);

  if (loading) return <div className="p-6 text-sm text-muted-foreground">Verifying…</div>;
  if (err) return <div className="p-6 text-sm text-destructive">{err}</div>;
  if (!chain || !chain.ok)
    return (
      <div className="p-6 text-sm text-destructive">
        {chain?.reason ?? "Unknown error"}
      </div>
    );

  const contentAddr = chain.parsed.content_addr;

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <header>
        <h1 className="text-xl font-semibold">JCR Verification</h1>
        <p className="text-sm text-muted-foreground">
          Independent on-chain verification of a JADE Classification Record (Solana devnet).
        </p>
      </header>

      <section className="space-y-2 rounded-lg border p-4">
        <Row label="Status">
          {status === "match" && (
            <span className="text-emerald-600">Hash matches on-chain anchor</span>
          )}
          {status === "mismatch" && (
            <span className="text-destructive">Off-chain JSON has been modified</span>
          )}
          {status === "no-mirror" && (
            <span className="text-muted-foreground">
              On-chain anchor verified. Off-chain mirror unavailable.
            </span>
          )}
        </Row>
        <Row label="Record ID">{chain.parsed.record_id}</Row>
        <Row label="On-chain SHA-256">
          <code className="break-all text-xs">{chain.parsed.sha256}</code>
        </Row>
        <Row label="Recomputed SHA-256">
          {recomputed ? (
            <code className="break-all text-xs">{recomputed}</code>
          ) : (
            <span className="text-muted-foreground">No off-chain mirror</span>
          )}
        </Row>
        <Row label="Decentralized mirror">
          {contentAddr ? (
            <code className="break-all text-xs">{contentAddr}</code>
          ) : (
            <span className="text-muted-foreground">On roadmap (Q3 2026)</span>
          )}
        </Row>
        <Row label="Issuer wallet">
          <code className="text-xs">{shortAddr(chain.wallet)}</code>
        </Row>
        <Row label="Anchored at">
          {stored?.anchored_at ? new Date(stored.anchored_at).toLocaleString() : "—"}
        </Row>
        <Row label="Explorer">
          
            className="text-primary underline"
            href={explorerTx(signature)}
            target="_blank"
            rel="noreferrer"
          >
            View on Solscan
          </a>
        </Row>
      </section>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[160px_1fr] items-start gap-3 text-sm">
      <div className="text-muted-foreground">{label}</div>
      <div>{children}</div>
    </div>
  );
}
