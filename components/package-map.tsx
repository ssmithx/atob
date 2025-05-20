'use client';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useRouter } from 'next/navigation';
import { type PackageData } from '@/lib/nostr-types';
import { getEffectiveStatus } from '@/lib/nostr';

// Fix for default marker icons in Leaflet with Next.js
const DefaultIcon = L.icon({
  iconUrl: '/marker-icon.png',
  shadowUrl: '/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

// Custom marker icon for packages
const PackageIcon = L.divIcon({
  className: 'custom-div-icon',
  html: `<div style="background-color: #3b82f6; width: 30px; height: 30px; border-radius: 50%; display: flex; justify-content: center; align-items: center; box-shadow: 0 0 10px rgba(0,0,0,0.3);">
           <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
             <path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z"/>
             <circle cx="12" cy="10" r="3"/>
           </svg>
         </div>`,
  iconSize: [30, 30],
  iconAnchor: [15, 30],
  popupAnchor: [0, -30],
});

// Custom marker icon for selected package
const SelectedPackageIcon = L.divIcon({
  className: 'custom-div-icon',
  html: `<div style="background-color: #ef4444; width: 36px; height: 36px; border-radius: 50%; display: flex; justify-content: center; align-items: center; box-shadow: 0 0 15px rgba(239,68,68,0.5);">
           <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
             <path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z"/>
             <circle cx="12" cy="10" r="3"/>
           </svg>
         </div>`,
  iconSize: [36, 36],
  iconAnchor: [18, 36],
  popupAnchor: [0, -36],
});

// Helper component to recenter map
function RecenterMap({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], map.getZoom());
  }, [lat, lng, map]);
  return null;
}

// Helper component to center on user's location
function CenterOnMe() {
  const map = useMap();

  const handleClick = () => {
    map.locate({ setView: true, maxZoom: 16 });
  };

  return (
    <button
      onClick={handleClick}
      className='absolute bottom-4 right-4 z-[999] bg-white px-4 py-2 rounded-md shadow-md text-sm font-medium hover:bg-gray-100 transition-colors'
      style={{ zIndex: 999 }}
    >
      Center on Me
    </button>
  );
}

// Convert address to coordinates using OpenStreetMap Nominatim
async function getCoordinates(address: string): Promise<[number, number] | null> {
  try {
    // Check if input is already coordinates
    const coordRegex = /^\s*(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)\s*$/;
    const match = address.match(coordRegex);

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
        return [lat, lng];
      }
    }

    // If not coordinates, try geocoding
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        address
      )}&limit=1`,
      {
        headers: {
          'Accept-Language': 'en-US,en;q=0.9',
          'User-Agent': 'Bfleet/1.0',
        },
      }
    );

    const data = await response.json();
    
    if (data && data.length > 0) {
      return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
    }
    
    console.warn(`Geocoding failed for address: ${address}`);
    return null;
  } catch (error) {
    console.error('Error geocoding address:', error);
    return null;
  }
}

interface PackageMapProps {
  packages: PackageData[];
  onSelectPackage?: (pkg: PackageData) => void;
  selectedPackage?: PackageData | null;
}

export default function PackageMap({
  packages,
  onSelectPackage,
  selectedPackage,
}: PackageMapProps) {
  const router = useRouter();
  const [center, setCenter] = useState<[number, number]>([20, 0]);
  const [packageCoordinates, setPackageCoordinates] = useState<Record<string, [number, number]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [geocodingErrors, setGeocodingErrors] = useState<string[]>([]);

  // Set initial center based on user's location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCenter([position.coords.latitude, position.coords.longitude]);
        },
        () => {
          // If geolocation fails, keep default center
          console.warn('Failed to get user location');
        }
      );
    }
  }, []);

  // Geocode package locations
  useEffect(() => {
    const geocodePackages = async () => {
      setIsLoading(true);
      const newCoordinates: Record<string, [number, number]> = {};
      const errors: string[] = [];

      for (const pkg of packages) {
        if (!packageCoordinates[pkg.id]) {
          const coords = await getCoordinates(pkg.pickupLocation);
          if (coords) {
            newCoordinates[pkg.id] = coords;
          } else {
            errors.push(`Could not geocode address: ${pkg.pickupLocation}`);
          }
        }
      }

      setPackageCoordinates(prev => ({ ...prev, ...newCoordinates }));
      setGeocodingErrors(errors);
      setIsLoading(false);
    };

    geocodePackages();
  }, [packages]);

  // Update center when selected package changes
  useEffect(() => {
    if (selectedPackage && packageCoordinates[selectedPackage.id]) {
      setCenter(packageCoordinates[selectedPackage.id]);
    }
  }, [selectedPackage, packageCoordinates]);

  return (
    <div
      className='relative h-[400px] w-full rounded-md overflow-hidden'
      style={{ zIndex: 10 }}
    >
      <MapContainer
        center={center}
        zoom={2}
        style={{ height: '100%', width: '100%', zIndex: 10 }}
        className='z-10'
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
        />

        {!isLoading && packages
          .filter((pkg) => getEffectiveStatus(pkg) === 'available')
          .map((pkg) => {
            const coords = packageCoordinates[pkg.id];
            if (!coords) return null; // Skip packages without valid coordinates
            
            const isSelected = selectedPackage?.id === pkg.id;
            return (
              <Marker
                key={pkg.id}
                position={coords}
                icon={isSelected ? SelectedPackageIcon : PackageIcon}
                eventHandlers={{
                  click: () => {
                    if (onSelectPackage) {
                      onSelectPackage(pkg);
                    }
                  },
                }}
              >
                <Popup>
                  <div className='p-1'>
                    <h3 className='font-medium'>{pkg.title}</h3>
                    <p className='text-xs text-gray-500'>
                      From: {pkg.pickupLocation}
                    </p>
                    <p className='text-xs text-gray-500'>
                      To: {pkg.destination}
                    </p>
                    <p className='text-xs font-medium mt-1'>{pkg.cost} sats</p>
                  </div>
                </Popup>
              </Marker>
            );
          })}

        <RecenterMap lat={center[0]} lng={center[1]} />
        <CenterOnMe />
      </MapContainer>
      {isLoading && (
        <div className='absolute inset-0 bg-white/50 flex items-center justify-center'>
          <div className='animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full'></div>
        </div>
      )}
      {geocodingErrors.length > 0 && (
        <div className='absolute top-2 left-2 right-2 bg-red-50 border border-red-200 rounded-md p-2 text-xs text-red-700'>
          <p className='font-medium'>Some locations could not be mapped:</p>
          <ul className='list-disc list-inside mt-1'>
            {geocodingErrors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
