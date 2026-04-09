'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Types
interface EmbedContextType {
  isEmbedded: boolean;
  setIsEmbedded: (value: boolean) => void;
}

// Création du contexte
const EmbedContext = createContext<EmbedContextType | undefined>(undefined);

// Props du Provider
interface EmbedProviderProps {
  children: ReactNode;
}

// Provider
export function EmbedProvider({ children }: EmbedProviderProps) {
  const [isEmbedded, setIsEmbedded] = useState(false);

  useEffect(() => {
    // Lire le paramètre ?mode=embed dans l'URL
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const mode = params.get('mode');
      
      if (mode === 'embed') {
        setIsEmbedded(true);
        console.log('Mode Embed activé');
      }
    }
  }, []);

  return (
    <EmbedContext.Provider value={{ isEmbedded, setIsEmbedded }}>
      {children}
    </EmbedContext.Provider>
  );
}

// Hook personnalisé pour utiliser le contexte
export function useEmbed() {
  const context = useContext(EmbedContext);
  
  if (context === undefined) {
    throw new Error('useEmbed doit être utilisé dans un EmbedProvider');
  }
  
  return context;
}
