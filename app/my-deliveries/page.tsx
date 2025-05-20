'use client';

import { useEffect, useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { ArrowLeft, CheckCircle, RefreshCw, Truck } from 'lucide-react';
import Link from 'next/link';
import {
  getMyDeliveries,
  completeDelivery,
  getEffectiveStatus,
} from '@/lib/nostr';
import { useNostr } from '@/components/nostr-provider';
import { QRCodeSVG } from 'qrcode.react';
import { debugStorage } from '@/lib/local-package-service';
import { type PackageData } from '@/lib/nostr-types';

export default function MyDeliveries() {
  const { isReady } = useNostr();
  const [deliveries, setDeliveries] = useState<PackageData[]>([]);
  const [selectedDelivery, setSelectedDelivery] = useState<PackageData | null>(
    null
  );
  const [showQR, setShowQR] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [completingId, setCompletingId] = useState<string | null>(null);

  // Update the fetchDeliveries function to ensure proper filtering and logging
  const fetchDeliveries = async () => {
    try {
      console.log('Fetching my deliveries...');
      setLoadingError(null);

      // Debug localStorage to see what's there
      debugStorage();

      // Set a timeout to prevent getting stuck in loading state
      const timeoutId = setTimeout(() => {
        if (loading) {
          console.log('Fetch timeout reached, using local data only');
          setLoading(false);
          setRefreshing(false);
          setLoadingError('Timeout reached. Some data may not be available.');
        }
      }, 5000); // 5 second timeout

      // Fetch deliveries from Nostr
      const pkgs = await getMyDeliveries();
      clearTimeout(timeoutId);

      console.log('Raw deliveries returned:', pkgs);

      // Log the status of each package for debugging
      pkgs.forEach((pkg) => {
        console.log(
          `Package ${pkg.id}: status=${
            pkg.status
          }, effective=${getEffectiveStatus(pkg)}`
        );
      });

      // Only show in_transit deliveries using the effective status
      const activeDeliveries = pkgs.filter(
        (pkg) => getEffectiveStatus(pkg) === 'in_transit'
      );
      console.log(
        `Filtered to ${activeDeliveries.length} active deliveries with effective status="in_transit"`
      );

      setDeliveries(activeDeliveries);

      // Update selected delivery if it's no longer active
      if (
        selectedDelivery &&
        !activeDeliveries.some((d) => d.id === selectedDelivery.id)
      ) {
        console.log(
          `Selected delivery ${selectedDelivery.id} is no longer active, clearing selection`
        );
        setSelectedDelivery(null);
        setShowQR(false);
      }
    } catch (error) {
      console.error('Error fetching deliveries:', error);
      setLoadingError('Failed to load deliveries. Please try again.');
      toast.error('Error', {
        description: 'Failed to load deliveries. Please try again.',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!isReady) return;

    // Fetch deliveries when component mounts
    fetchDeliveries();

    // Set up a refresh interval to periodically check for new deliveries
    const refreshInterval = setInterval(() => {
      console.log('Auto-refreshing deliveries...');
      fetchDeliveries();
    }, 30000); // Refresh every 30 seconds

    // Force a complete status refresh once when the component mounts
    import('@/lib/nostr').then(({ forceStatusRefresh }) => {
      forceStatusRefresh().catch((error) => {
        console.error('Error during initial status refresh:', error);
      });
    });

    return () => clearInterval(refreshInterval);
  }, [isReady]);

  // Update the handleComplete function to ensure proper state updates
  const handleComplete = async (packageId: string) => {
    try {
      console.log(`Marking package ${packageId} as delivered`);
      setCompletingId(packageId); // Set the loading state for this specific package

      // Complete delivery using Nostr
      await completeDelivery(packageId);
      console.log(
        `Package ${packageId} marked as delivered in Nostr and localStorage`
      );

      // Update local state - remove the completed delivery immediately
      setDeliveries((prev) => {
        const updated = prev.filter((pkg) => pkg.id !== packageId);
        console.log(
          `Removed package ${packageId} from UI, ${updated.length} deliveries remaining`
        );
        return updated;
      });

      // Clear selection if this was the selected delivery
      if (selectedDelivery?.id === packageId) {
        console.log(
          `Clearing selected delivery since ${packageId} was completed`
        );
        setSelectedDelivery(null);
        setShowQR(false);
      }

      toast.success('Delivery Completed', {
        description: 'The delivery has been marked as completed.',
      });

      // Refresh the list after a short delay to ensure everything is in sync
      setTimeout(() => {
        console.log('Refreshing deliveries list after completion');
        fetchDeliveries();
      }, 1000);
    } catch (error) {
      console.error('Error completing delivery:', error);
      toast.error('Error', {
        description: 'Failed to complete delivery. Please try again.',
      });
    } finally {
      setCompletingId(null); // Clear the loading state
    }
  };

  const generateQRValue = (packageId: string) => {
    // Generate a URL to the confirmation page
    return `${window.location.origin}/confirm-delivery?id=${packageId}`;
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchDeliveries();
  };

  if (!isReady) {
    return (
      <div className='container mx-auto px-4 pt-24 pb-8'>
        <div className='flex justify-center items-center h-64'>
          <div className='animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full'></div>
          <p className='ml-2'>Loading Nostr...</p>
        </div>
      </div>
    );
  }

  return (
    <div className='container mx-auto px-4 pt-24 pb-8'>
      <Link href='/' className='flex items-center text-sm mb-6 hover:underline'>
        <ArrowLeft className='mr-2 h-4 w-4' />
        Back to Home
      </Link>

      <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
        <div className='lg:col-span-2'>
          <Card className='h-full'>
            <CardHeader className='flex flex-row items-center justify-between'>
              <div>
                <CardTitle className='flex items-center'>
                  <Truck className='mr-2 h-5 w-5' />
                  My Active Deliveries
                </CardTitle>
                <CardDescription>
                  {loading
                    ? 'Loading deliveries...'
                    : `${deliveries.length} active deliveries`}
                </CardDescription>
              </div>
              <Button
                variant='outline'
                size='sm'
                onClick={handleRefresh}
                disabled={loading || refreshing}
                className='flex items-center gap-2'
              >
                <RefreshCw
                  className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`}
                />
                {refreshing ? 'Refreshing...' : 'Refresh'}
              </Button>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className='space-y-2'>
                  {[1, 2].map((i) => (
                    <div
                      key={i}
                      className='h-24 bg-gray-100 animate-pulse rounded-md'
                    ></div>
                  ))}
                </div>
              ) : loadingError ? (
                <div className='text-center py-8 text-amber-600'>
                  <p>{loadingError}</p>
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={handleRefresh}
                    className='mt-4'
                  >
                    Try Again
                  </Button>
                </div>
              ) : deliveries.length === 0 ? (
                <div className='text-center py-8 text-gray-500'>
                  <p>You have no active deliveries</p>
                  <p className='text-sm mt-2'>
                    Pick up a package from the View Map page
                  </p>
                </div>
              ) : (
                <div className='space-y-4'>
                  {deliveries.map((delivery) => (
                    <Card
                      key={delivery.id}
                      className={`cursor-pointer ${
                        selectedDelivery?.id === delivery.id
                          ? 'border-primary'
                          : ''
                      }`}
                      onClick={() => {
                        setSelectedDelivery(delivery);
                        setShowQR(false);
                      }}
                    >
                      <CardContent className='p-4'>
                        <div className='font-medium'>{delivery.title}</div>
                        <div className='text-sm text-gray-500 mt-1'>
                          From: {delivery.pickupLocation}
                        </div>
                        <div className='text-sm text-gray-500'>
                          To: {delivery.destination}
                        </div>
                        <div className='flex justify-between items-center mt-2'>
                          <div className='font-medium'>
                            {delivery.cost} sats
                          </div>
                          <div className='flex gap-2'>
                            <Button
                              size='sm'
                              variant='outline'
                              className='cursor-pointer'
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedDelivery(delivery);
                                setShowQR(true);
                              }}
                            >
                              Show QR
                            </Button>
                            <Button
                              size='sm'
                              className='bg-gray-50 border border-gray-200 rounded-full font-medium text-gray-700 hover:border-gray-300 transform hover:-translate-y-1 transition-all duration-300 cursor-pointer'
                              onClick={(e) => {
                                e.stopPropagation();
                                handleComplete(delivery.id);
                              }}
                              disabled={completingId === delivery.id}
                            >
                              {completingId === delivery.id ? (
                                <>
                                  <div className='animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full mr-2'></div>
                                  Completing...
                                </>
                              ) : (
                                'Complete'
                              )}
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div>
          <Card className='h-full'>
            <CardHeader>
              <CardTitle className='flex items-center'>
                <CheckCircle className='mr-2 h-5 w-5' />
                Delivery Details
              </CardTitle>
              <CardDescription>
                {selectedDelivery
                  ? 'Show QR code to recipient'
                  : 'Select a delivery to see details'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!selectedDelivery ? (
                <div className='text-center py-8 text-gray-500'>
                  Select a delivery from the list
                </div>
              ) : showQR ? (
                <div className='text-center py-4'>
                  <div className='mb-4'>
                    <p className='text-sm text-gray-500 mb-2'>
                      Show this QR code to the recipient to confirm delivery
                    </p>
                    <div className='bg-white p-4 inline-block rounded-md'>
                      <QRCodeSVG
                        value={generateQRValue(selectedDelivery.id)}
                        size={200}
                      />
                    </div>
                  </div>
                  <Button
                    variant='outline'
                    onClick={() => setShowQR(false)}
                    className='mt-2'
                  >
                    Hide QR Code
                  </Button>
                </div>
              ) : (
                <div className='space-y-4'>
                  <div>
                    <h3 className='font-medium'>Package Details</h3>
                    <p className='text-sm mt-1'>{selectedDelivery.title}</p>
                    {selectedDelivery.description && (
                      <p className='text-sm text-gray-500 mt-1'>
                        {selectedDelivery.description}
                      </p>
                    )}
                  </div>

                  <div>
                    <h3 className='font-medium'>Pickup Location</h3>
                    <p className='text-sm mt-1'>
                      {selectedDelivery.pickupLocation}
                    </p>
                  </div>

                  <div>
                    <h3 className='font-medium'>Destination</h3>
                    <p className='text-sm mt-1'>
                      {selectedDelivery.destination}
                    </p>
                  </div>

                  <div>
                    <h3 className='font-medium'>Payment</h3>
                    <p className='text-sm mt-1'>{selectedDelivery.cost} sats</p>
                  </div>

                  <div className='pt-4 flex gap-2'>
                    <Button onClick={() => setShowQR(true)} className='flex-1'>
                      Show QR Code
                    </Button>
                    <Button
                      onClick={() => handleComplete(selectedDelivery.id)}
                      variant='outline'
                      className='flex-1'
                      disabled={completingId === selectedDelivery.id}
                    >
                      {completingId === selectedDelivery.id ? (
                        <>
                          <div className='animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full mr-2'></div>
                          Completing...
                        </>
                      ) : (
                        'Mark Delivered'
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
