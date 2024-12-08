'use client';

import { createConfig, http } from 'wagmi';
import { base, baseSepolia } from 'viem/chains';
import { injected } from 'wagmi/connectors';

const projectId = process.env.NEXT_PUBLIC_WC_PROJECT_ID;

if (!projectId) {
  throw new Error('NEXT_PUBLIC_WC_PROJECT_ID is required');
}

export const wagmiConfig = createConfig({
  chains: [base, baseSepolia],
  connectors: [
    injected({
      target: 'metaMask'
    }),
  ],
  ssr: true,
  transports: {
    [base.id]: http(),
    [baseSepolia.id]: http(),
  },
});