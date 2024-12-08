'use client';

import { http, createConfig } from 'wagmi';
import { base, baseSepolia } from 'viem/chains';

const projectId = process.env.NEXT_PUBLIC_WC_PROJECT_ID;

if (!projectId) {
  throw new Error('NEXT_PUBLIC_WC_PROJECT_ID is required');
}

export const wagmiConfig = createConfig({
  chains: [base, baseSepolia],
  multiInjectedProviderDiscovery: false,
  ssr: true,
  transports: {
    [base.id]: http(),
    [baseSepolia.id]: http(),
  },
});