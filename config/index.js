// config/index.js

import { cookieStorage, createStorage, http } from '@wagmi/core';
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi';
import { baseSepolia, base } from '@reown/appkit/networks';

// Get projectId from https://cloud.reown.com
export const projectId = 'c13f4ce46cefc0c967f0c802c28b3eb9';
console.log(projectId)


export const networks = [ baseSepolia, base];


// Set up the Wagmi Adapter (Config)
export const wagmiAdapter = new WagmiAdapter({
  storage: createStorage({
    storage: cookieStorage
  }),
  ssr: true,
  projectId,
  networks
});

export const config = wagmiAdapter.wagmiConfig;