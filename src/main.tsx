import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { ErrorBoundary } from './components/ErrorBoundary';

if ('serviceWorker' in navigator) {
  const registerSW = () => {
    navigator.serviceWorker.register('/sw.js?v=6.4.0').then(registration => {
      console.log('SW registered: ', registration);
      
      // Se já houver um worker esperando ativação, notifica imediatamente
      if (registration.waiting) {
        console.log('SW waiting found, dispatching update event');
        window.dispatchEvent(new CustomEvent('sw-update-available'));
      }
      
      // Escuta novas versões sendo instaladas
      registration.onupdatefound = () => {
        const installingWorker = registration.installing;
        if (installingWorker) {
          installingWorker.onstatechange = () => {
            if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('Nova versão disponível. Notificando usuário...');
              window.dispatchEvent(new CustomEvent('sw-update-available'));
            }
          };
        }
      };

      // Forçar verificação de nova versão em segundo plano de tempos em tempos (a cada 5 minutos)
      setInterval(() => {
        registration.update().catch(err => console.debug('Erro ao checar atualização do SW:', err));
      }, 5 * 60 * 1000);

    }).catch(registrationError => {
      console.log('SW registration failed: ', registrationError);
    });
  };

  if (document.readyState === 'complete') {
    registerSW();
  } else {
    window.addEventListener('load', registerSW);
    // fallback just in case
    setTimeout(registerSW, 1000);
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
