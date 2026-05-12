import { useCallback, useEffect, useState } from "react";
import { getPhantom } from "@/lib/solana";

export function useWallet() {
  const [wallet, setWallet] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [hasPhantom, setHasPhantom] = useState<boolean>(false);

  useEffect(() => {
    try {
      const p = getPhantom();
      setHasPhantom(true);
      p.connect({ onlyIfTrusted: true } as any)
        .then((r) => setWallet(r.publicKey.toString()))
        .catch(() => {});
    } catch {
      setHasPhantom(false);
    }
  }, []);

  const connect = useCallback(async () => {
    setConnecting(true);
    try {
      const phantom = getPhantom();
      const { publicKey } = await phantom.connect();
      const w = publicKey.toString();
      setWallet(w);
      return w;
    } finally {
      setConnecting(false);
    }
  }, []);

  const disconnect = useCallback(async () => {
    try {
      const phantom = getPhantom();
      await phantom.disconnect();
    } catch {}
    setWallet(null);
  }, []);

  return { wallet, connect, disconnect, connecting, hasPhantom };
}
