'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';

interface NostrContextType {
  publicKey: string;
  isReady: boolean;
  hasExtension: boolean;
  isLoggedIn: boolean;
  login: (publicKey: string, privateKey?: string) => void;
  logout: () => void;
}

const NostrContext = createContext<NostrContextType>({
  publicKey: '',
  isReady: false,
  hasExtension: false,
  isLoggedIn: false,
  login: () => {},
  logout: () => {},
});

export const useNostr = () => useContext(NostrContext);

export function NostrProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [publicKey, setPublicKey] = useState<string>('');
  const [isReady, setIsReady] = useState<boolean>(false);
  const [hasExt, setHasExt] = useState<boolean>(false);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    // Check for Nostr extension
    const hasExtension =
      typeof window !== 'undefined' && window.nostr !== undefined;
    setHasExt(hasExtension);

    // Check for stored public key
    const storedPubkey = localStorage.getItem('nostr_pubkey');
    if (storedPubkey) {
      setPublicKey(storedPubkey);
      setIsLoggedIn(true);
    }

    setIsReady(true);
  }, []);

  const login = (pubkey: string, privkey?: string) => {
    setPublicKey(pubkey);
    setIsLoggedIn(true);
    localStorage.setItem('nostr_pubkey', pubkey);
    if (privkey) {
      localStorage.setItem('nostr_privkey', privkey);
    }
  };

  const logout = () => {
    setPublicKey('');
    setIsLoggedIn(false);
    localStorage.removeItem('nostr_pubkey');
    localStorage.removeItem('nostr_privkey');
    router.replace('/login');
  };

  // Don't access browser APIs during SSR
  const contextValue = {
    publicKey,
    isReady: mounted && isReady,
    hasExtension: hasExt,
    isLoggedIn: mounted && isLoggedIn,
    login,
    logout,
  };

  return (
    <NostrContext.Provider value={contextValue}>
      {children}
    </NostrContext.Provider>
  );
}
