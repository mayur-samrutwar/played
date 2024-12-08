'use client';

import {
  ConnectWallet,
  Wallet,
  WalletDropdown,
  WalletDropdownBasename,
  WalletDropdownDisconnect,
} from '@coinbase/onchainkit/wallet';
import { Avatar, Name } from '@coinbase/onchainkit/identity';

export default function WalletWrapper() {
  return (
    <Wallet>
      <ConnectWallet 
        withWalletAggregator={true}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        <Avatar className="h-6 w-6" />
        <Name />
      </ConnectWallet>
      <WalletDropdown>
        <WalletDropdownBasename />
        <WalletDropdownDisconnect />
      </WalletDropdown>
    </Wallet>
  );
}
