'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Package, Map, CheckCircle, Truck, User } from 'lucide-react';
import { useNostr } from '@/components/nostr-provider';

export default function Home() {
  const { isLoggedIn, isReady } = useNostr();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Feature cards data
  const features = [
    {
      icon: <Package size={24} />,
      title: 'Post a Package',
      description:
        'Create a new delivery request with location and destination',
      link: isLoggedIn ? '/post-package' : '/login',
      color: 'from-[#FF7170] to-[#FFE57F]',
    },
    {
      icon: <Map size={24} />,
      title: 'View Packages',
      description: 'Browse available packages on an interactive map',
      link: isLoggedIn ? '/view-packages' : '/login',
      color: 'from-[#0EA5E9] to-[#22D3EE]',
    },
    {
      icon: <Truck size={24} />,
      title: 'My Deliveries',
      description: "Track packages you've picked up and confirm deliveries",
      link: isLoggedIn ? '/my-deliveries' : '/login',
      color: 'from-[#8B5CF6] to-[#C084FC]',
    },
    {
      icon: <CheckCircle size={24} />,
      title: 'Confirm Delivery',
      description: 'Scan QR code to confirm package delivery',
      link: isLoggedIn ? '/confirm-delivery' : '/login',
      color: 'from-[#10B981] to-[#34D399]',
    },
    {
      icon: <User size={24} />,
      title: 'Profile',
      description: 'View your profile and reputation',
      link: isLoggedIn ? '/profile' : '/login',
      color: 'from-[#F59E0B] to-[#FBBF24]',
    },
  ];

  // If not ready yet, show loading
  if (!mounted || !isReady) {
    return (
      <div className='min-h-screen flex items-center justify-center'>
        <div className='animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full'></div>
        <p className='ml-3'>Loading...</p>
      </div>
    );
  }

  return (
    <main className='min-h-screen bg-white text-gray-800 overflow-hidden'>
      {/* Hero Section with Background Image */}
      <section className='relative pt-32 pb-32 overflow-hidden'>
        <div className='container mx-auto px-4 relative z-20'>
          <div className='max-w-2xl'>
            {/* Left Content */}
            <div className='flex flex-col items-start text-left'>
              <div className='inline-flex items-center gap-2 bg-gray-50 border border-gray-100 rounded-full px-4 py-2 mb-6'>
                <span className='inline-block w-2 h-2 rounded-full bg-[#FF7170]'></span>
                <span className='text-sm font-medium text-gray-700'>
                  Decentralized Delivery Platform
                </span>
              </div>

              <h1 className='text-4xl md:text-6xl font-bold mb-6 leading-tight text-gray-900'>
                Move Packages,
                <br />
                Build Reputation,
                <span className='block bg-gradient-to-r from-[#FF7170] to-[#FFE57F] text-transparent bg-clip-text'>
                  Stack Sats.
                </span>
              </h1>

              <p className='text-lg text-gray-600 mb-8 max-w-lg'>
                A to ₿ connects people who need packages delivered with those
                who can deliver them, all powered by Nostr technology.
              </p>

              <div className='flex flex-wrap gap-4'>
                <Link href={isLoggedIn ? '/post-package' : '/login'}>
                  <button className='px-8 py-4 bg-gradient-to-r from-[#FF7170] to-[#FFE57F] rounded-full text-white font-medium hover:shadow-glow-orange transform hover:-translate-y-1 transition-all duration-300 cursor-pointer'>
                    {isLoggedIn ? 'Post a Package' : 'Login with Nostr'}
                  </button>
                </Link>
                <Link href={isLoggedIn ? '/view-packages' : '/login'}>
                  <button className='px-8 py-4 bg-gray-50 border border-gray-200 rounded-full font-medium text-gray-700 hover:border-gray-300 transform hover:-translate-y-1 transition-all duration-300 cursor-pointer'>
                    View Map
                  </button>
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className='absolute top-0 left-[5%] md:left-[2%] lg:left-[5%] w-[250px] md:w-[280px] lg:w-[300px] h-[250px] md:h-[280px] lg:h-[300px] rounded-full bg-[#FF7170] opacity-10 md:opacity-8 lg:opacity-10 blur-[80px] md:blur-[90px] lg:blur-[100px]'></div>
        <div className='absolute top-[30%] right-0 md:right-[-5%] lg:right-0 w-[300px] md:w-[350px] lg:w-[400px] h-[300px] md:h-[350px] lg:h-[400px] rounded-full bg-[#22D3EE] opacity-10 md:opacity-8 lg:opacity-10 blur-[80px] md:blur-[90px] lg:blur-[100px]'></div>
        <div className='absolute bottom-[10%] left-0 md:left-[-5%] lg:left-0 w-[250px] md:w-[300px] lg:w-[350px] h-[250px] md:h-[300px] lg:h-[350px] rounded-full bg-[#C084FC] opacity-10 md:opacity-8 lg:opacity-10 blur-[80px] md:blur-[90px] lg:blur-[100px]'></div>
        <div className='absolute top-[15%] right-[20%] md:right-[15%] lg:right-[20%] w-[250px] md:w-[300px] lg:w-[350px] h-[250px] md:h-[300px] lg:h-[350px] rounded-full bg-[#8B5CF6] opacity-10 md:opacity-8 lg:opacity-10 blur-[80px] md:blur-[90px] lg:blur-[100px]'></div>
        {/* Additional orb for medium screens to fill potential gaps */}
        <div className='hidden md:block lg:hidden absolute top-[60%] right-[40%] w-[280px] h-[280px] rounded-full bg-[#FF7170] opacity-8 blur-[90px]'></div>
        {/* Hero Image - Hidden on mobile, positioned behind content on desktop */}
        <div className='hidden md:block absolute right-0 top-0 w-[65%] h-full z-10 overflow-hidden'>
          <div className='absolute inset-0 bg-gradient-to-l from-transparent to-white w-[30%] z-10'></div>
          <Image
            src='/logistics-app.png'
            alt='Logistics app interface showing package tracking and delivery features'
            width={1200}
            height={800}
            className='w-full h-full object-contain object-right animate-float'
            priority
          />
        </div>
      </section>

      {/* Wave Separator */}
      <div className='wave-separator'>
        <svg
          xmlns='http://www.w3.org/2000/svg'
          viewBox='0 0 1440 320'
          preserveAspectRatio='none'
        >
          <defs>
            <linearGradient
              id='wave-gradient'
              x1='0%'
              y1='0%'
              x2='100%'
              y2='0%'
            >
              <stop offset='0%' stopColor='#FF7170' />
              <stop offset='100%' stopColor='#FFE57F' />
            </linearGradient>
          </defs>
          <path
            fill='url(#wave-gradient)'
            fillOpacity='1'
            d='M0,96L48,112C96,128,192,160,288,186.7C384,213,480,235,576,224C672,213,768,171,864,149.3C960,128,1056,128,1152,149.3C1248,171,1344,213,1392,234.7L1440,256L1440,0L1392,0C1344,0,1248,0,1152,0C1056,0,960,0,864,0C768,0,672,0,576,0C480,0,384,0,288,0C192,0,96,0,48,0L0,0Z'
          ></path>
        </svg>
      </div>

      {/* Features Section */}
      <section className='py-20 relative features-section'>
        <div className='container mx-auto px-4'>
          <div className='text-center mb-16'>
            <h2 className='text-4xl md:text-5xl font-extrabold mb-4 text-black tracking-tight'>
              Powerful Features
            </h2>
            <p className='text-gray-600 max-w-2xl mx-auto'>
              Everything you need to send and receive packages in a
              decentralized way
            </p>
          </div>

          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8'>
            {features.map((feature, index) => (
              <Link href={feature.link} key={index} className='block group'>
                <div className='h-full bg-white border border-gray-100 rounded-2xl p-6 hover:border-opacity-0 transition-all duration-300 hover:shadow-xl relative overflow-hidden group-hover:transform group-hover:-translate-y-2'>
                  {/* Gradient background that appears on hover */}
                  <div className='absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-5 transition-opacity duration-300 z-0'></div>

                  {/* Icon with gradient background */}
                  <div
                    className={`w-12 h-12 rounded-xl bg-gradient-to-r ${feature.color} flex items-center justify-center mb-4`}
                  >
                    <div className='text-white'>{feature.icon}</div>
                  </div>

                  <h3 className='text-xl font-bold mb-2 relative z-10 text-gray-900'>
                    {feature.title}
                  </h3>
                  <p className='text-gray-600 mb-4 relative z-10'>
                    {feature.description}
                  </p>

                  <div className='mt-4 relative z-10'>
                    <span className='inline-flex items-center px-4 py-2 rounded-full bg-gradient-to-r from-[#FF7170] to-[#FFE57F] text-white text-sm font-medium transition-all duration-300 hover:shadow-lg hover:shadow-orange-300/30 hover:-translate-y-1'>
                      Learn more
                      <svg
                        className='ml-2 h-4 w-4'
                        viewBox='0 0 24 24'
                        fill='none'
                        xmlns='http://www.w3.org/2000/svg'
                      >
                        <path
                          d='M5 12H19M19 12L12 5M19 12L12 19'
                          stroke='currentColor'
                          strokeWidth='2'
                          strokeLinecap='round'
                          strokeLinejoin='round'
                        />
                      </svg>
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className='py-20 relative bg-gray-50'>
        <div className='absolute inset-0 z-0'>
          <div className='absolute top-[20%] right-[10%] w-[300px] h-[300px] rounded-full bg-[#8B5CF6] opacity-5 blur-[100px]'></div>
          <div className='absolute bottom-[10%] left-[10%] w-[250px] h-[250px] rounded-full bg-[#FF7170] opacity-5 blur-[100px]'></div>
        </div>

        <div className='container mx-auto px-4 relative z-10'>
          <div className='text-center mb-16'>
            <h2 className='text-4xl md:text-5xl font-bold mb-4 text-gray-900'>
              <span className='bg-gradient-to-r from-[#8B5CF6] to-[#C084FC] text-transparent bg-clip-text'>
                How It Works
              </span>
            </h2>
            <p className='text-gray-600 max-w-2xl mx-auto'>
              Simple steps to get your package delivered
            </p>
          </div>

          <div className='grid grid-cols-1 md:grid-cols-3 gap-8'>
            {/* Step 1 */}
            <div className='relative'>
              <div className='bg-white border border-gray-100 rounded-2xl p-6 h-full shadow-sm'>
                <div className='w-12 h-12 rounded-full bg-gradient-to-r from-[#FF7170] to-[#FFE57F] flex items-center justify-center mb-6 text-white font-bold'>
                  1
                </div>
                <h3 className='text-xl font-bold mb-4 text-gray-900'>
                  Post Your Package
                </h3>
                <p className='text-gray-600'>
                  Create a delivery request with pickup location, destination,
                  and payment amount in Bitcoin.
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className='relative'>
              <div className='bg-white border border-gray-100 rounded-2xl p-6 h-full shadow-sm'>
                <div className='w-12 h-12 rounded-full bg-gradient-to-r from-[#0EA5E9] to-[#22D3EE] flex items-center justify-center mb-6 text-white font-bold'>
                  2
                </div>
                <h3 className='text-xl font-bold mb-4 text-gray-900'>
                  Courier Picks Up
                </h3>
                <p className='text-gray-600'>
                  A nearby courier accepts your delivery request and picks up
                  your package.
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div>
              <div className='bg-white border border-gray-100 rounded-2xl p-6 h-full shadow-sm'>
                <div className='w-12 h-12 rounded-full bg-gradient-to-r from-[#8B5CF6] to-[#C084FC] flex items-center justify-center mb-6 text-white font-bold'>
                  3
                </div>
                <h3 className='text-xl font-bold mb-4 text-gray-900'>
                  Delivery Confirmation
                </h3>
                <p className='text-gray-600'>
                  Recipient scans QR code to confirm delivery and release
                  Bitcoin payment.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className='py-20'>
        <div className='container mx-auto px-4'>
          <div className='bg-gradient-to-r from-[#F8FAFC] to-[#F1F5F9] border border-gray-100 rounded-3xl p-8 md:p-12 relative overflow-hidden shadow-lg'>
            {/* Background Elements */}
            <div className='absolute inset-0 z-0'>
              <div className='absolute top-0 right-0 w-[300px] h-[300px] rounded-full bg-[#FF7170] opacity-5 blur-[100px]'></div>
              <div className='absolute bottom-0 left-0 w-[300px] h-[300px] rounded-full bg-[#22D3EE] opacity-5 blur-[100px]'></div>
            </div>

            <div className='relative z-10 flex flex-col md:flex-row items-center justify-between gap-8'>
              <div>
                <h2 className='text-3xl md:text-4xl font-bold mb-4 text-gray-900 text-center md:text-left'>
                  Ready to get started?
                </h2>
                <p className='text-gray-600 max-w-lg text-center md:text-left'>
                  Join the decentralized delivery revolution today and
                  experience the future of package delivery.
                </p>
              </div>
              <div className='flex flex-wrap gap-2'>
                <Link href={isLoggedIn ? '/post-package' : '/login'}>
                  <button className='px-8 py-4 bg-gradient-to-r from-[#FF7170] to-[#FFE57F] rounded-full text-white font-medium hover:shadow-glow-orange transform hover:-translate-y-1 transition-all duration-300 cursor-pointer'>
                    {isLoggedIn ? 'Post a Package' : 'Login with Nostr'}
                  </button>
                </Link>
                <Link href={isLoggedIn ? '/view-packages' : '/login'}>
                  <button className='px-8 py-4 bg-white border border-gray-200 rounded-full font-medium text-gray-700 hover:border-gray-300 transform hover:-translate-y-1 transition-all duration-300 cursor-pointer'>
                    View Map
                  </button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

    
    </main>
  );
}
