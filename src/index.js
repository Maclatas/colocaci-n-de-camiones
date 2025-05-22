import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css'; // Mantén esta línea si tienes un archivo index.css
import App from './App';
import reportWebVitals from './reportWebVitals';
// Eliminado: import * as serviceWorkerRegistration from './serviceWorkerRegistration';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Eliminado: Si quieres que tu aplicación funcione sin conexión y se "instale" como una PWA:
// Eliminado: serviceWorkerRegistration.register(); // Originalmente podría estar así o comentado

// Eliminado: Para evitar el conflicto con nuestro service-worker.js manual en 'public',
// Eliminado: nos aseguramos de que el Service Worker de Workbox no se registre.
// Eliminado: serviceWorkerRegistration.unregister();

// Si quieres medir el rendimiento de tu aplicación (opcional)
reportWebVitals();

