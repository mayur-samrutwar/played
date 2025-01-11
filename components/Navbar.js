import Image from 'next/image';
import Link from 'next/link';
import ConnectButton from './ConnectWallet';


export default function Navbar() {
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
      <div className="hidden md:block">
       <ConnectButton />
      </div>
    </nav>
  );
}
