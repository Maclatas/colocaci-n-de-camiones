/* eslint-disable no-restricted-globals */

const CACHE_NAME = 'vehicle-tracker-cache-v1'; // Nombre de tu caché
const urlsToCache = [
  '/', // La página principal
  '/index.html',
  // Estas rutas son genéricas para un proyecto React.
  // Si tu proyecto no fue creado con Create React App o tiene una configuración de build diferente,
  // es posible que necesites ajustar los nombres de los archivos JavaScript y CSS compilados.
  // Normalmente, los archivos compilados están en la carpeta 'static/js' y 'static/css'
  // dentro de la carpeta 'build' (o 'dist') después de ejecutar 'npm run build'.
  '/static/js/main.js', // Ruta común para el bundle principal de JS
  '/static/css/main.css', // Ruta común para el bundle principal de CSS
  '/favicon.ico',
  '/logo192.png',
  '/logo512.png',
  // Añade aquí cualquier otro recurso estático que necesites cachear
  // como imágenes, fuentes, etc. (por ejemplo, si añades imágenes personalizadas a 'public')
];

// Evento: 'install' - Se dispara cuando el Service Worker se instala
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache); // Cacha todos los recursos definidos
      })
  );
});

// Evento: 'fetch' - Se dispara cada vez que el navegador hace una solicitud de red
self.addEventListener('fetch', (event) => {
  event.respondWith( // <--- Error corregido aquí: era 'respondDith' y ahora es 'respondWith'
    caches.match(event.request) // Intenta encontrar la solicitud en la caché
      .then((response) => {
        // Si se encuentra en caché, devuelve la versión cacheada
        if (response) {
          return response;
        }
        // Si no está en caché, va a la red
        return fetch(event.request);
      })
  );
});

// Evento: 'activate' - Se dispara cuando el Service Worker se activa
self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            // Elimina cachés antiguas que ya no están en la lista blanca
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
