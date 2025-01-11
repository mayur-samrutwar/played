import { ConnectKitButton } from "connectkit";

export default function ConnectButton() {
  return (
    <ConnectKitButton.Custom>
      {({ isConnected, isConnecting, show, hide, address, ensName }) => {
        return (
          <button
            onClick={show}
            className="bg-white text-black px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            {isConnected ? (
              ensName ?? `${address?.slice(0, 6)}...${address?.slice(-4)}`
            ) : (
              "Connect Wallet"
            )}
          </button>
        );
      }}
    </ConnectKitButton.Custom>
  );
}
