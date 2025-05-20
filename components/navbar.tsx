'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Package, Menu, X } from 'lucide-react';
import { NostrConnectButton } from '@/components/nostr-connect-button';
import { useNostr } from '@/components/nostr-provider';

export function Navbar() {
  const { isLoggedIn, isReady } = useNostr();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Handle scroll effect for navbar
  useEffect(() => {
    setMounted(true);

    const handleScroll = () => {
      if (window.scrollY > 20) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // If not ready yet, show nothing (will be handled by page loading state)
  if (!mounted || !isReady) {
    return null;
  }

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? 'bg-white/80 backdrop-blur-lg shadow-md' : 'bg-transparent'
      }`}
    >
      <div className='container mx-auto px-4 py-4 flex justify-between items-center'>
        <Link href='/' className='flex items-center gap-2'>
          <div className='bg-gradient-to-r from-[#FF7170] to-[#FFE57F] rounded-full p-2'>
            <Package className='h-5 w-5 text-white' />
          </div>
          <span className='font-bold text-xl text-gray-900'>A to ₿</span>
        </Link>

        {/* Desktop Navigation */}
        <div className='hidden md:flex items-center gap-6'>
          <Link
            href={isLoggedIn ? '/post-package' : '/login'}
            className='text-gray-600 hover:text-[#FF7170] transition-colors'
          >
            Post Package
          </Link>
          <Link
            href={isLoggedIn ? '/view-packages' : '/login'}
            className='text-gray-600 hover:text-[#22D3EE] transition-colors'
          >
            View Map
          </Link>
          <Link
            href={isLoggedIn ? '/my-deliveries' : '/login'}
            className='text-gray-600 hover:text-[#C084FC] transition-colors'
          >
            My Deliveries
          </Link>
          <NostrConnectButton />
        </div>

        {/* Mobile Menu Button */}
        <button
          className='md:hidden text-gray-800'
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Navigation */}
      {isMenuOpen && (
        <div className='md:hidden bg-white border-t border-gray-100 shadow-lg animate-fade-in'>
          <div className='container mx-auto px-4 py-4 flex flex-col gap-4'>
            <Link
              href={isLoggedIn ? '/post-package' : '/login'}
              className='py-3 px-4 hover:bg-gray-50 rounded-lg transition-colors text-gray-800'
              onClick={() => setIsMenuOpen(false)}
            >
              Post Package
            </Link>
            <Link
              href={isLoggedIn ? '/view-packages' : '/login'}
              className='py-3 px-4 hover:bg-gray-50 rounded-lg transition-colors text-gray-800'
              onClick={() => setIsMenuOpen(false)}
            >
              View Map
            </Link>
            <Link
              href={isLoggedIn ? '/my-deliveries' : '/login'}
              className='py-3 px-4 hover:bg-gray-50 rounded-lg transition-colors text-gray-800'
              onClick={() => setIsMenuOpen(false)}
            >
              My Deliveries
            </Link>
            <div className='py-3 px-4'>
              <NostrConnectButton />
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
