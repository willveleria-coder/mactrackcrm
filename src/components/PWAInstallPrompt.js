"use client";
import { useEffect, useState } from 'react';

export default function PWAInstallPrompt() {
  const [installPrompt, setInstallPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('Service Worker registered:', registration);
        })
        .catch((error) => {
          console.log('Service Worker registration failed:', error);
        });
    }

    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setInstallPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!installPrompt) return;

    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;

    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
      setShowPrompt(false);
    }

    setInstallPrompt(null);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
  };

  if (isInstalled) return null;
  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t-4 border-[#0072ab] shadow-2xl p-6 z-50">
      <div className="max-w-md mx-auto">
        <div className="flex items-start gap-4">
          <div className="text-5xl">📱</div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-gray-900 mb-1">
              Install Mac With A Van Driver App
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Add to your home screen for quick access and a better experience!
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleInstallClick}
                className="flex-1 bg-[#0072ab] text-white py-3 px-6 rounded-lg font-bold hover:bg-[#005d8c] transition"
              >
                Install App
              </button>
              <button
                onClick={handleDismiss}
                className="px-6 py-3 text-gray-600 hover:text-gray-800 font-semibold"
              >
                Not Now
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}