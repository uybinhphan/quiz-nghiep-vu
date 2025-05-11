// Service worker registration 
export function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('service-worker.js') // Assuming service-worker.js is in the root
                .then(registration => {
                    console.log('[Service Worker] Registration successful:', registration);
                })
                .catch(error => {
                    console.error('[Service Worker] Registration failed:', error);
                });
        });
    } else {
        console.log('[Service Worker] Not supported by this browser.');
    }
} 