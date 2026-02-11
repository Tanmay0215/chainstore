import { createConfig, http } from "wagmi";
import { mainnet, sepolia } from "wagmi/chains";
import { skaleChain } from "./skale/chain";

export const chains = [mainnet, sepolia, skaleChain] as const;

export const wagmiConfig = createConfig({
  chains,
  ssr: true,
  transports: {
    [mainnet.id]: http(),
    [sepolia.id]: http(),
    [skaleChain.id]: http(),
  },
});
