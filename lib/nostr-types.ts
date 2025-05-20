// Event kinds for our application
export const EVENT_KINDS = {
  METADATA: 0, // Standard Nostr metadata
  TEXT_NOTE: 1, // Standard Nostr text note
  PACKAGE: 30001, // Custom event kind for packages
  DELIVERY: 30002, // Custom event kind for deliveries
};

// Package data interface
export interface PackageData {
  // Required fields
  id: string;
  title: string;
  pickupLocation: string;
  destination: string;
  cost: string;
  pubkey: string;
  created_at: number;
  status: 'available' | 'in_transit' | 'delivered' | 'expired';

  // Optional fields
  description?: string;
  courier_pubkey?: string;
  pickup_time?: number;
  delivery_time?: number;
}

// Profile data interface
export interface ProfileData {
  pubkey: string;
  name: string;
  displayName: string;
  picture: string;
  followers: number;
  following: number;
  deliveries: number;
  rating: number;
}
