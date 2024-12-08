import Image from 'next/image';
import logo from '../public/logo.png';
import Link from 'next/link';
import dynamic from 'next/dynamic';

// Dynamically import WalletWrapper with SSR disabled
const WalletWrapper = dynamic(() => import('./WalletWrapper'), {
  ssr: false
});

export default function Navbar() {
  return (
    <nav className="flex justify-between items-center px-4 sm:px-6 w-full border-b pb-4 border-gray-200 bg-white relative">
      <div className="relative h-10 w-40">
        <Link href="/">
          <Image
            src={logo}
            alt="Logo"
            fill
            className="object-contain"
            priority
          />
        </Link>
      </div>
      
      {/* Navigation Links - Remove hidden class */}
      <div className="flex flex-grow justify-center text-center space-x-8">
        <Link href="/games" className="text-md text-gray-700 hover:text-gray-900">
          Games
        </Link>
        <Link href="/battle" className="text-md text-gray-700 hover:text-gray-900">
          1v1 Battle
        </Link>
        <Link href="/challenges" className="text-md text-gray-700 hover:text-gray-900">
          Challenges
        </Link>
      </div>
      
      {/* Wallet - Remove hidden class */}
      <div className="flex items-center">
        <WalletWrapper 
          text="Connect Wallet"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        />
      </div>
    </nav>
  );
}
