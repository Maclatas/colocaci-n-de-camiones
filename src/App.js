import React, { useState, useRef, useEffect, useCallback } from 'react';
import './App.css';

// ... (initialLicensePlates y initialZones no cambian) ...

// Estilos para los elementos arrastrables
const getItemStyle = (itemId, currentDraggedItemId, isCopied) => {
  const style = {
    userSelect: 'none',
    padding: '1rem',
    margin: '0 0 0.5rem 0',
    borderRadius: '0.5rem',
    backgroundColor: '#3b82f6',
    color: 'white',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    cursor: 'grab', // Se mantiene para arrastre de ratón
    transition: 'background-color 0.2s ease-in-out, box-shadow 0.2s ease-in-out, border 0.2s ease-in-out',
    opacity: 1,
  };

  if (itemId === currentDraggedItemId) {
    Object.assign(style, {
      backgroundColor: '#2563eb',
      boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
      opacity: 0.7,
    });
  }

  if (isCopied) {
    Object.assign(style, {
      border: '2px solid #22c55e',
      boxShadow: '0 0 0 3px rgba(34, 197, 94, 0.5)',
    });
  }
  return style;
};

// Estilos para las zonas de destino (listas)
const getListStyle = (isHovered, isPasteTarget) => ({
  background: isHovered ? '#bfdbfe' : '#eff6ff',
  padding: '0.5rem',
  borderRadius: '0.75rem',
  minHeight: '100px',
  flexGrow: 1,
  transition: 'background 0.2s ease-in-out, border 0.2s ease-in-out',
  border: isPasteTarget ? '2px dashed #2563eb' : '2px solid transparent',
});

function App() {
  const [zones, setZones] = useState(() => {
    const savedZones = localStorage.getItem('vehicleTrackerZones');
    return savedZones ? JSON.parse(savedZones) : initialZones;
  });

  const [draggedItemId, setDraggedItemId] = useState(null);
  const [draggedFromZoneId, setDraggedFromZoneId] = useState(null);
  const [hoveredZoneId, setHoveredZoneId] = useState(null);
  const [newPlateInput, setNewPlateInput] = useState('');

  const [copiedPlateId, setCopiedPlateId] = useState(null);
  const [copiedPlateContent, setCopiedPlateContent] = useState(null);

  // NUEVO: Un useRef para el temporizador de pulsación larga en las MATRÍCULAS
  const plateLongPressTimerRef = useRef(null);
  // NUEVO: Un useRef para el temporizador de pulsación larga en las ZONAS (para pegar)
  const zoneLongPressTimerRef = useRef(null);


  useEffect(() => {
    localStorage.setItem('vehicleTrackerZones', JSON.stringify(zones));
  }, [zones]);

  // --- Lógica de Arrastrar y Soltar (Ratón) - NO CAMBIA ---
  const handleDragStart = (e, itemId, sourceZoneId) => {
    setCopiedPlateId(null);
    setCopiedPlateContent(null);
    e.dataTransfer.setData("text/plain", itemId);
    e.dataTransfer.setData("text/sourceZone", sourceZoneId);
    setDraggedItemId(itemId);
    setDraggedFromZoneId(sourceZoneId);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDragEnter = (zoneId) => {
    setHoveredZoneId(zoneId);
  };

  const handleDragLeave = () => {
    setHoveredZoneId(null);
  };

  const handleDrop = (e, destinationZoneId) => {
    e.preventDefault();
    const itemId = e.dataTransfer.getData("text/plain");
    const sourceZoneId = e.dataTransfer.getData("text/sourceZone");

    setDraggedItemId(null);
    setDraggedFromZoneId(null);
    setHoveredZoneId(null);

    if (sourceZoneId === destinationZoneId) {
      return;
    }

    moveItemBetweenZones(itemId, sourceZoneId, destinationZoneId);
  };

  // --- Lógica de Copiar (Pulsación Larga en Matrícula) ---
  const handlePlatePressStart = useCallback((e, itemId, sourceZoneId) => {
    // Si ya estamos arrastrando con el ratón, ignorar eventos de pulsación larga
    if (draggedItemId) return;

    // Prevenir el menú contextual o el scroll para el evento táctil
    if (e.type === 'touchstart') {
      e.preventDefault();
    }

    // Limpiar cualquier temporizador anterior por si acaso
    if (plateLongPressTimerRef.current) {
      clearTimeout(plateLongPressTimerRef.current);
    }

    // Iniciar el temporizador para la pulsación larga
    plateLongPressTimerRef.current = setTimeout(() => {
      const plateToCopy = zones[sourceZoneId].items.find(item => item.id === itemId);
      if (plateToCopy) {
        setCopiedPlateId(plateToCopy.id);
        setCopiedPlateContent(plateToCopy.content);
        alert(`Matrícula "${plateToCopy.content}" copiada. Ahora pulsa largo en una zona para "pegar".`);
      }
    }, 700); // Duración de la pulsación larga en ms

  }, [zones, draggedItemId]);

  // Limpiar el temporizador si la pulsación termina antes de tiempo
  const handlePlatePressEnd = useCallback(() => {
    if (plateLongPressTimerRef.current) {
      clearTimeout(plateLongPressTimerRef.current);
      plateLongPressTimerRef.current = null;
    }
  }, []);

  // --- Lógica de Pegar (Pulsación Larga en Zona de Destino) ---
  const handleZonePressStart = useCallback((e, destinationZoneId) => {
    if (draggedItemId) return; // Si estamos arrastrando con el ratón, ignorar

    // Prevenir el menú contextual o el scroll para el evento táctil
    if (e.type === 'touchstart') {
      e.preventDefault();
    }

    if (zoneLongPressTimerRef.current) {
      clearTimeout(zoneLongPressTimerRef.current);
    }

    zoneLongPressTimerRef.current = setTimeout(() => {
      if (copiedPlateId && copiedPlateContent) {
        handlePastePlate(copiedPlateId, destinationZoneId);
      } else {
        alert("Primero copia una matrícula (mantén pulsada una matrícula por un momento).");
      }
      zoneLongPressTimerRef.current = null; // Reiniciar después de la acción
    }, 700); // Misma duración para la pulsación larga
  }, [copiedPlateId, copiedPlateContent, draggedItemId]); // Dependencias

  const handleZonePressEnd = useCallback(() => {
    if (zoneLongPressTimerRef.current) {
      clearTimeout(zoneLongPressTimerRef.current);
      zoneLongPressTimerRef.current = null;
    }
  }, []);


  const handlePastePlate = (itemId, destinationZoneId) => {
    let sourceZoneId = null;
    for (const zoneKey in zones) {
      if (zones[zoneKey].items.some(item => item.id === itemId)) {
        sourceZoneId = zoneKey;
        break;
      }
    }

    if (sourceZoneId) {
      moveItemBetweenZones(itemId, sourceZoneId, destinationZoneId);
      setCopiedPlateId(null);
      setCopiedPlateContent(null);
      alert(`Matrícula "${copiedPlateContent}" pegada en "${zones[destinationZoneId].name}".`);
    } else {
      alert("Error: La matrícula copiada no se encontró en ninguna zona.");
      setCopiedPlateId(null);
      setCopiedPlateContent(null);
    }
  };

  // --- Lógica Común de Movimiento de Ítems (NO CAMBIA) ---
  const moveItemBetweenZones = (itemId, sourceZoneId, destinationZoneId) => {
    setZones((prevZones) => {
      const newZones = { ...prevZones };
      let itemToMove = null;
      if (newZones[sourceZoneId]) {
        itemToMove = newZones[sourceZoneId].items.find(item => item.id === itemId);
      }
      if (!itemToMove) return prevZones;

      newZones[sourceZoneId].items = newZones[sourceZoneId].items.filter(item => item.id !== itemId);
      
      const itemExistsInDestination = newZones[destinationZoneId].items.some(item => item.id === itemId);
      if (!itemExistsInDestination) {
        newZones[destinationZoneId].items = [...newZones[destinationZoneId].items, itemToMove];
      }
      return newZones;
    });
  };

  // --- Funciones de Gestión de Matrículas y Zonas (Limpia al reiniciar) ---
  const handleReset = () => {
    const newZonesState = { ...initialZones };
    let allCurrentPlates = [];
    Object.keys(zones).forEach(zoneId => {
      allCurrentPlates = [...allCurrentPlates, ...zones[zoneId].items];
    });

    const uniqueMasterListItems = [];
    const seenIds = new Set();
    allCurrentPlates.forEach(item => {
      if (!seenIds.has(item.id)) {
        uniqueMasterListItems.push(item);
        seenIds.add(item.id);
      }
    });
    newZonesState['master-list'].items = uniqueMasterListItems;

    Object.keys(zones).forEach(zoneId => {
      if (zoneId !== 'master-list') {
        newZonesState[zoneId].items = [];
      }
    });

    setZones(newZonesState);
    setCopiedPlateId(null);
    setCopiedPlateContent(null);
  };

  const handleAddPlate = () => { /* ... (no cambia) ... */
    const trimmedPlate = newPlateInput.trim();
    if (trimmedPlate) {
      const newId = `plate-${Date.now()}`;
      const newPlate = { id: newId, content: trimmedPlate.toUpperCase() };

      setZones(prevZones => ({
        ...prevZones,
        'master-list': {
          ...prevZones['master-list'],
          items: [...prevZones['master-list'].items, newPlate],
        },
      }));
      setNewPlateInput('');
    }
  };

  const handleDeletePlate = (plateIdToDelete) => { /* ... (no cambia) ... */
    setZones(prevZones => {
      const updatedZones = { ...prevZones };
      let plateFound = false;
      for (const zoneId in updatedZones) {
        const initialLength = updatedZones[zoneId].items.length;
        updatedZones[zoneId].items = updatedZones[zoneId].items.filter(item => item.id !== plateIdToDelete);
        if (updatedZones[zoneId].items.length < initialLength) {
          plateFound = true;
        }
      }
      if (copiedPlateId === plateIdToDelete) {
        setCopiedPlateId(null);
        setCopiedPlateContent(null);
      }
      return plateFound ? updatedZones : prevZones;
    });
  };

  return (
    // Ya sin los manejadores globales de arrastre táctil
    <div className="min-h-screen bg-gradient-to-br from-blue-100 to-indigo-200 p-4 font-sans text-gray-800">
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet" />

      <h1 className="text-3xl md:text-4xl font-bold text-center text-blue-800 mb-6 drop-shadow-md">
        Gestor de Ubicación de Vehículos
      </h1>

      <div className="flex flex-col sm:flex-row justify-center items-center gap-4 mb-6">
        <input
          type="text"
          value={newPlateInput}
          onChange={(e) => setNewPlateInput(e.target.value)}
          placeholder="Añadir nueva matrícula"
          className="p-3 border border-blue-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400 w-full sm:w-auto"
        />
        <button
          onClick={handleAddPlate}
          className="px-6 py-3 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-full shadow-lg transform transition duration-300 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-opacity-75 w-full sm:w-auto"
        >
          Añadir Matrícula
        </button>

        <button
          onClick={handleReset}
          className="px-6 py-3 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-full shadow-lg transform transition duration-300 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-opacity-75 w-full sm:w-auto"
        >
          Reiniciar Zonas
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Lista de Matrículas Disponibles (Maestra) */}
        <div className="w-full lg:w-1/4 bg-white p-4 rounded-xl shadow-lg border border-blue-200">
          <h2 className="text-xl font-semibold text-blue-700 mb-4 text-center">
            {zones['master-list'].name}
          </h2>
          <div
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, 'master-list')}
            onDragEnter={() => handleDragEnter('master-list')}
            onDragLeave={handleDragLeave}
            // NUEVO: Eventos de pulsación larga para PEGAR en la lista maestra (si se quiere devolver)
            onTouchStart={(e) => handleZonePressStart(e, 'master-list')}
            onTouchEnd={() => handleZonePressEnd()}
            onMouseDown={(e) => handleZonePressStart(e, 'master-list')}
            onMouseUp={() => handleZonePressEnd()}
            onMouseLeave={() => handleZonePressEnd()} // Por si el ratón se sale
            style={getListStyle(hoveredZoneId === 'master-list', copiedPlateId !== null && hoveredZoneId === 'master-list')}
            className="rounded-lg transition-colors duration-200 overflow-y-auto max-h-96"
          >
            {zones['master-list'].items.length === 0 && (
              <p className="text-gray-500 text-center py-4">
                {copiedPlateId ? "Pulsa largo aquí para pegar." : "No hay matrículas disponibles."} {/* MODIFICADO: Mensaje */}
              </p>
            )}
            {zones['master-list'].items.map((item) => (
              <div
                key={item.id}
                draggable="true"
                onDragStart={(e) => handleDragStart(e, item.id, 'master-list')}
                // NUEVO: Eventos de pulsación larga para COPIAR la matrícula
                onTouchStart={(e) => handlePlatePressStart(e, item.id, 'master-list')}
                onTouchEnd={handlePlatePressEnd}
                onMouseDown={(e) => handlePlatePressStart(e, item.id, 'master-list')}
                onMouseUp={handlePlatePressEnd}
                onMouseLeave={handlePlatePressEnd} // Para ratón

                style={getItemStyle(item.id, draggedItemId, copiedPlateId === item.id)}
                className="text-center text-lg font-medium flex justify-between items-center"
              >
                <span>{item.content}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeletePlate(item.id);
                  }}
                  className="ml-2 p-1 text-red-200 hover:text-red-700 rounded-full transition-colors duration-200"
                  aria-label={`Eliminar matrícula ${item.content}`}
                >
                  ✖
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Contenedores de Zonas (NAVE OFICINAS, MECÁNICO, etc.) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full lg:w-3/4">
          {Object.keys(zones).map((zoneId) => {
            if (zoneId === 'master-list') return null;

            const zone = zones[zoneId];
            return (
              <div
                key={zoneId}
                className="bg-white p-4 rounded-xl shadow-lg border border-blue-200 flex flex-col"
              >
                <h2 className="text-xl font-semibold text-blue-700 mb-4 text-center">
                  {zone.name}
                </h2>
                <div
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, zoneId)}
                  onDragEnter={() => handleDragEnter(zoneId)}
                  onDragLeave={handleDragLeave}
                  // NUEVO: Eventos de pulsación larga para PEGAR en la zona
                  onTouchStart={(e) => handleZonePressStart(e, zoneId)}
                  onTouchEnd={() => handleZonePressEnd()}
                  onMouseDown={(e) => handleZonePressStart(e, zoneId)}
                  onMouseUp={() => handleZonePressEnd()}
                  onMouseLeave={() => handleZonePressEnd()} // Por si el ratón se sale

                  style={getListStyle(hoveredZoneId === zoneId, copiedPlateId !== null && hoveredZoneId === zoneId)}
                  className="rounded-lg transition-colors duration-200 flex flex-col items-center overflow-y-auto max-h-96"
                >
                  {zone.items.length === 0 && (
                    <p className="text-gray-500 text-center py-4">
                      {copiedPlateId ? "Pulsa largo aquí para pegar." : "Arrastra o pega matrículas aquí."} {/* MODIFICADO: Mensaje */}
                    </p>
                  )}
                  {zone.items.map((item) => (
                    <div
                      key={item.id}
                      draggable="true"
                      onDragStart={(e) => handleDragStart(e, item.id, zoneId)}
                      // NUEVO: Eventos de pulsación larga para COPIAR la matrícula desde esta zona
                      onTouchStart={(e) => handlePlatePressStart(e, item.id, zoneId)}
                      onTouchEnd={handlePlatePressEnd}
                      onMouseDown={(e) => handlePlatePressStart(e, item.id, zoneId)}
                      onMouseUp={handlePlatePressEnd}
                      onMouseLeave={handlePlatePressEnd}

                      style={getItemStyle(item.id, draggedItemId, copiedPlateId === item.id)}
                      className="text-center text-lg font-medium w-full max-w-xs"
                    >
                      {item.content}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default App;
