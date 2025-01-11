import { getDefaultConfig } from "connectkit";
import { createConfig } from "wagmi";
import { baseSepolia } from "wagmi/chains";
import { http } from "wagmi";

const walletConnectProjectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "";
const chains = [baseSepolia];

export const config = createConfig(
  getDefaultConfig({
    chains: chains,
    transports: {
      [baseSepolia.id]: http(),
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
