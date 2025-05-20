'use client';

import { useEffect, useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  ArrowLeft,
  User,
  Star,
  Package,
  CheckCircle,
  Truck,
} from 'lucide-react';
import Link from 'next/link';
import { getUserProfile, type ProfileData, getMyDeliveries } from '@/lib/nostr';
import { useNostr } from '@/components/nostr-provider';
import { getNpub } from '@/lib/nostr-keys';
import { toast } from 'sonner';
import { Progress } from '@/components/ui/progress';

export default function Profile() {
  const { publicKey, isReady } = useNostr();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [npub, setNpub] = useState<string>('');
  const [reputationScore, setReputationScore] = useState(0);
  const [recentDeliveries, setRecentDeliveries] = useState<any[]>([]);

  useEffect(() => {
    if (!isReady) return;

    const fetchProfile = async () => {
      try {
        // Fetch profile from Nostr
        const profileData = await getUserProfile(publicKey);
        setProfile(profileData);

        // Calculate reputation score
        calculateReputationScore(profileData);

        // Format npub for display
        if (publicKey) {
          const fullNpub = getNpub(publicKey);
          setNpub(fullNpub);
        }

        // Fetch recent deliveries
        const deliveries = await getMyDeliveries();
        setRecentDeliveries(deliveries.slice(0, 5)); // Get the 5 most recent deliveries
      } catch (error) {
        toast.error('Error', {
          description: 'Failed to load profile data.',
        });
        console.error('Error fetching profile:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [publicKey, isReady]);

  const calculateReputationScore = (profileData: ProfileData) => {
    // Simple reputation calculation based on deliveries and Nostr metrics
    const deliveryCount = profileData.deliveries || 0;
    const followers = profileData.followers || 0;
    const following = profileData.following || 0;

    // Base score from deliveries (max 4 points)
    let score = Math.min(4, deliveryCount * 0.4);

    // Add follower ratio bonus (max 1 point)
    if (following > 0) {
      const ratio = followers / following;
      score += Math.min(1, ratio * 0.5);
    } else if (followers > 0) {
      score += 1; // Max bonus if they have followers but don't follow anyone
    }

    // Ensure score is between 0-5
    score = Math.max(0, Math.min(5, score));

    setReputationScore(score);
  };

  // Format date for display
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleDateString();
  };

  // Get time ago string
  const getTimeAgo = (timestamp: number) => {
    const seconds = Math.floor(Date.now() / 1000 - timestamp);

    if (seconds < 60) return `${seconds} seconds ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;
    if (seconds < 2592000) return `${Math.floor(seconds / 604800)} weeks ago`;

    return formatDate(timestamp);
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

      <div className='max-w-4xl mx-auto'>
        <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
          {/* Profile Card */}
          <div className='md:col-span-1'>
            <Card className='border border-gray-100 shadow-md'>
              <CardHeader className='bg-gradient-to-r from-[#F8FAFC] to-[#F1F5F9] border-b border-gray-100'>
                <CardTitle className='flex items-center text-gray-900'>
                  <User className='mr-2 h-5 w-5' />
                  Profile
                </CardTitle>
                <CardDescription>Your Nostr identity</CardDescription>
              </CardHeader>
              <CardContent className='space-y-4 pt-6 pb-6'>
                {loading ? (
                  <div className='flex justify-center py-8'>
                    <div className='animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full'></div>
                  </div>
                ) : profile ? (
                  <>
                    <div className='flex justify-center mb-4'>
                      {profile.picture ? (
                        <img
                          src={profile.picture || '/placeholder.svg'}
                          alt={profile.displayName || profile.name || 'User'}
                          className='w-24 h-24 rounded-full object-cover border-2 border-white shadow-md'
                        />
                      ) : (
                        <div className='w-24 h-24 bg-gradient-to-r from-[#FF7170] to-[#FFE57F] rounded-full flex items-center justify-center shadow-md'>
                          <User className='h-12 w-12 text-white' />
                        </div>
                      )}
                    </div>

                    <div className='text-center'>
                      <h2 className='text-xl font-bold text-gray-900'>
                        {profile.displayName ||
                          profile.name ||
                          'Anonymous User'}
                      </h2>
                      <p className='text-sm text-gray-500 break-all mt-1'>
                        {npub.slice(0, 10)}...{npub.slice(-4)}
                      </p>
                    </div>

                    <div className='grid grid-cols-3 gap-4 text-center pt-4'>
                      <div>
                        <p className='text-2xl font-bold text-gray-900'>
                          {profile.followers || 0}
                        </p>
                        <p className='text-sm text-gray-500'>Followers</p>
                      </div>
                      <div>
                        <p className='text-2xl font-bold text-gray-900'>
                          {profile.following || 0}
                        </p>
                        <p className='text-sm text-gray-500'>Following</p>
                      </div>
                      <div>
                        <p className='text-2xl font-bold text-gray-900'>
                          {profile.deliveries || 0}
                        </p>
                        <p className='text-sm text-gray-500'>Deliveries</p>
                      </div>
                    </div>

                    <div className='pt-4'>
                      <div className='flex items-center justify-center'>
                        <div className='bg-gradient-to-r from-[#FF7170] to-[#FFE57F] p-3 rounded-full'>
                          <Star
                            className='h-6 w-6 text-white'
                            fill='currentColor'
                          />
                        </div>
                        <div className='ml-3'>
                          <span className='text-3xl font-bold text-gray-900'>
                            {reputationScore.toFixed(1)}
                          </span>
                          <span className='text-lg text-gray-500 ml-1'>/5</span>
                        </div>
                      </div>
                      <p className='text-center text-sm text-gray-500 mt-1'>
                        Reputation Score
                      </p>
                    </div>
                  </>
                ) : (
                  <div className='text-center py-8 text-gray-500'>
                    Failed to load profile data
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Reputation and Activity Cards */}
          <div className='md:col-span-2 space-y-6'>
            {/* Reputation Card */}
            <Card className='border border-gray-100 shadow-md'>
              <CardHeader className='bg-gradient-to-r from-[#F8FAFC] to-[#F1F5F9] border-b border-gray-100'>
                <CardTitle className='flex items-center text-gray-900'>
                  <Star className='mr-2 h-5 w-5' />
                  Reputation
                </CardTitle>
                <CardDescription>
                  Your reputation is based on your delivery history and Nostr
                  activity
                </CardDescription>
              </CardHeader>
              <CardContent className='space-y-4 pt-6'>
                {loading ? (
                  <div className='flex justify-center py-8'>
                    <div className='animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full'></div>
                  </div>
                ) : (
                  <div className='space-y-4'>
                    <div className='space-y-2'>
                      <div className='flex justify-between items-center'>
                        <div className='flex items-center'>
                          <Package className='h-4 w-4 mr-2 text-[#FF7170]' />
                          <span className='text-sm font-medium'>
                            Delivery History
                          </span>
                        </div>
                        <span className='text-sm font-bold'>
                          {profile?.deliveries || 0} deliveries
                        </span>
                      </div>
                      <Progress
                        value={((profile?.deliveries || 0) / 10) * 100}
                        className='h-2'
                      />
                      <p className='text-xs text-gray-500'>
                        Based on your successful delivery count
                      </p>
                    </div>

                    <div className='space-y-2'>
                      <div className='flex justify-between items-center'>
                        <div className='flex items-center'>
                          <User className='h-4 w-4 mr-2 text-[#8B5CF6]' />
                          <span className='text-sm font-medium'>
                            Nostr Network
                          </span>
                        </div>
                        <span className='text-sm font-bold'>
                          {profile?.followers || 0} followers
                        </span>
                      </div>
                      <Progress
                        value={((profile?.followers || 0) / 20) * 100}
                        className='h-2'
                      />
                      <p className='text-xs text-gray-500'>
                        Based on your Nostr network connections
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Activity Card */}
            <Card className='border border-gray-100 shadow-md'>
              <CardHeader className='bg-gradient-to-r from-[#F8FAFC] to-[#F1F5F9] border-b border-gray-100'>
                <CardTitle className='flex items-center text-gray-900'>
                  <CheckCircle className='mr-2 h-5 w-5' />
                  Recent Deliveries
                </CardTitle>
                <CardDescription>
                  Your most recent package deliveries
                </CardDescription>
              </CardHeader>
              <CardContent className='pt-6'>
                {loading ? (
                  <div className='flex justify-center py-8'>
                    <div className='animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full'></div>
                  </div>
                ) : recentDeliveries.length > 0 ? (
                  <div className='space-y-3'>
                    {recentDeliveries.map((delivery, index) => (
                      <div
                        key={index}
                        className='flex items-center p-3 rounded-md bg-gray-50 hover:bg-gray-100 transition-colors'
                      >
                        {delivery.status === 'delivered' ? (
                          <CheckCircle className='h-4 w-4 mr-3 text-green-500' />
                        ) : (
                          <Truck className='h-4 w-4 mr-3 text-blue-500' />
                        )}
                        <div className='flex-1'>
                          <p className='text-sm font-medium'>
                            {delivery.title}
                          </p>
                          <p className='text-xs text-gray-500'>
                            {delivery.pickupLocation} → {delivery.destination}
                          </p>
                        </div>
                        <span className='text-xs text-gray-500'>
                          {delivery.created_at
                            ? getTimeAgo(delivery.created_at)
                            : 'Recently'}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className='text-center py-8 text-gray-500'>
                    <Package className='h-8 w-8 mx-auto mb-2 text-gray-400' />
                    <p>No recent deliveries</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
