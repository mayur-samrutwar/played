import Image from 'next/image';
// import logo from '../public/logo.png';
import Link from 'next/link';
import { useState } from 'react';

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <nav className="flex justify-between items-center px-4 sm:px-6 w-full border-b pb-4 border-gray-200 bg-white relative">
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

      {/* Mobile menu button */}
      <button 
        className="block md:hidden"
        onClick={() => setIsMenuOpen(!isMenuOpen)}
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
        </svg>
      </button>

      {/* Desktop menu */}
      <div className="hidden md:flex flex-grow text-center space-x-8">
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
      <div className="hidden md:block">
        <w3m-button label="Login" balance="hide" />
      </div>

      {/* Mobile menu dropdown */}
      <div className={`${isMenuOpen ? 'block' : 'hidden'} md:hidden fixed left-0 right-0 top-[60px] bg-white border-b border-gray-200 p-4 space-y-4 z-50 shadow-lg`}>
        <Link href="/games" className="block text-lg text-gray-700 hover:text-gray-900">Games</Link>
        <Link href="/compete" className="block text-lg text-gray-700 hover:text-gray-900">Compete 1v1</Link>
        <Link href="/challenges" className="block text-lg text-gray-700 hover:text-gray-900">Challenges</Link>
        <Link href="/npc" className="block text-lg text-gray-700 hover:text-gray-900">NPC</Link>
        <w3m-button label="Login" balance="hide" />
      </div>
    </nav>
  );
}