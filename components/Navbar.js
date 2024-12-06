
import Image from 'next/image';
// import logo from '../public/logo.png';
import Link from 'next/link';

export default function Navbar() {
  return (
    <nav className="flex justify-between items-center px-4 sm:px-6 w-full border-b pb-4 border-gray-200">
      <div className="relative h-10 w-40">
        <Link href="/">
        {/* <Image
          src={logo}
          alt="Logo"
          fill
          className="object-contain"
          priority
        /> */}
        play.gg
        </Link>
      </div>
      <div className="flex-grow text-center space-x-8">
        <Link href="/games" className="text-lg text-gray-700 hover:text-gray-900">
          Games
        </Link>
        <Link href="/compete" className="text-lg text-gray-700 hover:text-gray-900">
          Compete 1v1
        </Link>
        <Link href="/challenges" className="text-lg text-gray-700 hover:text-gray-900">
          Challenges
        </Link>
        <Link href="/npc" className="text-lg text-gray-700 hover:text-gray-900">
          NPC
        </Link>
      </div>
      <w3m-button label="Login" balance="hide" />
    </nav>
  );
}