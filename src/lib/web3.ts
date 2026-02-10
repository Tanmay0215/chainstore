import { createConfig, http } from "wagmi";
import { mainnet, sepolia } from "wagmi/chains";

export const chains = [mainnet, sepolia] as const;

export const wagmiConfig = createConfig({
  chains,
  ssr: true,
  transports: {
    [mainnet.id]: http(),
    [sepolia.id]: http(),
  },
});
