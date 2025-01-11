import { getDefaultConfig } from "connectkit";
import { createConfig } from "wagmi";
import { baseSepolia } from "wagmi/chains";
import { http } from "wagmi";

const walletConnectProjectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "";
const monadDevnet = {
  id: 20143,
  name: "Monad Devnet",
  network: "Monad Devnet",
  nativeCurrency: { name: "MON", symbol: "MON", decimals: 18 },
  rpcUrls: {
    default: "https://rpc-devnet.monadinfra.com/rpc/3fe540e310bbb6ef0b9f16cd23073b0a",
  },
  blockExplorers: {
    default: { name: "Monad Devnet Explorer", url: "" },
  },
  testnet: true,
};
const chains = [ monadDevnet];

export const config = createConfig(
  getDefaultConfig({
    chains: chains,
    transports: {
      // [baseSepolia.id]: http(),
      [monadDevnet.id]: http(),
    },
    // Required API Keys
    alchemyId: process.env.NEXT_PUBLIC_ALCHEMY_ID || "",
    walletConnectProjectId: walletConnectProjectId,

    // Required
    appName: "monadninja",

    // Optional
    appDescription: "MonadNinja",
    appUrl: "https://monadninja.xyz",
    appIcon: "https://monadninja.xyz/monadninja.png",
  })
);
