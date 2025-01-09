import Image from 'next/image';
import logo from '../public/logo.png';
import Link from 'next/link';
import { useState } from 'react';

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
      <div className="hidden md:flex flex-grow justify-center text-center space-x-8">
        <Link href="/games" className="text-md text-gray-700 hover:text-gray-900">
          Games
        </Link>
        <span className="text-md text-gray-700">
           1v1 Battle <span className="text-sm text-gray-500">(Coming Soon)</span>
        </span>
      </div>
      <div className="hidden md:block">
        <w3m-button label="Login" balance="hide" />
      </div>
    </nav>
  );
}
