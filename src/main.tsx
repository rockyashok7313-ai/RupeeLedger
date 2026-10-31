import React from 'react';
import ReactDOM from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import '@fontsource-variable/archivo';
import '@fontsource/ibm-plex-sans/400.css';
import '@fontsource/ibm-plex-sans/500.css';
import '@fontsource/ibm-plex-sans/600.css';
import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/ibm-plex-mono/500.css';
import '@fontsource/ibm-plex-mono/600.css';
import App from './App';
import './globals.css';
import { toast } from '@/hooks/use-toast';
import { ToastAction } from '@/components/ui/toast';
import { applyStoredTheme } from '@/hooks/use-theme';

applyStoredTheme();

// A blocking confirm() on every deploy interrupted people mid-entry. Offer the
// update as a toast instead, so they can finish what they are typing first.
const updateSW = registerSW({
  onNeedRefresh() {
    toast({
      title: 'A new version is ready',
      description: 'Reload when you have saved your current entry.',
      action: (
        <ToastAction altText="Reload now" onClick={() => updateSW(true)}>
          Reload
        </ToastAction>
      ),
    });
  },
});

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
