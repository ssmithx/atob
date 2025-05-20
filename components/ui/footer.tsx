import { Package } from 'lucide-react';

export function Footer() {
  return (
    <footer className='bg-white border-t border-gray-100 py-12'>
      <div className='container mx-auto px-4'>
        <div className='flex flex-col md:flex-row justify-between items-center'>
          <div className='flex items-center gap-2 mb-6 md:mb-0'>
            <div className='bg-gradient-to-r from-[#FF7170] to-[#FFE57F] rounded-full p-2'>
              <Package className='h-5 w-5 text-white' />
            </div>
            <span className='font-bold text-xl text-gray-900'>A to ₿</span>
          </div>

          <div className='flex flex-col items-center md:items-end gap-2'>
            <p className='text-gray-500 text-sm'>
              Built by{' '}
              <a
                href='https://github.com/alexandriaroberts'
                target='_blank'
                rel='noopener noreferrer'
                className='text-[#FF7170] hover:text-[#000] transition-colors'
              >
                Alexandria Roberts
              </a>
              for atob.
            </p>
            <p className='text-gray-500 text-sm'>
              &copy; {new Date().getFullYear()} A to ₿. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
} 