'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { getRelays, checkRelay } from '@/lib/nostr-service';
import { Wifi, WifiOff } from 'lucide-react';

export function NostrStatus() {
  const [status, setStatus] = useState<
    'checking' | 'connected' | 'disconnected'
  >('checking');
  const [workingRelays, setWorkingRelays] = useState<string[]>([]);
  const [totalRelays, setTotalRelays] = useState<string[]>([]);

  useEffect(() => {
    const checkRelays = async () => {
      const relays = getRelays();
      setTotalRelays(relays);

      // Check all relays in parallel
      const results = await Promise.all(
        relays.map((relay) => checkRelay(relay))
      );

      // Filter working relays
      const working = relays.filter((_, index) => results[index]);
      setWorkingRelays(working);

      // Update status
      setStatus(working.length > 0 ? 'connected' : 'disconnected');
    };

    checkRelays();

    // Check relays periodically
    const interval = setInterval(checkRelays, 30000); // Every 30 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className='inline-flex items-center'>
            {status === 'checking' ? (
              <Badge variant='outline' className='gap-1 px-2 py-0 h-6'>
                <div className='animate-spin h-3 w-3 border-2 border-current border-t-transparent rounded-full'></div>
                <span>Checking</span>
              </Badge>
            ) : status === 'connected' ? (
              <Badge
                variant='outline'
                className='gap-1 px-2 py-0 h-6 bg-green-50 text-green-700 border-green-200'
              >
                <Wifi className='h-3 w-3' />
                <span>
                  {workingRelays.length}/{totalRelays.length}
                </span>
              </Badge>
            ) : (
              <Badge
                variant='outline'
                className='gap-1 px-2 py-0 h-6 bg-red-50 text-red-700 border-red-200'
              >
                <WifiOff className='h-3 w-3' />
                <span>Disconnected</span>
              </Badge>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <div className='space-y-2 max-w-xs'>
            <p className='font-medium'>Nostr Relay Status</p>
            <div className='text-xs space-y-1'>
              {totalRelays.map((relay, index) => {
                const isWorking = workingRelays.includes(relay);
                return (
                  <div
                    key={relay}
                    className='flex items-center justify-between'
                  >
                    <span className='truncate'>{relay}</span>
                    {status === 'checking' ? (
                      <span className='text-gray-500'>Checking...</span>
                    ) : isWorking ? (
                      <span className='text-green-600'>Connected</span>
                    ) : (
                      <span className='text-red-600'>Failed</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
