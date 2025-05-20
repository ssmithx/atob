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
import {
  ArrowLeft,
  Package,
  RefreshCw,
  Settings,
  Truck,
  CheckCircle,
  Clock,
} from 'lucide-react';
import Link from 'next/link';
import {
  getPackages,
  pickupPackage,
  deletePackage,
  getEffectiveStatus,
} from '@/lib/nostr';
import { useNostr } from '@/components/nostr-provider';
import { debugStorage } from '@/lib/local-package-service';
import dynamic from 'next/dynamic';
import { NostrStatus } from '@/components/nostr-status';
import { DebugPanel } from '@/components/debug-panel';
import { Badge } from '@/components/ui/badge';
import { type PackageData } from '@/lib/nostr-types';

// Dynamically import the map component to avoid SSR issues
const PackageMap = dynamic(() => import('@/components/package-map'), {
  ssr: false,
  loading: () => (
    <div className='h-[400px] bg-gray-100 animate-pulse rounded-md'></div>
  ),
});

export default function ViewPackages() {
  const { isReady, publicKey } = useNostr();
  const [packages, setPackages] = useState<PackageData[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<PackageData | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<'all' | 'my-packages'>('all');
  const [pickingUpId, setPickingUpId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchPackages = async () => {
    try {
      // Debug storage to see what's in localStorage
      debugStorage();

      // Fetch packages from local storage and Nostr
      const pkgs = await getPackages();
      console.log('Fetched packages:', pkgs);

      setPackages(pkgs);

      // Select the first package by default if available and none is selected
      if (pkgs.length > 0 && !selectedPackage) {
        setSelectedPackage(pkgs[0]);
      } else if (
        selectedPackage &&
        !pkgs.some((pkg) => pkg.id === selectedPackage.id)
      ) {
        // If the selected package is no longer available, clear the selection
        setSelectedPackage(null);
      }
    } catch (error) {
      toast.error('Error', {
        description: 'Failed to load packages. Please try again.',
      });
      console.error('Error fetching packages:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!isReady) return;

    // Initial fetch
    fetchPackages();

    // Set up regular fetches
    const fetchInterval = setInterval(() => {
      fetchPackages();
    }, 15000); // Refresh every 15 seconds

    // Force a complete status refresh once when the component mounts
    import('@/lib/nostr').then(({ forceStatusRefresh }) => {
      forceStatusRefresh().catch((error) => {
        console.error('Error during initial status refresh:', error);
      });
    });

    return () => {
      clearInterval(fetchInterval);
    };
  }, [isReady]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchPackages();
  };

  // Update the handlePickup function to ensure packages are properly removed
  const handlePickup = async (packageId: string) => {
    try {
      console.log(`Attempting to pick up package: ${packageId}`);
      setPickingUpId(packageId); // Set loading state for this package

      // Get the package data first to ensure it exists
      const packageToPickup = packages.find((pkg) => pkg.id === packageId);

      if (!packageToPickup) {
        toast.error('Error', {
          description:
            'Package not found. It may have been picked up by someone else.',
        });
        return;
      }

      // Pick up package
      await pickupPackage(packageId);

      // IMPORTANT: Always remove the package from the view immediately
      // This ensures the UI is updated even if Nostr events are delayed
      setPackages((prev) => prev.filter((pkg) => pkg.id !== packageId));

      if (selectedPackage?.id === packageId) {
        setSelectedPackage(null);
      }

      toast.success('Package Picked Up', {
        description: 'You have successfully picked up the package.',
      });

      // Refresh the list after a short delay
      setTimeout(() => {
        fetchPackages();
      }, 1000);
    } catch (error) {
      toast.error('Error', {
        description: 'Failed to pick up package. Please try again.',
      });
      console.error('Error picking up package:', error);
    } finally {
      setPickingUpId(null); // Clear loading state
    }
  };

  const isOwnPackage = (pkg: PackageData) => {
    console.log(
      `Checking package ownership: ${pkg.pubkey} vs current user: ${publicKey}`
    );
    return pkg.pubkey === publicKey;
  };

  const handleDeletePackage = async (packageId: string) => {
    try {
      setDeletingId(packageId); // Set loading state for this package

      // Delete package
      await deletePackage(packageId);

      // Update local state
      setPackages((prev) => prev.filter((pkg) => pkg.id !== packageId));

      if (selectedPackage?.id === packageId) {
        setSelectedPackage(null);
      }

      toast.success('Package Deleted', {
        description: 'Your package has been successfully deleted.',
      });
    } catch (error) {
      toast.error('Error', {
        description: 'Failed to delete package. Please try again.',
      });
      console.error('Error deleting package:', error);
    } finally {
      setDeletingId(null); // Clear loading state
    }
  };

  // Filter packages based on view mode
  const filteredPackages =
    viewMode === 'all'
      ? packages.filter((pkg) => getEffectiveStatus(pkg) === 'available')
      : packages.filter((pkg) => pkg.pubkey === publicKey);

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
      <div className='flex justify-between items-center mb-6'>
        <Link href='/' className='flex items-center text-sm hover:underline'>
          <ArrowLeft className='mr-2 h-4 w-4' />
          Back to Home
        </Link>
        <div className='flex items-center gap-4'>
          <Link href='/settings'>
            <Button
              variant='outline'
              size='sm'
              className='flex items-center gap-1 cursor-pointer'
            >
              <Settings className='h-4 w-4' />
              Relay Settings
            </Button>
          </Link>
          <NostrStatus />
        </div>
      </div>
      <DebugPanel />

      <div className='flex justify-between items-center mb-4'>
        <h1 className='text-2xl font-bold'>Packages</h1>
        <div className='flex gap-2'>
          <Button
            variant={viewMode === 'all' ? 'outline' : 'default'}
            size='sm'
            className='cursor-pointer'
            onClick={() => setViewMode('all')}
          >
            Available Packages
          </Button>
          <Button
            variant={viewMode === 'my-packages' ? 'outline' : 'default'}
            size='sm'
            className='cursor-pointer'
            onClick={() => setViewMode('my-packages')}
          >
            My Packages
          </Button>
        </div>
      </div>

      <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
        <div className='lg:col-span-2'>
          <Card className='h-full'>
            <CardHeader>
              <CardTitle>Package Map</CardTitle>
              <CardDescription>
                View available packages on the map
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PackageMap
                packages={filteredPackages}
                onSelectPackage={setSelectedPackage}
                selectedPackage={selectedPackage}
              />
            </CardContent>
          </Card>
        </div>

        <div>
          <Card className='h-full'>
            <CardHeader className='flex flex-row items-center justify-between'>
              <div>
                <CardTitle className='flex items-center'>
                  <Package className='mr-2 h-5 w-5' />
                  <div className='cursor-pointer'>
                    {viewMode === 'all' ? 'Available Packages' : 'My Packages'}
                  </div>
                </CardTitle>
                <CardDescription>
                  {loading
                    ? 'Loading packages...'
                    : `${filteredPackages.length} packages`}
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
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className='h-24 bg-gray-100 animate-pulse rounded-md'
                    ></div>
                  ))}
                </div>
              ) : filteredPackages.length === 0 ? (
                <div className='text-center py-8 text-gray-500'>
                  <p>No packages available at the moment</p>
                  <p className='text-sm mt-2'>
                    {viewMode === 'all'
                      ? 'Try posting a package or refreshing the list'
                      : "You haven't posted any packages yet"}
                  </p>
                </div>
              ) : (
                <div className='space-y-4'>
                  {filteredPackages.map((pkg) => (
                    <Card
                      key={pkg.id}
                      className={`${
                        selectedPackage?.id === pkg.id ? 'border-primary' : ''
                      }`}
                      onClick={() => setSelectedPackage(pkg)}
                    >
                      <CardContent className='p-4'>
                        <div className='flex items-center justify-between mb-2'>
                          <div className='font-medium'>{pkg.title}</div>
                          {getEffectiveStatus(pkg) === 'in_transit' && (
                            <Badge
                              variant='outline'
                              className='bg-blue-50 text-blue-700 border-blue-200'
                            >
                              <Truck className='h-3 w-3 mr-1' />
                              In Transit
                            </Badge>
                          )}
                          {getEffectiveStatus(pkg) === 'delivered' && (
                            <Badge
                              variant='outline'
                              className='bg-green-50 text-green-700 border-green-200'
                            >
                              <CheckCircle className='h-3 w-3 mr-1' />
                              Delivered
                            </Badge>
                          )}
                          {getEffectiveStatus(pkg) === 'expired' && (
                            <Badge
                              variant='outline'
                              className='bg-gray-50 text-gray-700 border-gray-200'
                            >
                              <Clock className='h-3 w-3 mr-1' />
                              Expired
                            </Badge>
                          )}
                        </div>
                        <div className='text-sm text-gray-500 mt-1'>
                          From: {pkg.pickupLocation}
                        </div>
                        <div className='text-sm text-gray-500'>
                          To: {pkg.destination}
                        </div>
                        <div className='flex justify-between items-center mt-2'>
                          <div className='font-medium'>{pkg.cost} sats</div>
                          {isOwnPackage(pkg) ? (
                            pkg.status === 'available' ? (
                              <Button
                                size='sm'
                                variant='destructive'
                                className='bg-red-500 text-white cursor-pointer'
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeletePackage(pkg.id);
                                }}
                                disabled={deletingId === pkg.id}
                              >
                                {deletingId === pkg.id ? (
                                  <>
                                    <div className='animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full mr-2'></div>
                                    Deleting...
                                  </>
                                ) : (
                                  <div>Delete</div>
                                )}
                              </Button>
                            ) : (
                              <div className='text-xs text-gray-500'>
                                {pkg.status === 'in_transit' &&
                                  pkg.pickup_time && (
                                    <span>
                                      Picked up:{' '}
                                      {new Date(
                                        pkg.pickup_time * 1000
                                      ).toLocaleString()}
                                    </span>
                                  )}
                                {pkg.status === 'delivered' &&
                                  pkg.delivery_time && (
                                    <span>
                                      Delivered:{' '}
                                      {new Date(
                                        pkg.delivery_time * 1000
                                      ).toLocaleString()}
                                    </span>
                                  )}
                              </div>
                            )
                          ) : (
                            pkg.status === 'available' && (
                              <Button
                                size='sm'
                                variant='default'
                                className='bg-gradient-to-r from-[#FF7170] to-[#FFE57F] text-white'
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handlePickup(pkg.id);
                                }}
                                disabled={pickingUpId === pkg.id}
                              >
                                {pickingUpId === pkg.id ? (
                                  <>
                                    <div className='animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full mr-2'></div>
                                    Picking Up...
                                  </>
                                ) : (
                                  'Pick Up'
                                )}
                              </Button>
                            )
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
