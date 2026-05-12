import { useWallet } from "@/hooks/useWallet";
import { shortAddr } from "@/lib/solana";

export default function WalletPill() {
  const { wallet, disconnect, hasPhantom } = useWallet();
  if (!hasPhantom || !wallet) return null;

  return (
    <button
      onClick={() => disconnect()}
      title={`${wallet} — click to disconnect`}
      className="text-[10px] uppercase tracking-wider text-foreground hover:text-muted-foreground border border-border px-2 py-1 rounded-none font-mono"
    >
      ◎ {shortAddr(wallet)} <span className="text-muted-foreground">· devnet</span>
    </button>
  );
}
