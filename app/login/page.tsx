'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { NostrLogin } from '@/components/nostr-login';
import { QuickStartGuide } from '@/components/quick-start-guide';

export default function LoginPage() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    // Check if user is already logged in
    const pubkey = localStorage.getItem('nostr_pubkey');
    if (pubkey) {
      setIsLoggedIn(true);
      // Only redirect if we came directly to the login page
      // This prevents redirect loops
      if (!document.referrer.includes('/')) {
        const timer = setTimeout(() => {
          router.push('/');
        }, 1500);
        return () => clearTimeout(timer);
      }
    }
  }, [router]);

  const handleLogin = (publicKey: string) => {
    // Login successful, redirect to home page
    setTimeout(() => {
      // Use replace instead of push to avoid browser history issues
      router.replace('/');
    }, 1000);

    window.location.href = '/';
  };

  return (
    <div className='min-h-screen flex items-center justify-center  px-4 py-12 mt-16'>
      <div className='w-full max-w-4xl'>
        {isLoggedIn ? (
          <div className='text-center'>
            <div className='animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4'></div>
            <p className='text-gray-600'>Already logged in. Redirecting...</p>
          </div>
        ) : (
          <div className='grid grid-cols-1 md:grid-cols-2 gap-8'>
            <div className='text-center md:text-left'>
              <div className='bg-gradient-to-r from-[#FF7170] to-[#FFE57F] rounded-full p-3 inline-flex mb-4'>
                <svg
                  xmlns='http://www.w3.org/2000/svg'
                  width='24'
                  height='24'
                  viewBox='0 0 24 24'
                  fill='none'
                  stroke='currentColor'
                  strokeWidth='2'
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  className='text-white'
                >
                  <path d='M16 16h6'></path>
                  <path d='M19 13v6'></path>
                  <path d='M12 15V3a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h8z'></path>
                </svg>
              </div>
              <h1 className='text-3xl font-bold text-gray-900 mb-2'>
                Login to A to ₿
              </h1>
              <p className='text-gray-600 mb-8'>
                Connect with your existing Nostr account to continue
              </p>
              <NostrLogin onLogin={handleLogin} />
            </div>
            <div>
              <QuickStartGuide />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
