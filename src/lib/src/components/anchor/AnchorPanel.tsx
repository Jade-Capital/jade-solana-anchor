import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useWallet } from "@/hooks/useWallet";
import {
  anchorJCR,
  canonicalize,
  explorerTx,
  sha256Hex,
  shortAddr,
} from "@/lib/solana";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

type ExistingAnchor = {
  signature: string;
  cr_hash: string;
  wallet: string;
  anchored_at: string;
  cr_json: any;
};

interface Props {
  recordId: string;
  payload: Record<string, unknown>;
  onAnchored?: () => void;
}

export default function AnchorPanel({ recordId, payload, onAnchored }: Props) {
  const { wallet, connect, hasPhantom } = useWallet();
  const { toast } = useToast();
  const [existing, setExisting] = useState<ExistingAnchor[]>([]);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<string>("");

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data } = await supabase
        .from("cr_records")
        .select("signature,cr_hash,wallet,anchored_at,cr_json")
        .eq("record_id", recordId)
        .order("anchored_at", { ascending: false });
      if (alive && data) setExisting(data as ExistingAnchor[]);
    })();
    (async () => {
      const hash = await sha256Hex(canonicalize(payload));
      if (alive) setPreview(hash);
    })();
    return () => {
      alive = false;
    };
  }, [recordId]);

  async function handleAnchor() {
    setBusy(true);
    try {
      if (!wallet) await connect();
      const res = await anchorJCR(recordId, payload);
      const { error } = await supabase.from("cr_records").insert({
        record_id: recordId,
        cr_version: "v1",
        cr_json: payload as any,
        cr_hash: res.sha256,
        signature: res.signature,
        wallet: res.wallet,
        network: "devnet",
      });
      if (error) throw error;
      setExisting((prev) => [
        {
          signature: res.signature,
          cr_hash: res.sha256,
          wallet: res.wallet,
          anchored_at: new Date().toISOString(),
          cr_json: payload,
        },
        ...prev,
      ]);
      toast({
        title: "Record anchored on Solana Devnet",
        description: `sig ${shortAddr(res.signature, 6)}`,
      });
      onAnchored?.();
    } catch (e: any) {
      toast({
        title: "Anchor failed",
        description: e?.message ?? String(e),
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="border border-border bg-card">
      <header className="px-4 py-3 border-b border-border flex items-center justify-between">
        <div>
          <h3 className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground font-mono">
            JCR — On-Chain Attestation
          </h3>
          <p className="text-xs text-foreground mt-0.5 font-mono">
            JADE Classification Record · Solana Devnet · Memo Program
          </p>
        </div>
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
          schema jade.jcr.v1
        </span>
      </header>

      <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
        <Field label="Record ID" value={recordId} />
        <Field label="SHA-256 (preview)" value={preview ? preview.slice(0, 24) + "…" : "computing…"} />
        <Field label="Memo Bytes" value={preview ? `~${78 + recordId.length}` : "—"} />
      </div>

      <div className="px-4 pb-4 flex items-center gap-3">
        <Button
          onClick={handleAnchor}
          disabled={busy || !hasPhantom}
          className="h-10 px-5 text-sm font-medium tracking-wide rounded-none"
        >
          {busy ? "Anchoring…" : existing.length ? "Re-anchor on Solana" : "Anchor JCR on Solana"}
        </Button>
        {!hasPhantom && (
          <span className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider">
            Phantom required ·{" "}
            <a className="underline" href="https://phantom.app" target="_blank" rel="noreferrer">
              install
            </a>
          </span>
        )}
        {wallet && (
          <span className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider">
            Signer ◎ {shortAddr(wallet)}
          </span>
        )}
      </div>

      {existing.length > 0 && (
        <div className="border-t border-border">
          <div className="px-4 py-2 text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
            Anchored Records ({existing.length})
          </div>
          <ul className="divide-y divide-border">
            {existing.map((a) => (
              <li key={a.signature} className="px-4 py-2 grid grid-cols-12 gap-2 text-xs font-mono">
                <span className="col-span-3 text-muted-foreground">
                  {new Date(a.anchored_at).toLocaleString()}
                </span>
                <span className="col-span-2 text-foreground">◎ {shortAddr(a.wallet)}</span>
                <span className="col-span-3 truncate" title={a.cr_hash}>
                  {a.cr_hash.slice(0, 16)}…
                </span>
                
                  className="col-span-2 text-foreground underline"
                  href={explorerTx(a.signature)}
                  target="_blank"
                  rel="noreferrer"
                >
                  Solscan ↗
                </a>
                <a className="col-span-2 text-foreground underline" href={`/verify/${a.signature}`}>
                  Verify ✓
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-foreground truncate" title={value}>
        {value}
      </div>
    </div>
  );
}
