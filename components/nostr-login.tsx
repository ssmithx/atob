'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Key, AlertCircle, ExternalLink } from 'lucide-react';
import { nip19, getPublicKey } from 'nostr-tools';

interface NostrLoginProps {
  onLogin: (publicKey: string) => void;
  onCancel?: () => void;
}

export function NostrLogin({ onLogin, onCancel }: NostrLoginProps) {
  const [loading, setLoading] = useState(false);
  const [hasExtension, setHasExtension] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [nsecKey, setNsecKey] = useState('');

  // Check if browser extension is available - only on client side
  useEffect(() => {
    setHasExtension(
      typeof window !== 'undefined' && window.nostr !== undefined
    );
    setMounted(true);
  }, []);

  const handleExtensionLogin = async () => {
    setLoading(true);
    try {
      if (!window.nostr) {
        throw new Error('No Nostr extension found');
      }

      const publicKey = await window.nostr.getPublicKey();
      if (!publicKey) {
        throw new Error('Failed to get public key from extension');
      }

      // Store the public key in localStorage
      localStorage.setItem('nostr_pubkey', publicKey);

      toast.success('Successfully connected to Nostr', {
        description: 'You are now logged in with your Nostr extension',
      });

      onLogin(publicKey);
    } catch (error) {
      console.error('Extension login error:', error);
      toast.error('Login Failed', {
        description:
          'Could not connect to your Nostr extension. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleNsecLogin = async () => {
    setLoading(true);
    try {
      if (!nsecKey) {
        throw new Error('Please enter your nsec key');
      }

      // Trim whitespace from the nsec key
      const trimmedNsec = nsecKey.trim();
      console.log('Attempting to decode nsec key:', trimmedNsec);

      // Basic validation of nsec format
      if (!trimmedNsec.startsWith('nsec1')) {
        throw new Error('Invalid nsec key format - must start with nsec1');
      }

      try {
        // Decode the nsec key
        console.log('Calling nip19.decode...');
        const decoded = nip19.decode(trimmedNsec);
        console.log('Decoded result:', decoded);
        
        const { type, data } = decoded;
        if (type !== 'nsec' || !(data instanceof Uint8Array)) {
          throw new Error('Invalid nsec key format');
        }

        // Get the public key directly from the Uint8Array
        const publicKey = getPublicKey(data);
        console.log('Generated public key:', publicKey);

        // Convert Uint8Array to hex string for storage
        const privateKey = Array.from(data)
          .map(b => b.toString(16).padStart(2, '0'))
          .join('');

        // Store both keys in localStorage
        localStorage.setItem('nostr_pubkey', publicKey);
        localStorage.setItem('nostr_privkey', privateKey);

        toast.success('Successfully logged in with nsec', {
          description: 'You are now logged in with your nsec key',
        });

        onLogin(publicKey);
      } catch (decodeError) {
        console.error('Detailed decode error:', decodeError);
        if (decodeError instanceof Error) {
          if (decodeError.message.includes('checksum')) {
            throw new Error('Invalid nsec key - please check for any extra characters or spaces');
          }
          throw new Error(`Decode error: ${decodeError.message}`);
        }
        throw decodeError;
      }
    } catch (error) {
      console.error('Nsec login error:', error);
      toast.error('Login Failed', {
        description: error instanceof Error ? error.message : 'Invalid nsec key',
      });
    } finally {
      setLoading(false);
    }
  };

  // Don't render extension-specific content until after client-side mount
  if (!mounted) {
    return (
      <Card className='w-full max-w-md mx-auto'>
        <CardHeader>
          <CardTitle className='flex items-center gap-2 '>
            <Key className='h-5 w-5' />
            Connect to Nostr
          </CardTitle>
          <CardDescription>
            Use your existing Nostr account to connect to A to ₿
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-6'>
          <div className='flex justify-center py-4'>
            <div className='animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full'></div>
          </div>
        </CardContent>
        <CardFooter className='flex flex-col gap-4'>
          <p className='text-xs text-center text-gray-500'>
            Already have a Nostr account on apps like Iris, Damus, or Snort? You
            can use the same account here!
          </p>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className='w-full max-w-md mx-auto'>
      <CardHeader>
        <CardTitle className='flex items-center gap-2'>
          <Key className='h-5 w-5' />
          Connect to Nostr
        </CardTitle>
        <CardDescription>
          Use your existing Nostr account to connect to A to ₿
        </CardDescription>
      </CardHeader>
      <CardContent className='space-y-6'>
        {hasExtension && (
          <Button
            onClick={handleExtensionLogin}
            className='w-full flex items-center justify-center gap-2 bg-gray-50'
            disabled={loading}
          >
            {loading ? (
              <span className='animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full'></span>
            ) : (
              <Key className='h-4 w-4' />
            )}
            Connect with Extension
          </Button>
        )}

        <div className='relative'>
          <div className='absolute inset-0 flex items-center'>
            <span className='w-full border-t border-gray-200' />
          </div>
          <div className='relative flex justify-center text-xs uppercase'>
            <span className='bg-white px-2 text-gray-500'>Or</span>
          </div>
        </div>

        <div className='space-y-4'>
          <Input
            type='password'
            placeholder='Enter your nsec key'
            value={nsecKey}
            onChange={(e) => setNsecKey(e.target.value)}
            className='w-full'
          />
          <Button
            onClick={handleNsecLogin}
            className='w-full flex items-center justify-center gap-2 bg-gray-50'
            disabled={loading || !nsecKey}
          >
            {loading ? (
              <span className='animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full'></span>
            ) : (
              <Key className='h-4 w-4' />
            )}
            Login with nsec
          </Button>
        </div>

        {!hasExtension && (
          <div className='bg-amber-50 border border-amber-200 rounded-md p-4 text-amber-800 text-sm'>
            <div className='flex items-start gap-2'>
              <AlertCircle className='h-5 w-5 mt-0.5 flex-shrink-0' />
              <div>
                <p className='font-medium'>No Nostr extension detected</p>
                <p className='mt-1'>
                  For the best experience, we recommend installing a Nostr
                  extension like Alby or nos2x.
                </p>
                <div className='mt-3 flex gap-2'>
                  <a
                    href='https://getalby.com'
                    target='_blank'
                    rel='noopener noreferrer'
                    className='text-amber-900 underline flex items-center gap-1 text-xs'
                  >
                    Get Alby <ExternalLink className='h-3 w-3' />
                  </a>
                  <a
                    href='https://github.com/fiatjaf/nos2x'
                    target='_blank'
                    rel='noopener noreferrer'
                    className='text-amber-900 underline flex items-center gap-1 text-xs'
                  >
                    Get nos2x <ExternalLink className='h-3 w-3' />
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter className='flex flex-col gap-4'>
        <p className='text-xs text-center text-gray-500'>
          Already have a Nostr account on apps like Iris, Damus, or Snort? You
          can use the same account here!
        </p>
      </CardFooter>
    </Card>
  );
}
