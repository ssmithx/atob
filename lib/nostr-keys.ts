import { nip19, getPublicKey } from 'nostr-tools';

// Get or generate user keys
export function getUserKeys(): { privateKey: string; publicKey: string } {
  if (typeof window === 'undefined') {
    // Server-side rendering, return placeholder
    return { privateKey: '', publicKey: '' };
  }

  // For MVP, store in localStorage. For production, use more secure methods
  let privateKey = localStorage.getItem('nostr_private_key');
  if (!privateKey) {
    // Generate a random private key (32 bytes, hex encoded)
    const randomBytes = new Uint8Array(32);
    window.crypto.getRandomValues(randomBytes);
    privateKey = Array.from(randomBytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    localStorage.setItem('nostr_private_key', privateKey);
  }

  const publicKey = getPublicKey(privateKey);
  return { privateKey, publicKey };
}

// Get npub (public key in bech32 format)
export function getNpub(publicKey: string): string {
  return nip19.npubEncode(publicKey);
}

// Get nsec (private key in bech32 format)
export function getNsec(privateKey: string): string {
  return nip19.nsecEncode(privateKey);
}

// Check if we have browser extension (NIP-07) support
export function hasNostrExtension(): boolean {
  return typeof window !== 'undefined' && window.nostr !== undefined;
}

// Try to get public key from extension
export async function getExtensionPublicKey(): Promise<string | null> {
  if (!hasNostrExtension()) return null;

  try {
    return await window.nostr.getPublicKey();
  } catch (error) {
    console.error('Failed to get public key from extension:', error);
    return null;
  }
}

// Sign event with extension
export async function signWithExtension(event: any): Promise<any> {
  if (!hasNostrExtension()) return null;

  try {
    return await window.nostr.signEvent(event);
  } catch (error) {
    console.error('Failed to sign event with extension:', error);
    return null;
  }
}

// Add window.nostr type definition
declare global {
  interface Window {
    nostr?: {
      getPublicKey(): Promise<string>;
      signEvent(event: any): Promise<any>;
    };
  }
}
