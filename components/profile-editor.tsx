'use client';

import type React from 'react';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { useNostr } from '@/components/nostr-provider';
import { getUserProfile, updateProfile } from '@/lib/nostr';

interface ProfileEditorProps {
  onClose?: () => void;
}

export function ProfileEditor({ onClose }: ProfileEditorProps) {
  const { publicKey, isReady } = useNostr();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    displayName: '',
    picture: '',
    about: '',
    website: '',
    nip05: '',
  });

  useEffect(() => {
    if (!isReady) return;

    const fetchProfile = async () => {
      try {
        const profile = await getUserProfile(publicKey);

        setFormData({
          name: profile.name || '',
          displayName: profile.displayName || '',
          picture: profile.picture || '',
          about: profile.about || '',
          website: profile.website || '',
          nip05: profile.nip05 || '',
        });
      } catch (error) {
        console.error('Failed to fetch profile:', error);
        toast.error('Failed to load profile', {
          description: 'Could not load your profile data',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [publicKey, isReady]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      await updateProfile(formData);

      toast.success('Profile Updated', {
        description: 'Your profile has been successfully updated',
      });

      if (onClose) onClose();
    } catch (error) {
      console.error('Failed to update profile:', error);
      toast.error('Update Failed', {
        description: 'Could not update your profile. Please try again.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (!isReady) {
    return (
      <Card className='w-full max-w-md mx-auto'>
        <CardContent className='py-8'>
          <div className='flex justify-center'>
            <div className='animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full'></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      {isLoading ? (
        <div className='py-8 flex justify-center'>
          <div className='animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full'></div>
        </div>
      ) : (
        <div className='space-y-4'>
          <div className='space-y-2'>
            <Label htmlFor='name'>Username</Label>
            <Input
              id='name'
              name='name'
              placeholder='username'
              value={formData.name}
              onChange={handleChange}
            />
            <p className='text-xs text-gray-500'>
              Your unique username (no spaces)
            </p>
          </div>

          <div className='space-y-2'>
            <Label htmlFor='displayName'>Display Name</Label>
            <Input
              id='displayName'
              name='displayName'
              placeholder='Your Name'
              value={formData.displayName}
              onChange={handleChange}
            />
          </div>

          <div className='space-y-2'>
            <Label htmlFor='picture'>Profile Picture URL</Label>
            <Input
              id='picture'
              name='picture'
              placeholder='https://example.com/avatar.jpg'
              value={formData.picture}
              onChange={handleChange}
            />
          </div>

          <div className='space-y-2'>
            <Label htmlFor='about'>About</Label>
            <Textarea
              id='about'
              name='about'
              placeholder='A little about yourself'
              value={formData.about}
              onChange={handleChange}
              rows={3}
            />
          </div>

          <div className='space-y-2'>
            <Label htmlFor='website'>Website</Label>
            <Input
              id='website'
              name='website'
              placeholder='https://yourwebsite.com'
              value={formData.website}
              onChange={handleChange}
            />
          </div>

          <div className='space-y-2'>
            <Label htmlFor='nip05'>NIP-05 Identifier</Label>
            <Input
              id='nip05'
              name='nip05'
              placeholder='you@example.com'
              value={formData.nip05}
              onChange={handleChange}
            />
            <p className='text-xs text-gray-500'>
              Your verified Nostr identifier (optional)
            </p>
          </div>

          <div className='pt-4 flex justify-end'>
            <Button type='submit' disabled={isSaving}>
              {isSaving ? (
                <>
                  <span className='animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full mr-2'></span>
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </div>
        </div>
      )}
    </form>
  );
}
