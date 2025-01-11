import Image from 'next/image';
import Link from 'next/link';
import ConnectButton from './ConnectWallet';
import { useReadContract } from 'wagmi';
import GamesABI from '@/contract/abi/games.json';
import { useEffect } from 'react';

export default function Navbar() {
  const GAMES_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_GAMES_CONTRACT_ADDRESS_MONAD;
  
  const { data: nftCount, isError, error, isLoading } = useReadContract({
    address: GAMES_CONTRACT_ADDRESS,
    abi: GamesABI,
    functionName: 'getTotalNFTsMinted',
    watch: true,
    chainId: 20143, // Updated to match the chain configuration
  });

  useEffect(() => {
    if (error) {
      console.error('Contract read error:', error);
    }
  }, [error]);

  // Convert BigInt to number safely
  const formattedNftCount = nftCount ? Number(nftCount.toString()) : 0;

  return (
    <nav className="flex justify-between items-center px-4 sm:px-16 w-full pb-4 bg-[#836EF9] mt-4">
      <div className="relative h-24 w-48">
        <Link href="/">
          <Image
            src="/monadninja.png"
            alt="Logo"
            fill
            className="object-contain"
            priority
          />
        </Link>
      </div>
      <div className="hidden md:flex items-center gap-4">
        <div className="text-white">
          {isLoading ? (
            'Loading...'
          ) : isError ? (
            'Error loading NFT count'
          ) : (
            `Total NFTs minted: ${formattedNftCount}`
          )}
        </div>
        <ConnectButton />
      </div>
    </nav>
  );
}
