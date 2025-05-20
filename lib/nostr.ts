import { getUserKeys } from './nostr-keys';
import { EVENT_KINDS, type PackageData, type ProfileData } from './nostr-types';
import {
  listEvents,
  createSignedEvent,
  publishEvent as publishNostrEvent,
  getEventById,
} from './nostr-service';
import {
  saveLocalPackage,
  getLocalPackages,
  getMyLocalDeliveries,
  pickupLocalPackage,
  completeLocalDelivery,
  getLocalPackageById,
  deleteLocalPackage,
  getAllLocalDeliveries,
} from './local-package-service';
import { getRelays } from './nostr-service';
import type { Event as NostrEvent } from 'nostr-tools';
import { SimplePool } from 'nostr-tools';
// Define storage keys directly (matching the ones in local-package-service.ts)
const PACKAGES_STORAGE_KEY = 'shared_packages_v1';
const MY_DELIVERIES_STORAGE_KEY = 'my_deliveries_v2';

// Re-export types for backward compatibility
export type { PackageData, ProfileData };

// Helper function to get user's public key
export function getUserPubkey(): string {
  // Get from localStorage first
  const storedPubkey = localStorage.getItem('nostr_pubkey');
  if (storedPubkey) {
    return storedPubkey;
  }

  // Fall back to generated keys
  const { publicKey } = getUserKeys();
  return publicKey;
}

// Update the parsePackageFromEvent function to be more robust against non-JSON content
function parsePackageFromEvent(event: any): PackageData | null {
  try {
    // Check if event has content
    if (
      !event.content ||
      typeof event.content !== 'string' ||
      event.content.trim() === ''
    ) {
      console.log('Skipping event with empty content:', event.id);
      return null;
    }

    // Try to parse the content
    let content;
    try {
      // First check if the content starts with a { character to avoid obvious non-JSON
      if (!event.content.trim().startsWith('{')) {
        console.log(`Skipping non-JSON content in event ${event.id}`);
        return null;
      }

      content = JSON.parse(event.content);
    } catch (parseError) {
      console.log(`Invalid JSON in event ${event.id}:`, parseError);
      return null;
    }

    // Validate required fields
    if (
      !content.title ||
      !content.pickupLocation ||
      !content.destination ||
      !content.cost
    ) {
      console.log(`Event ${event.id} is missing required fields:`, content);
      return null;
    }

    return {
      id: event.id,
      title: content.title,
      pickupLocation: content.pickupLocation,
      destination: content.destination,
      cost: content.cost,
      description: content.description || '',
      status: content.status || 'available',
      pubkey: event.pubkey,
      created_at: event.created_at,
      // Parse additional fields if present
      courier_pubkey: content.courier_pubkey,
      pickup_time: content.pickup_time,
      delivery_time: content.delivery_time,
    };
  } catch (error) {
    console.error('Failed to parse package from event:', error);
    return null;
  }
}

// Add this helper function to safely parse JSON with a fallback
function safeParseJSON(jsonString: string, fallback: any = null): any {
  try {
    // First check if the string starts with a { character to avoid obvious non-JSON
    if (!jsonString.trim().startsWith('{')) {
      return fallback;
    }
    return JSON.parse(jsonString);
  } catch (e) {
    console.log('Failed to parse JSON:', e);
    return fallback;
  }
}

// Fix the createPackage function to avoid duplicates
export async function createPackage(
  packageData: {
    title: string;
    pickupLocation: string;
    destination: string;
    cost: string;
    description?: string;
  }
): Promise<string> {
  try {
    const now = Math.floor(Date.now() / 1000);
    // Create the content object with all required fields
    const content: PackageData = {
      ...packageData,
      id: '', // Will be set by Nostr
      status: 'available',
      pubkey: getUserPubkey(),
      created_at: now,
    };

    // Try to create and sign the event with Nostr first
    try {
      // Add more specific tags for better event discovery
      const tags = [
        ['t', 'package'],
        ['t', 'delivery'],
        ['t', 'available'],
        ['status', 'available'],
        ['title', packageData.title],
        ['pickup', packageData.pickupLocation],
        ['destination', packageData.destination],
        ['created_at', content.created_at.toString()],
        ['expires_at', (content.created_at + 30 * 24 * 60 * 60).toString()] // 30 days expiry
      ];

      const event = await createSignedEvent(
        EVENT_KINDS.PACKAGE,
        JSON.stringify(content),
        tags
      );

      // Try to publish the event with increased retries
      const results = await publishNostrEvent(event);
      console.log('Package published to relays:', results);

      // Count successful publishes
      const successCount = results.filter((r) => r === 'ok').length;

      // Save to localStorage with the same ID as Nostr to avoid duplicates
      const localPackage: PackageData = {
        ...content,
        id: event.id,
      };

      // Get existing packages
      const packages = getLocalPackages();

      // Check if this package already exists (avoid duplicates)
      if (!packages.some((pkg) => pkg.id === event.id)) {
        packages.push(localPackage);
        localStorage.setItem('shared_packages_v1', JSON.stringify(packages));
        console.log('Package saved to localStorage with Nostr ID:', event.id);
      }

      return event.id;
    } catch (nostrError) {
      console.error(
        'Nostr error, falling back to localStorage only:',
        nostrError
      );
      // Fall back to localStorage only
      const localId = saveLocalPackage({
        ...packageData,
        created_at: now,
      });
      console.log('Package saved to localStorage with ID:', localId);
      return localId;
    }
  } catch (error) {
    console.error('Failed to create package:', error);
    // Last resort fallback
    return saveLocalPackage({
      ...packageData,
      created_at: Math.floor(Date.now() / 1000),
    });
  }
}

// Delete a package
export async function deletePackage(packageId: string): Promise<void> {
  try {
    console.log(`Deleting package with ID: ${packageId}`);

    // First, delete the package from localStorage
    deleteLocalPackage(packageId);
    console.log('Package deleted from localStorage');

    // Then try to update Nostr
    try {
      // Create a deletion event for the package
      const event = await createSignedEvent(
        5, // Kind 5 is for deletion
        '', // Empty content
        [['e', packageId]] // Reference to the event being deleted
      );

      // Publish the event
      await publishNostrEvent(event);

      console.log('Package deletion event published to Nostr');
    } catch (nostrError) {
      console.error(
        "Failed to delete package in Nostr, but it's deleted in localStorage:",
        nostrError
      );
      // No need to throw here since we already updated localStorage
    }
  } catch (error) {
    console.error('Failed to delete package:', error);
    throw error;
  }
}

// Helper function to check if a package has expired
function checkPackageExpiration(pkg: PackageData): boolean {
  const now = Math.floor(Date.now() / 1000);
  const thirtyDaysInSeconds = 30 * 24 * 60 * 60;
  return now > (pkg.created_at + thirtyDaysInSeconds);
}

// Helper function to validate package status
function validatePackageStatus(status: string): 'available' | 'in_transit' | 'delivered' | 'expired' {
  if (['available', 'in_transit', 'delivered', 'expired'].includes(status)) {
    return status as 'available' | 'in_transit' | 'delivered' | 'expired';
  }
  return 'available'; // Default to available if invalid status
}

// Update the getPackages function to include packages created by the current user
// regardless of their status (available, in_transit, delivered)
export async function getPackages(): Promise<PackageData[]> {
  try {
    console.log('Fetching packages from Nostr...');
    const currentPubkey = getUserPubkey();

    // Get local packages first
    const localPackages = getLocalPackages();
    console.log(`Found ${localPackages.length} local packages`);

    // Get all deliveries to track package status
    const allDeliveries = getAllLocalDeliveries();
    console.log(`Found ${allDeliveries.length} deliveries in localStorage`);

    // Create a map of package IDs to their delivery status
    const packageStatusMap = new Map<string, PackageData>();

    // Add all deliveries to the map
    allDeliveries.forEach((delivery) => {
      packageStatusMap.set(delivery.id, delivery);
    });

    try {
      // Use a simpler filter format for better compatibility
      const events = await listEvents(
        [
          {
            kinds: [EVENT_KINDS.PACKAGE],
            limit: 100,
          },
        ],
        10000
      );

      console.log(`Found ${events.length} package events from Nostr`);

      // Parse packages from events and filter out null values
      const nostrPackages = events
        .map(parsePackageFromEvent)
        .filter((pkg): pkg is PackageData => pkg !== null);

      console.log(
        `Successfully parsed ${nostrPackages.length} out of ${events.length} events`
      );

      // Combine local and Nostr packages, removing duplicates by ID
      const allPackages = [...localPackages];

      // Add Nostr packages that aren't already in local packages
      for (const nostrPkg of nostrPackages) {
        if (!allPackages.some((pkg) => pkg.id === nostrPkg.id)) {
          allPackages.push(nostrPkg);
        }
      }

      // Now fetch delivery events to update package status
      const deliveryEvents = await listEvents(
        [
          {
            kinds: [EVENT_KINDS.DELIVERY],
            limit: 100,
          },
        ],
        10000
      );

      console.log(`Found ${deliveryEvents.length} delivery events from Nostr`);

      // Helper function to ensure package data is complete
      function ensureCompletePackageData(pkg: Partial<PackageData>, defaultStatus: 'available' | 'in_transit' | 'delivered' = 'available'): PackageData {
        // Validate required fields
        if (!pkg.id || !pkg.title || !pkg.pickupLocation || !pkg.destination || !pkg.cost || !pkg.pubkey) {
          throw new Error('Incomplete package data');
        }

        // Create a new package data object with validated fields
        const validatedPackage: PackageData = {
          id: pkg.id,
          title: pkg.title,
          pickupLocation: pkg.pickupLocation,
          destination: pkg.destination,
          cost: pkg.cost,
          description: pkg.description || '',
          status: validatePackageStatus(pkg.status || defaultStatus),
          pubkey: pkg.pubkey,
          created_at: pkg.created_at || Math.floor(Date.now() / 1000),
        };

        // Add optional fields if they exist
        if (pkg.courier_pubkey) validatedPackage.courier_pubkey = pkg.courier_pubkey;
        if (pkg.pickup_time) validatedPackage.pickup_time = pkg.pickup_time;
        if (pkg.delivery_time) validatedPackage.delivery_time = pkg.delivery_time;

        return validatedPackage;
      }

      // Process delivery events to update package status
      for (const event of deliveryEvents) {
        try {
          const content = safeParseJSON(event.content);
          if (!content || !content.package_id) continue;

          // Find the package in our list
          const packageIndex = allPackages.findIndex(
            (pkg) => pkg.id === content.package_id
          );
          if (packageIndex >= 0) {
            // Update the package with delivery info
            const base = allPackages[packageIndex];
            const updatedPackage: Partial<PackageData> = {
              ...base,
              id: base.id, // ensure string
              status: validatePackageStatus(content.status),
              courier_pubkey: content.courier_pubkey,
              pickup_time: content.pickup_time,
              delivery_time: content.delivery_time,
            };
            allPackages[packageIndex] = ensureCompletePackageData(updatedPackage);
          }

          // Also update the status map
          if (packageStatusMap.has(content.package_id)) {
            const existingDelivery = packageStatusMap.get(content.package_id)!;
            const updatedDelivery: Partial<PackageData> = {
              ...existingDelivery,
              id: existingDelivery.id, // ensure string
              status: validatePackageStatus(content.status),
              courier_pubkey: content.courier_pubkey,
              pickup_time: content.pickup_time,
              delivery_time: content.delivery_time,
            };
            packageStatusMap.set(content.package_id, ensureCompletePackageData(updatedDelivery));
          } else {
            // If we don't have this delivery in our map yet, try to find the package
            const pkg = allPackages.find((p) => p.id === content.package_id);
            if (pkg) {
              const newDelivery: Partial<PackageData> = {
                ...pkg,
                id: pkg.id, // ensure string
                status: validatePackageStatus(content.status),
                courier_pubkey: content.courier_pubkey,
                pickup_time: content.pickup_time,
                delivery_time: content.delivery_time,
              };
              packageStatusMap.set(content.package_id, ensureCompletePackageData(newDelivery, 'in_transit'));
            }
          }
        } catch (e) {
          console.error('Error processing delivery event:', e);
        }
      }

      // Update package status based on the status map
      for (let i = 0; i < allPackages.length; i++) {
        const pkg = allPackages[i];
        if (packageStatusMap.has(pkg.id)) {
          const delivery = packageStatusMap.get(pkg.id)!;
          const updatedPackage: Partial<PackageData> = {
            ...pkg,
            id: pkg.id, // ensure string
            status: validatePackageStatus(delivery.status),
            courier_pubkey: delivery.courier_pubkey,
            pickup_time: delivery.pickup_time,
            delivery_time: delivery.delivery_time,
          };
          allPackages[i] = ensureCompletePackageData(updatedPackage);
        }
      }

      // Filter packages:
      // 1. Include all packages with status "available"
      // 2. Include packages created by the current user regardless of status
      // 3. Include packages where the current user is the courier
      const filteredPackages = allPackages.filter(
        (pkg) => {
          // Always show available packages
          if (pkg.status === 'available') return true;
          
          // Show user's own packages regardless of status
          if (pkg.pubkey === currentPubkey) return true;
          
          // Show packages where user is the courier
          if (pkg.courier_pubkey === currentPubkey) return true;
          
          return false;
        }
      );

      console.log(
        `Returning ${filteredPackages.length} packages (available + user's own + user's deliveries)`
      );
      return filteredPackages;
    } catch (nostrError) {
      console.error(
        'Error fetching from Nostr, returning only local packages:',
        nostrError
      );

      // Apply the same filtering logic to local packages
      const filteredLocalPackages = localPackages.filter(
        (pkg) =>
          pkg.status === 'available' ||
          pkg.pubkey === currentPubkey ||
          pkg.courier_pubkey === currentPubkey
      );

      // Update status based on deliveries
      for (let i = 0; i < filteredLocalPackages.length; i++) {
        const pkg = filteredLocalPackages[i];
        if (packageStatusMap.has(pkg.id)) {
          const delivery = packageStatusMap.get(pkg.id)!;
          filteredLocalPackages[i] = {
            ...pkg,
            status: delivery.status,
            courier_pubkey: delivery.courier_pubkey,
            pickup_time: delivery.pickup_time,
            delivery_time: delivery.delivery_time,
          };
        }
      }

      return filteredLocalPackages;
    }
  } catch (error) {
    console.error('Failed to fetch packages:', error);
    // Last resort fallback - just return available packages from localStorage
    return getLocalPackages().filter(
      (pkg) =>
        pkg.status === 'available' ||
        pkg.pubkey === getUserPubkey() ||
        pkg.courier_pubkey === getUserPubkey()
    );
  }
}

// Update the getMyDeliveries function to ensure it only returns in_transit packages
// and handle Nostr extension errors gracefully
export async function getMyDeliveries(): Promise<PackageData[]> {
  let localDeliveries = getMyLocalDeliveries().filter(
    (pkg) => pkg.status === 'in_transit'
  );
  try {
    console.log('Fetching my deliveries from Nostr and localStorage...');

    // Get local deliveries first - ONLY in_transit ones
    localDeliveries = getMyLocalDeliveries().filter(
      (pkg) => pkg.status === 'in_transit'
    );
    console.log(`Found ${localDeliveries.length} local in_transit deliveries`);

    // If we have local deliveries, return them immediately to avoid getting stuck
    if (localDeliveries.length > 0) {
      console.log('Returning local deliveries immediately');

      // Try to fetch from Nostr in the background
      setTimeout(async () => {
        try {
          await fetchNostrDeliveries();
        } catch (error) {
          console.error('Background Nostr fetch failed:', error);
        }
      }, 100);

      return localDeliveries;
    }

    // If no local deliveries, try Nostr with a timeout
    const timeoutPromise = new Promise<PackageData[]>((resolve) => {
      setTimeout(() => {
        console.log('Nostr fetch timed out, returning local deliveries only');
        resolve(localDeliveries);
      }, 3000); // 3 second timeout
    });

    // Race between Nostr fetch and timeout
    return Promise.race([fetchNostrDeliveries(), timeoutPromise]);
  } catch (error) {
    console.error('Failed to fetch deliveries:', error);
    // Fallback to localStorage if Nostr fails, but only return in_transit deliveries
    return getMyLocalDeliveries().filter((pkg) => pkg.status === 'in_transit');
  }

  // Helper function to fetch from Nostr
  async function fetchNostrDeliveries(): Promise<PackageData[]> {
    try {
      // Get delivery events for the current user
      const events = await listEvents(
        [
          {
            kinds: [EVENT_KINDS.DELIVERY],
            authors: [getUserPubkey()],
            limit: 100,
          },
        ],
        5000 // Shorter timeout
      );

      console.log(`Found ${events.length} delivery events from Nostr`);

      // Filter and parse deliveries
      const currentPubkey = getUserPubkey();
      const myDeliveries = [];

      for (const event of events) {
        try {
          const content = safeParseJSON(event.content);
          if (!content) continue;

          // Only include deliveries for the current user that are in_transit
          if (
            content.courier_pubkey === currentPubkey &&
            content.status === 'in_transit'
          ) {
            // Get the original package event
            const packageEvent = await getEventById(content.package_id);

            if (packageEvent) {
              // Combine package and delivery data
              const packageData = parsePackageFromEvent(packageEvent);
              if (packageData) {
                myDeliveries.push({
                  ...packageData,
                  status: 'in_transit', // Force status to in_transit
                  courier_pubkey: content.courier_pubkey,
                  pickup_time: content.pickup_time,
                  delivery_time: content.delivery_time,
                });
              }
            }
          }
        } catch (e) {
          console.error('Error parsing delivery event:', e);
        }
      }

      console.log(
        `Found ${myDeliveries.length} in_transit deliveries from Nostr`
      );

      // Combine local and Nostr deliveries, removing duplicates
      const allDeliveries = [...localDeliveries];

      // Add Nostr deliveries that aren't already in local deliveries
      for (const nostrDelivery of myDeliveries) {
        if (!allDeliveries.some((pkg) => pkg.id === nostrDelivery.id)) {
          allDeliveries.push({
            id: nostrDelivery.id,
            title: nostrDelivery.title,
            pickupLocation: nostrDelivery.pickupLocation,
            destination: nostrDelivery.destination,
            cost: nostrDelivery.cost,
            description: nostrDelivery.description || '',
            status: validatePackageStatus(nostrDelivery.status),
            pubkey: nostrDelivery.pubkey,
            created_at: nostrDelivery.created_at,
            courier_pubkey: nostrDelivery.courier_pubkey,
            pickup_time: nostrDelivery.pickup_time,
            delivery_time: nostrDelivery.delivery_time,
          });
        }
      }

      console.log(
        `Returning ${allDeliveries.length} total in_transit deliveries`
      );
      return allDeliveries;
    } catch (error) {
      console.error('Error fetching from Nostr:', error);
      return localDeliveries;
    }
  }
}

// Get a specific package by ID
export async function getPackageById(id: string): Promise<PackageData | null> {
  try {
    console.log(`Fetching package with ID: ${id} from Nostr`);

    // Get the package event
    const event = await getEventById(id);

    if (event) {
      console.log('Package found in Nostr');
      return parsePackageFromEvent(event);
    }

    // If not found as a package, check deliveries
    const deliveryEvents = await listEvents(
      [
        {
          kinds: [EVENT_KINDS.DELIVERY],
          '#package_id': [id],
          limit: 10,
        },
      ],
      5000
    );

    if (deliveryEvents.length > 0) {
      const deliveryEvent = deliveryEvents[0];
      const content = JSON.parse(deliveryEvent.content);

      // Get the original package event
      const packageEvent = await getEventById(content.package_id);

      if (packageEvent) {
        const packageData = parsePackageFromEvent(packageEvent);
        if (!packageData) return null;
        return {
          id: packageData.id,
          title: packageData.title,
          pickupLocation: packageData.pickupLocation,
          destination: packageData.destination,
          cost: packageData.cost,
          description: packageData.description || '',
          status: validatePackageStatus(content.status || 'in_transit'),
          pubkey: packageData.pubkey,
          created_at: packageData.created_at,
          courier_pubkey: content.courier_pubkey,
          pickup_time: content.pickup_time,
          delivery_time: content.delivery_time,
        };
      }
    }

    console.log('Package not found in Nostr, checking localStorage');
    return getLocalPackageById(id);
  } catch (error) {
    console.error('Failed to fetch package:', error);
    // Fallback to localStorage if Nostr fails
    return getLocalPackageById(id);
  }
}

// Update the pickupPackage function to pass the package data to pickupLocalPackage
export async function pickupPackage(packageId: string): Promise<void> {
  try {
    console.log(`Picking up package with ID: ${packageId}`);

    // First, get the package data
    const packageData = await getPackageById(packageId);

    if (!packageData) {
      throw new Error('Package not found in Nostr or local storage');
    }

    console.log('Found package data:', packageData);

    // Pick up the package locally with the package data
    pickupLocalPackage(packageId, packageData);
    console.log('Package picked up in localStorage');

    // Then try to update Nostr
    try {
      // Create delivery content
      const content = {
        package_id: packageId,
        status: 'in_transit',
        courier_pubkey: getUserPubkey(),
        pickup_time: Math.floor(Date.now() / 1000),
      };

      // Create and sign the delivery event
      const event = await createSignedEvent(
        EVENT_KINDS.DELIVERY,
        JSON.stringify(content),
        [
          ['t', 'delivery'],
          ['package_id', packageId],
        ]
      );

      // Publish the event
      await publishNostrEvent(event);

      console.log('Package picked up successfully in Nostr');
    } catch (nostrError) {
      console.error(
        "Failed to pick up package in Nostr, but it's picked up in localStorage:",
        nostrError
      );
      // No need to throw here since we already updated localStorage
    }
  } catch (error) {
    console.error('Failed to pick up package:', error);
    throw error;
  }
}

// Update the completeDelivery function to ensure proper status updates
export async function completeDelivery(packageId: string): Promise<void> {
  try {
    console.log(`Completing delivery for package with ID: ${packageId}`);

    // First, complete locally
    completeLocalDelivery(packageId);
    console.log('Delivery completed in localStorage');

    // Try multiple relays with retry logic
    const relays = getRelays();
    let successCount = 0;

    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        console.log(`Attempt ${attempt + 1} to update Nostr relays`);

        // Get existing delivery events for this package
        const deliveryEvents = await listEvents(
          [
            {
              kinds: [EVENT_KINDS.DELIVERY],
              '#package_id': [packageId],
              limit: 10,
            },
          ],
          5000
        );

        // Create updated content
        let content;

        if (deliveryEvents.length === 0) {
          console.log('No delivery events found in Nostr, creating a new one');
          content = {
            package_id: packageId,
            status: 'delivered',
            courier_pubkey: getUserPubkey(),
            pickup_time: Math.floor(Date.now() / 1000) - 3600, // Assume picked up an hour ago
            delivery_time: Math.floor(Date.now() / 1000),
            update_id: `${Date.now()}-${Math.random()
              .toString(36)
              .substring(2, 9)}`,
          };
        } else {
          // Get the most recent delivery event
          const deliveryEvent = deliveryEvents[0];

          try {
            content = safeParseJSON(deliveryEvent.content, {
              package_id: packageId,
              status: 'in_transit',
              courier_pubkey: getUserPubkey(),
            });
          } catch (error) {
            console.error('Failed to parse delivery event content:', error);
            content = {
              package_id: packageId,
              status: 'in_transit',
              courier_pubkey: getUserPubkey(),
            };
          }

          // Update the content
          content = {
            ...content,
            status: 'delivered',
            delivery_time: Math.floor(Date.now() / 1000),
            update_id: `${Date.now()}-${Math.random()
              .toString(36)
              .substring(2, 9)}`,
          };
        }

        console.log('Updating delivery event with new content:', content);

        // Create and sign the updated delivery event
        const event = await createSignedEvent(
          EVENT_KINDS.DELIVERY,
          JSON.stringify(content),
          [
            ['t', 'delivery'],
            ['package_id', packageId],
            ['status', 'delivered'], // Add explicit tag for better filtering
          ]
        );

        // Try to publish to all relays
        const results = await publishNostrEvent(event);
        successCount = results.filter((r) => !r.startsWith('failed:')).length;

        if (successCount > 0) {
          console.log(
            `Successfully published to ${successCount}/${relays.length} relays`
          );
          break; // At least some relays got the update
        }

        // Wait before retry
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`Attempt ${attempt + 1} failed:`, error);
      }
    }

    if (successCount === 0) {
      console.warn('Could not update any relays, but local storage is updated');
    }
  } catch (error) {
    console.error('Failed to complete delivery:', error);
    throw error;
  }
}

// Confirm delivery (by recipient)
export async function confirmDelivery(packageId: string): Promise<void> {
  // For now, this is the same as completeDelivery
  await completeDelivery(packageId);
}

// Get user profile
export async function getUserProfile(pubkey?: string): Promise<ProfileData> {
  try {
    const userPubkey = pubkey || getUserPubkey();

    // Get user's delivery events to count completed deliveries
    const deliveryEvents = await listEvents(
      [
        {
          kinds: [EVENT_KINDS.DELIVERY],
          authors: [userPubkey],
          limit: 50,
        },
      ],
      5000
    );

    // Count completed deliveries
    const completedDeliveries = deliveryEvents.filter((event) => {
      try {
        const content = JSON.parse(event.content);
        return content.status === 'delivered';
      } catch (e) {
        return false;
      }
    }).length;

    // Try to get user metadata from kind 0 events
    const metadataEvents = await listEvents(
      [
        {
          kinds: [0],
          authors: [userPubkey],
          limit: 1,
        },
      ],
      3000
    );

    let name = 'bfleet_user';
    let displayName = 'Bfleet User';
    let picture = 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + userPubkey;

    if (metadataEvents.length > 0) {
      try {
        const metadata = JSON.parse(metadataEvents[0].content);
        name = metadata.name || name;
        displayName = metadata.display_name || metadata.displayName || name;
        picture = metadata.picture || picture;
      } catch (e) {
        console.error('Error parsing user metadata:', e);
      }
    }

    return {
      pubkey: userPubkey,
      name,
      displayName,
      picture,
      followers: 0, // Not implemented in MVP
      following: 0, // Not implemented in MVP
      deliveries: completedDeliveries,
      rating: completedDeliveries > 0 ? 4.5 : 0, // Simplified rating for MVP
    };
  } catch (error) {
    console.error('Failed to fetch profile:', error);
    return {
      pubkey: pubkey || getUserPubkey(),
      name: 'bfleet_user',
      displayName: 'Bfleet User',
      picture: 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + (pubkey || getUserPubkey()),
      followers: 0,
      following: 0,
      deliveries: 0,
      rating: 0,
    };
  }
}

// Update profile
export async function updateProfile(profileData: {
  name?: string;
  displayName?: string;
  picture?: string;
  about?: string;
  website?: string;
  nip05?: string;
}): Promise<void> {
  try {
    // Create metadata content according to NIP-01
    const content = {
      name: profileData.name,
      display_name: profileData.displayName,
      picture: profileData.picture,
      about: profileData.about,
      website: profileData.website,
      nip05: profileData.nip05,
    };

    // Create and sign the metadata event (kind 0)
    const event = await createSignedEvent(
      0, // Kind 0 is for metadata
      JSON.stringify(content),
      []
    );

    // Publish the event
    await publishNostrEvent(event);

    console.log('Profile updated successfully');
  } catch (error) {
    console.error('Failed to update profile:', error);
    throw error;
  }
}

// Status verification system
export async function verifyPackageStatuses(): Promise<void> {
  try {
    console.log('Verifying package statuses...');

    // Get all packages from localStorage
    const packages = getLocalPackages();
    console.log(`Found ${packages.length} packages to verify`);

    // Check each package's status
    for (const pkg of packages) {
      const effectiveStatus = getEffectiveStatus(pkg);
      
      // If the effective status is different from the stored status, update it
      if (effectiveStatus !== pkg.status) {
        console.log(`Updating package ${pkg.id} status from ${pkg.status} to ${effectiveStatus}`);
        updateLocalPackageStatus(pkg.id, effectiveStatus, {
          courier_pubkey: pkg.courier_pubkey,
          pickup_time: pkg.pickup_time,
          delivery_time: pkg.delivery_time,
        });
      }
    }

    console.log('Package status verification complete');
  } catch (error) {
    console.error('Error verifying package statuses:', error);
  }
}

// Helper function to update local storage
function updateLocalPackageStatus(
  packageId: string,
  status: string,
  data: any
): void {
  try {
    // Update in available packages
    const packages = JSON.parse(
      localStorage.getItem(PACKAGES_STORAGE_KEY) || '[]'
    );
    let updated = false;

    for (let i = 0; i < packages.length; i++) {
      if (packages[i].id === packageId) {
        console.log(
          `Updating package ${packageId} in shared_packages_v1: ${packages[i].status} -> ${status}`
        );
        packages[i].status = status;
        if (data.courier_pubkey)
          packages[i].courier_pubkey = data.courier_pubkey;
        if (data.pickup_time) packages[i].pickup_time = data.pickup_time;
        if (data.delivery_time) packages[i].delivery_time = data.delivery_time;
        updated = true;
      }
    }

    if (updated) {
      localStorage.setItem(PACKAGES_STORAGE_KEY, JSON.stringify(packages));
    }

    // Update in deliveries
    const deliveries = JSON.parse(
      localStorage.getItem(MY_DELIVERIES_STORAGE_KEY) || '[]'
    );
    updated = false;

    for (let i = 0; i < deliveries.length; i++) {
      if (deliveries[i].id === packageId) {
        console.log(
          `Updating package ${packageId} in my_deliveries_v2: ${deliveries[i].status} -> ${status}`
        );
        deliveries[i].status = status;
        if (data.courier_pubkey)
          deliveries[i].courier_pubkey = data.courier_pubkey;
        if (data.pickup_time) deliveries[i].pickup_time = data.pickup_time;
        if (data.delivery_time)
          deliveries[i].delivery_time = data.delivery_time;
        updated = true;
      }
    }

    if (updated) {
      localStorage.setItem(
        MY_DELIVERIES_STORAGE_KEY,
        JSON.stringify(deliveries)
      );
    }
  } catch (error) {
    console.error('Failed to update local package status:', error);
  }
}

// Helper function to get the most accurate status of a package
export function getEffectiveStatus(
  pkg: PackageData
): 'available' | 'in_transit' | 'delivered' | 'expired' {
  // If it has a delivery_time, it's delivered
  if (pkg.delivery_time && pkg.delivery_time > 0) {
    return 'delivered';
  }

  // If it has a pickup_time but no delivery_time, it's in_transit
  if (pkg.pickup_time && pkg.pickup_time > 0 && (!pkg.delivery_time || pkg.delivery_time === 0)) {
    return 'in_transit';
  }

  // Check expiration
  if (checkPackageExpiration(pkg)) {
    return 'expired';
  }

  // Otherwise use the status field
  return pkg.status;
}

// Force a complete refresh of package status
export async function forceStatusRefresh(): Promise<void> {
  try {
    console.log('Starting forced status refresh...');

    // Get all packages and deliveries from localStorage
    const packagesJson = localStorage.getItem('shared_packages_v1') || '[]';
    const deliveriesJson = localStorage.getItem('my_deliveries_v2') || '[]';

    const packages = JSON.parse(packagesJson);
    const deliveries = JSON.parse(deliveriesJson);

    console.log(
      `Found ${packages.length} packages and ${deliveries.length} deliveries in localStorage`
    );

    // Get all package IDs
    const packageIds = [
      ...packages.map((pkg: any) => pkg.id),
      ...deliveries.map((del: any) => del.id),
    ];

    // Remove duplicates
    const uniqueIds = [...new Set(packageIds)];
    console.log(`Processing ${uniqueIds.length} unique package IDs`);

    // Import required functions
    const { listEvents, EVENT_KINDS } = await import('./nostr-service');

    // Fetch all delivery events for these packages
    const events = await listEvents(
      [
        {
          kinds: [EVENT_KINDS.DELIVERY],
          limit: 200,
        },
      ],
      10000
    );

    console.log(`Found ${events.length} delivery events`);

    // Process each event to find the latest status for each package
    const latestStatusMap = new Map();

    for (const event of events) {
      try {
        const content = safeParseJSON(event.content);
        if (!content || !content.package_id) continue;

        // If we don't have this package ID in our map yet, or this event is newer
        if (
          !latestStatusMap.has(content.package_id) ||
          latestStatusMap.get(content.package_id).created_at < event.created_at
        ) {
          latestStatusMap.set(content.package_id, {
            status: content.status,
            courier_pubkey: content.courier_pubkey,
            pickup_time: content.pickup_time,
            delivery_time: content.delivery_time,
            created_at: event.created_at,
          });
        }
      } catch (e) {
        console.error('Error processing event:', e);
      }
    }

    // Update packages in localStorage
    let packagesUpdated = 0;
    let deliveriesUpdated = 0;

    // Update packages
    for (let i = 0; i < packages.length; i++) {
      const pkg = packages[i];
      if (latestStatusMap.has(pkg.id)) {
        const latestStatus = latestStatusMap.get(pkg.id);

        // Only update if the status is different
        if (pkg.status !== latestStatus.status) {
          console.log(
            `Updating package ${pkg.id}: ${pkg.status} -> ${latestStatus.status}`
          );
          packages[i] = {
            ...pkg,
            status: latestStatus.status,
            courier_pubkey: latestStatus.courier_pubkey || pkg.courier_pubkey,
            pickup_time: latestStatus.pickup_time || pkg.pickup_time,
            delivery_time: latestStatus.delivery_time || pkg.delivery_time,
          };
          packagesUpdated++;
        }
      }
    }

    // Update deliveries
    for (let i = 0; i < deliveries.length; i++) {
      const delivery = deliveries[i];
      if (latestStatusMap.has(delivery.id)) {
        const latestStatus = latestStatusMap.get(delivery.id);

        // Only update if the status is different
        if (delivery.status !== latestStatus.status) {
          console.log(
            `Updating delivery ${delivery.id}: ${delivery.status} -> ${latestStatus.status}`
          );
          deliveries[i] = {
            ...delivery,
            status: latestStatus.status,
            courier_pubkey:
              latestStatus.courier_pubkey || delivery.courier_pubkey,
            pickup_time: latestStatus.pickup_time || delivery.pickup_time,
            delivery_time: latestStatus.delivery_time || delivery.delivery_time,
          };
          deliveriesUpdated++;
        }
      }
    }

    // Save updated data back to localStorage
    if (packagesUpdated > 0) {
      localStorage.setItem('shared_packages_v1', JSON.stringify(packages));
    }

    if (deliveriesUpdated > 0) {
      localStorage.setItem('my_deliveries_v2', JSON.stringify(deliveries));
    }

    console.log(
      `Status refresh complete. Updated ${packagesUpdated} packages and ${deliveriesUpdated} deliveries.`
    );
    return Promise.resolve();
  } catch (error) {
    console.error('Error in forceStatusRefresh:', error);
    return Promise.reject(error);
  }
}

// Publish event to relays
export async function publishEvent(event: Event): Promise<string[]> {
  try {
    const relays = getRelays();
    if (relays.length === 0) {
      throw new Error('No relays available');
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Publish timeout'));
      }, 5000);

      const pool = new SimplePool();
      
      const publishPromises = relays.map(async (relay) => {
        try {
          await pool.publish([relay], event as any);
          return 'ok';
        } catch (error) {
          return 'failed: ' + (error instanceof Error ? error.message : String(error));
        }
      });

      Promise.all(publishPromises)
        .then(publishResults => {
          clearTimeout(timeout);
          resolve(publishResults);
        })
        .catch((error: Error) => {
          clearTimeout(timeout);
          reject(error);
        });
    });
  } catch (error) {
    console.error('Failed to publish event:', error);
    return ['failed: ' + (error instanceof Error ? error.message : String(error))];
  }
}
