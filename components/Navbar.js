import Image from 'next/image';
import Link from 'next/link';
import ConnectButton from './ConnectWallet';
import { useReadContract } from 'wagmi';
import GamesABI from '@/contract/abi/games.json';

export default function Navbar() {
  const GAMES_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_GAMES_CONTRACT_ADDRESS_MONAD;
  const { data: nftCount } = useReadContract({
    address: GAMES_CONTRACT_ADDRESS,
    abi: GamesABI,
    functionName: 'getTotalNFTsMinted',
    watch: true,
  });

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
          Total NFTs minted: {nftCount ? Number(nftCount) : 0}
        </div>
        <ConnectButton />
      </div>
    </nav>
  );
}
