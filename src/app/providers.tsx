"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import { WagmiProvider } from "wagmi";
import { wagmiConfig } from "@/lib/web3";

const queryClient = new QueryClient();

export default function Providers({ children }: { children: React.ReactNode }) {
  const config = useMemo(() => wagmiConfig, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!process.env.NEXT_PUBLIC_REOWN_PROJECT_ID) return;

    // Lazy-init AppKit with commonjs require to avoid hard typing friction.
    // AppKit will register the <appkit-button /> web component.
    try {
      const { createAppKit } = require("@reown/appkit");
      const { WagmiAdapter } = require("@reown/appkit-adapter-wagmi");
      const { mainnet, sepolia } = require("wagmi/chains");
      const { http } = require("viem");
      const { skaleChain } = require("@/lib/skale/chain");

      const projectId = process.env.NEXT_PUBLIC_REOWN_PROJECT_ID;
      const metadata = {
        name: "Agentic Commerce",
        description: "AI-powered commerce on SKALE",
        url: "http://localhost:3000",
        icons: ["https://walletconnect.com/walletconnect-logo.png"],
      };

      const wagmiAdapter = new WagmiAdapter({
        projectId,
        networks: [mainnet, sepolia, skaleChain],
        transports: {
          [mainnet.id]: http(),
          [sepolia.id]: http(),
          [skaleChain.id]: http(),
        },
      });

      createAppKit({
        adapters: [wagmiAdapter],
        networks: [mainnet, sepolia, skaleChain],
        projectId,
        metadata,
      });
    } catch (error) {
      console.warn("AppKit init skipped", error);
    }
  }, []);

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}
