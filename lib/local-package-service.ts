import { getUserPubkey } from './nostr';
import type { PackageData } from './nostr-types';

// Local storage keys
const PACKAGES_STORAGE_KEY = 'shared_packages_v1'; // Changed to shared key
const MY_DELIVERIES_STORAGE_KEY = 'my_deliveries_v2';

// Add backup storage keys
const PACKAGES_BACKUP_KEY = 'shared_packages_backup_v1';
const DELIVERIES_BACKUP_KEY = 'my_deliveries_backup_v2';

// Backup current packages before any major operation
function backupPackages(): void {
  try {
    const packages = localStorage.getItem(PACKAGES_STORAGE_KEY);
    const deliveries = localStorage.getItem(MY_DELIVERIES_STORAGE_KEY);
    
    if (packages) {
      localStorage.setItem(PACKAGES_BACKUP_KEY, packages);
    }
    if (deliveries) {
      localStorage.setItem(DELIVERIES_BACKUP_KEY, deliveries);
    }
  } catch (error) {
    console.error('Failed to backup packages:', error);
  }
}

// Restore from backup if main storage is empty
function restoreFromBackupIfNeeded(): void {
  try {
    const packages = localStorage.getItem(PACKAGES_STORAGE_KEY);
    const deliveries = localStorage.getItem(MY_DELIVERIES_STORAGE_KEY);
    
    if (!packages) {
      const backup = localStorage.getItem(PACKAGES_BACKUP_KEY);
      if (backup) {
        localStorage.setItem(PACKAGES_STORAGE_KEY, backup);
        console.log('Restored packages from backup');
      }
    }
    
    if (!deliveries) {
      const backup = localStorage.getItem(DELIVERIES_BACKUP_KEY);
      if (backup) {
        localStorage.setItem(MY_DELIVERIES_STORAGE_KEY, backup);
        console.log('Restored deliveries from backup');
      }
    }
  } catch (error) {
    console.error('Failed to restore from backup:', error);
  }
}

// Get all available packages from local storage
export function getLocalPackages(): PackageData[] {
  try {
    restoreFromBackupIfNeeded();
    const packagesJson = localStorage.getItem(PACKAGES_STORAGE_KEY);
    if (!packagesJson) return [];

    const packages = JSON.parse(packagesJson) as PackageData[];
    backupPackages(); // Backup after successful read

    // Filter out packages that have been picked up by the current user
    const myDeliveries = getMyLocalDeliveries();
    const pickedUpIds = myDeliveries.map((pkg) => pkg.id);

    return packages.filter((pkg) => !pickedUpIds.includes(pkg.id));
  } catch (error) {
    console.error('Failed to get local packages:', error);
    return [];
  }
}

// Get all deliveries from local storage (not just the current user's)
export function getAllLocalDeliveries(): PackageData[] {
  try {
    const deliveriesJson = localStorage.getItem(MY_DELIVERIES_STORAGE_KEY);
    if (!deliveriesJson) return [];

    return JSON.parse(deliveriesJson) as PackageData[];
  } catch (error) {
    console.error('Failed to get all local deliveries:', error);
    return [];
  }
}

// Save a new package to local storage
export function saveLocalPackage(
  packageData: Omit<PackageData, 'id' | 'status' | 'pubkey'>
): string {
  try {
    const packages = getLocalPackages();

    // Generate a unique ID
    const id = `local-${Date.now()}-${Math.random()
      .toString(36)
      .substring(2, 9)}`;

    // Create the new package with the current user's pubkey
    const newPackage: PackageData = {
      ...packageData,
      id,
      status: 'available',
      pubkey: getUserPubkey(),
      created_at: Math.floor(Date.now() / 1000),
    };

    // Add to local storage
    packages.push(newPackage);
    localStorage.setItem(PACKAGES_STORAGE_KEY, JSON.stringify(packages));

    return id;
  } catch (error) {
    console.error('Failed to save local package:', error);
    throw error;
  }
}

// Delete a package from local storage
export function deleteLocalPackage(packageId: string): void {
  try {
    const packages = getLocalPackages();

    // Filter out the package to delete
    const updatedPackages = packages.filter((pkg) => pkg.id !== packageId);

    // Save the updated packages list
    localStorage.setItem(PACKAGES_STORAGE_KEY, JSON.stringify(updatedPackages));

    console.log(`Package deleted from localStorage: ${packageId}`);
  } catch (error) {
    console.error('Failed to delete local package:', error);
    throw error;
  }
}

// Get my deliveries from local storage
export function getMyLocalDeliveries(): PackageData[] {
  try {
    restoreFromBackupIfNeeded();
    const deliveriesJson = localStorage.getItem(MY_DELIVERIES_STORAGE_KEY);
    if (!deliveriesJson) return [];

    const deliveries = JSON.parse(deliveriesJson) as PackageData[];
    backupPackages(); // Backup after successful read

    // Only return deliveries for the current user
    const currentPubkey = getUserPubkey();
    const myDeliveries = deliveries.filter(
      (pkg) => pkg.courier_pubkey === currentPubkey
    );

    console.log(
      `Found ${myDeliveries.length} total deliveries for current user in localStorage`
    );
    console.log(
      `- ${
        myDeliveries.filter((pkg) => pkg.status === 'in_transit').length
      } in_transit`
    );
    console.log(
      `- ${
        myDeliveries.filter((pkg) => pkg.status === 'delivered').length
      } delivered`
    );

    return myDeliveries;
  } catch (error) {
    console.error('Failed to get local deliveries:', error);
    return [];
  }
}

// Update the pickupLocalPackage function to ensure packages are properly removed
export function pickupLocalPackage(
  packageId: string,
  packageData?: PackageData
): void {
  try {
    // Get the package from available packages
    const packages = getLocalPackages();
    let packageToPickup = packages.find((pkg) => pkg.id === packageId);

    // If package not found in local storage but packageData is provided, use that
    if (!packageToPickup && packageData) {
      console.log('Package not found in local storage, using provided data');
      packageToPickup = packageData;
    } else if (!packageToPickup) {
      console.log(`Package with ID ${packageId} not found in local storage`);
      throw new Error('Package not found');
    }

    // IMPORTANT: Always remove from available packages regardless of whether it exists there
    // This ensures consistency even if there are duplicate entries
    const updatedPackages = packages.filter((pkg) => pkg.id !== packageId);
    localStorage.setItem(PACKAGES_STORAGE_KEY, JSON.stringify(updatedPackages));
    console.log(`Removed package ${packageId} from available packages`);

    // Add to my deliveries
    const allDeliveries = JSON.parse(
      localStorage.getItem(MY_DELIVERIES_STORAGE_KEY) || '[]'
    );

    // Check if this package is already in deliveries
    if (allDeliveries.some((pkg: PackageData) => pkg.id === packageId)) {
      console.log(`Package ${packageId} is already in deliveries, skipping`);
      return;
    }

    const updatedPackage = {
      ...packageToPickup,
      status: 'in_transit',
      courier_pubkey: getUserPubkey(), // Add the courier's pubkey
      pickup_time: Math.floor(Date.now() / 1000),
    };

    allDeliveries.push(updatedPackage);
    localStorage.setItem(
      MY_DELIVERIES_STORAGE_KEY,
      JSON.stringify(allDeliveries)
    );

    console.log(`Package ${packageId} picked up successfully`);
  } catch (error) {
    console.error('Failed to pick up local package:', error);
    throw error;
  }
}

// Complete a delivery locally - ensure it's properly removed from active deliveries
export function completeLocalDelivery(packageId: string): void {
  try {
    console.log(`Completing delivery for package ${packageId} in localStorage`);

    // Get all deliveries
    const allDeliveries = JSON.parse(
      localStorage.getItem(MY_DELIVERIES_STORAGE_KEY) || '[]'
    );

    // Check if the package exists in deliveries
    const packageIndex = allDeliveries.findIndex(
      (pkg: PackageData) => pkg.id === packageId
    );

    if (packageIndex === -1) {
      console.log(
        `Package ${packageId} not found in deliveries, nothing to complete`
      );
      return;
    }

    console.log(
      `Found package at index ${packageIndex}, updating status to delivered`
    );

    // Update the status to delivered
    allDeliveries[packageIndex] = {
      ...allDeliveries[packageIndex],
      status: 'delivered',
      delivery_time: Math.floor(Date.now() / 1000),
    };

    // Save back to localStorage
    localStorage.setItem(
      MY_DELIVERIES_STORAGE_KEY,
      JSON.stringify(allDeliveries)
    );
    console.log(`Package ${packageId} marked as delivered in localStorage`);

    // Debug the updated deliveries
    const updatedDeliveries = JSON.parse(
      localStorage.getItem(MY_DELIVERIES_STORAGE_KEY) || '[]'
    );
    const inTransitCount = updatedDeliveries.filter(
      (pkg: PackageData) => pkg.status === 'in_transit'
    ).length;
    const deliveredCount = updatedDeliveries.filter(
      (pkg: PackageData) => pkg.status === 'delivered'
    ).length;
    console.log(
      `After update: ${inTransitCount} in_transit, ${deliveredCount} delivered packages in localStorage`
    );
  } catch (error) {
    console.error('Failed to complete local delivery:', error);
    throw error;
  }
}

// Get a specific package by ID (from either available packages or my deliveries)
export function getLocalPackageById(id: string): PackageData | null {
  try {
    // Check available packages
    const packages = getLocalPackages();
    const availablePackage = packages.find((pkg) => pkg.id === id);
    if (availablePackage) return availablePackage;

    // Check all deliveries
    const allDeliveries = JSON.parse(
      localStorage.getItem(MY_DELIVERIES_STORAGE_KEY) || '[]'
    );
    const delivery = allDeliveries.find((pkg: PackageData) => pkg.id === id);
    if (delivery) return delivery;

    return null;
  } catch (error) {
    console.error('Failed to get local package by ID:', error);
    return null;
  }
}

// Confirm delivery (by recipient)
export function confirmLocalDelivery(packageId: string): void {
  try {
    // Update status in deliveries
    const allDeliveries = JSON.parse(
      localStorage.getItem(MY_DELIVERIES_STORAGE_KEY) || '[]'
    );
    const updatedDeliveries = allDeliveries.map((pkg: PackageData) =>
      pkg.id === packageId
        ? {
            ...pkg,
            status: 'delivered',
            delivery_time: Math.floor(Date.now() / 1000),
          }
        : pkg
    );
    localStorage.setItem(
      MY_DELIVERIES_STORAGE_KEY,
      JSON.stringify(updatedDeliveries)
    );
  } catch (error) {
    console.error('Failed to confirm local delivery:', error);
    throw error;
  }
}

// Add a function to share packages between browsers
export function sharePackagesWithLocalStorage(): void {
  try {
    // Get all packages from localStorage
    const packagesJson = localStorage.getItem(PACKAGES_STORAGE_KEY);
    if (!packagesJson) return;

    // Parse packages
    const packages = JSON.parse(packagesJson) as PackageData[];

    // Store in sessionStorage for sharing
    sessionStorage.setItem('shared_packages_export', JSON.stringify(packages));

    console.log(
      `Exported ${packages.length} packages to sessionStorage for sharing`
    );
  } catch (error) {
    console.error('Failed to share packages:', error);
  }
}

// Import shared packages from another browser
export function importSharedPackages(): number {
  try {
    // Get shared packages from sessionStorage
    const sharedPackagesJson = sessionStorage.getItem('shared_packages_export');
    if (!sharedPackagesJson) return 0;

    // Parse shared packages
    const sharedPackages = JSON.parse(sharedPackagesJson) as PackageData[];

    // Get existing packages
    const existingPackagesJson = localStorage.getItem(PACKAGES_STORAGE_KEY);
    const existingPackages = existingPackagesJson
      ? (JSON.parse(existingPackagesJson) as PackageData[])
      : [];

    // Merge packages, avoiding duplicates
    let newPackagesCount = 0;
    for (const sharedPackage of sharedPackages) {
      if (!existingPackages.some((pkg) => pkg.id === sharedPackage.id)) {
        existingPackages.push(sharedPackage);
        newPackagesCount++;
      }
    }

    // Save merged packages
    localStorage.setItem(
      PACKAGES_STORAGE_KEY,
      JSON.stringify(existingPackages)
    );

    console.log(
      `Imported ${newPackagesCount} new packages from shared storage`
    );
    return newPackagesCount;
  } catch (error) {
    console.error('Failed to import shared packages:', error);
    return 0;
  }
}

// Debug function to log all packages and deliveries
export function debugStorage(): void {
  try {
    const packagesJson = localStorage.getItem(PACKAGES_STORAGE_KEY);
    const packages = packagesJson ? JSON.parse(packagesJson) : [];

    const deliveriesJson = localStorage.getItem(MY_DELIVERIES_STORAGE_KEY);
    const deliveries = deliveriesJson ? JSON.parse(deliveriesJson) : [];

    console.log('=== DEBUG STORAGE ===');
    console.log(`Current user pubkey: ${getUserPubkey()}`);
    console.log(`Available packages (${packages.length}):`, packages);
    console.log(`All deliveries (${deliveries.length}):`, deliveries);
    console.log(
      `My deliveries (${getMyLocalDeliveries().length}):`,
      getMyLocalDeliveries()
    );
    console.log('====================');
  } catch (error) {
    console.error('Error in debug storage:', error);
  }
}
