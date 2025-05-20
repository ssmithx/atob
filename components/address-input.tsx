'use client';

import type React from 'react';

import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { MapPin, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface AddressInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  id?: string;
  required?: boolean;
}

// Interface for Nominatim API response
interface NominatimResult {
  place_id: number;
  licence: string;
  osm_type: string;
  osm_id: number;
  boundingbox: string[];
  lat: string;
  lon: string;
  display_name: string;
  class: string;
  type: string;
  importance: number;
}

export function AddressInput({
  value,
  onChange,
  placeholder,
  label,
  id,
  required = false,
}: AddressInputProps) {
  const [suggestions, setSuggestions] = useState<NominatimResult[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Handle clicks outside the suggestions dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Fetch address suggestions from Nominatim API
  const fetchSuggestions = async (query: string) => {
    if (!query || query.length < 3) {
      setSuggestions([]);
      return;
    }

    // Check if input looks like coordinates
    const coordRegex = /^\s*(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)\s*$/;
    const match = query.match(coordRegex);

    if (match) {
      const lat = Number.parseFloat(match[1]);
      const lng = Number.parseFloat(match[2]);

      // Validate coordinates
      if (
        !isNaN(lat) &&
        !isNaN(lng) &&
        lat >= -90 &&
        lat <= 90 &&
        lng >= -180 &&
        lng <= 180
      ) {
        // If valid coordinates, don't show suggestions
        setSuggestions([]);
        setShowSuggestions(false);
        return;
      }
    }

    setIsLoadingSuggestions(true);

    try {
      // Use OpenStreetMap Nominatim API (free, no API key required)
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          query
        )}&limit=5&addressdetails=1`,
        {
          headers: {
            // Add a custom User-Agent as required by Nominatim's usage policy
            'User-Agent': 'AtoBApp/1.0',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }

      const data: NominatimResult[] = await response.json();
      setSuggestions(data);
      setShowSuggestions(data.length > 0);
    } catch (error) {
      console.error('Error fetching address suggestions:', error);
      toast.error('Could not fetch address suggestions');
      setSuggestions([]);
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  // Debounce the input to avoid too many API calls
  const debouncedFetchSuggestions = (query: string) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      fetchSuggestions(query);
    }, 300); // 300ms debounce
  };

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    debouncedFetchSuggestions(newValue);
  };

  // Handle suggestion selection
  const handleSelectSuggestion = (suggestion: NominatimResult) => {
    onChange(suggestion.display_name);
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  // Get current location and reverse geocode
  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }

    setIsLoadingLocation(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;

          // Use Nominatim for reverse geocoding
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
            {
              headers: {
                'User-Agent': 'AtoB/1.0',
              },
            }
          );

          if (!response.ok) {
            throw new Error(`Error: ${response.status}`);
          }

          const data = await response.json();

          if (data && data.display_name) {
            onChange(data.display_name);
          } else {
            // Fallback if reverse geocoding fails - use coordinates directly
            onChange(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
          }
        } catch (error) {
          console.error('Error getting address from coordinates:', error);
          // Fallback to coordinates if reverse geocoding fails
          onChange(
            `${position.coords.latitude.toFixed(
              6
            )}, ${position.coords.longitude.toFixed(6)}`
          );
        } finally {
          setIsLoadingLocation(false);
        }
      },
      (error) => {
        console.error('Error getting location:', error);
        toast.error(
          'Could not get your location. Please check your browser permissions.'
        );
        setIsLoadingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  return (
    <div className='relative'>
      <div className='flex gap-2'>
        <div className='relative flex-1'>
          <Input
            ref={inputRef}
            id={id}
            value={value}
            onChange={handleInputChange}
            placeholder={placeholder}
            onFocus={() => value && debouncedFetchSuggestions(value)}
            required={required}
            className={isLoadingSuggestions ? 'pr-10' : ''}
          />
          {isLoadingSuggestions && (
            <div className='absolute right-3 top-1/2 transform -translate-y-1/2'>
              <Loader2 className='h-4 w-4 animate-spin text-gray-400' />
            </div>
          )}
        </div>
        <Button
          type='button'
          variant='outline'
          size='icon'
          onClick={getCurrentLocation}
          disabled={isLoadingLocation}
          title='Use my current location'
        >
          {isLoadingLocation ? (
            <Loader2 className='h-4 w-4 animate-spin' />
          ) : (
            <MapPin className='h-4 w-4' />
          )}
        </Button>
      </div>

      {/* Suggestions dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className='absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto'
        >
          <ul className='py-1'>
            {suggestions.map((suggestion) => (
              <li
                key={suggestion.place_id}
                className='px-4 py-2 text-sm hover:bg-gray-100 cursor-pointer'
                onClick={() => handleSelectSuggestion(suggestion)}
              >
                {suggestion.display_name}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
