"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import { WagmiProvider } from "wagmi";
import { wagmiConfig } from "@/lib/web3";

const queryClient = new QueryClient();

export default function Providers({ children }: { children: React.ReactNode }) {
  const config = useMemo(() => wagmiConfig, []);

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}
