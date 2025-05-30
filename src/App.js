import React, { useState, useRef, useEffect, useCallback } from 'react';
import './App.css'; // Asegúrate de que esta línea esté presente para importar el CSS

// Datos iniciales de las matrículas
const initialLicensePlates = [
  { id: 'plate-1', content: '1234 ABC' },
  { id: 'plate-2', content: '5678 DEF' },
  { id: 'plate-3', content: '9012 GHI' },
  { id: 'plate-4', content: '3456 JKL' },
  { id: 'plate-5', content: '7890 MNO' },
  { id: 'plate-6', content: '1122 PQR' },
  { id: 'plate-7', content: '3344 STU' },
  { id: 'plate-8', content: '5566 VWX' },
  { id: 'plate-9', content: '7788 YZA' },
  { id: 'plate-10', content: '9900 BCD' },
];

// Definición de las zonas
const initialZones = {
  'master-list': {
    name: 'MATRÍCULAS DISPONIBLES',
    items: initialLicensePlates, // Inicialmente, todas las matrículas están aquí
    isMaster: true, // Indica que es la lista principal
  },
  'nave-oficinas': {
    name: 'NAVE OFICINAS',
    items: [],
    isMaster: false,
  },
  'nave-mecanico': {
    name: 'NAVE MECÁNICO',
    items: [],
    isMaster: false,
  },
  'nave-nueva': {
    name: 'NAVE NUEVA',
    items: [],
    isMaster: false,
  },
  'exterior': {
    name: 'EXTERIOR',
    items: [],
    isMaster: false,
  },
};

// Estilos para los elementos arrastrables (se mantiene la lógica de arrastre de ratón)
const getItemStyle = (itemId, currentDraggedItemId, isCopied) => { // MODIFICADO: Simplificado para arrastre táctil eliminado, añadido isCopied
  const style = {
    userSelect: 'none',
    padding: '1rem',
    margin: '0 0 0.5rem 0',
    borderRadius: '0.5rem',
    backgroundColor: '#3b82f6',
    color: 'white',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    cursor: 'grab',
    transition: 'background-color 0.2s ease-in-out, box-shadow 0.2s ease-in-out, border 0.2s ease-in-out', // Añadida transición para el borde
    opacity: 1,
  };

  // Estilo para el elemento que se está arrastrando con el ratón
  if (itemId === currentDraggedItemId) {
    Object.assign(style, {
      backgroundColor: '#2563eb', // Azul más oscuro al arrastrar
      boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
      opacity: 0.7, // Semi-transparente
    });
  }

  // NUEVO: Estilo para la matrícula copiada
  if (isCopied) {
    Object.assign(style, {
      border: '2px solid #22c55e', // Borde verde para la matrícula copiada
      boxShadow: '0 0 0 3px rgba(34, 197, 94, 0.5)', // Resplandor verde
    });
  }

  return style;
};

// Estilos para las zonas de destino (listas)
const getListStyle = (isHovered, isPasteTarget) => ({ // MODIFICADO: Añadido isPasteTarget
  background: isHovered ? '#bfdbfe' : '#eff6ff', // Azul claro al arrastrar sobre ella
  padding: '0.5rem',
  borderRadius: '0.75rem',
  minHeight: '100px',
  flexGrow: 1, // Permite que las zonas se expandan
  transition: 'background 0.2s ease-in-out, border 0.2s ease-in-out', // Añadida transición para el borde
  border: isPasteTarget ? '2px dashed #2563eb' : '2px solid transparent', // NUEVO: Borde punteado si es objetivo de pegado
});

function App() {
  // Estado para las zonas y sus matrículas
  const [zones, setZones] = useState(() => {
    // Cargar el estado desde localStorage al inicio
    const savedZones = localStorage.getItem('vehicleTrackerZones');
    // Si hay datos guardados, úsalos; de lo contrario, usa el estado inicial
    return savedZones ? JSON.parse(savedZones) : initialZones;
  });

  // Estado para el ítem que se está arrastrando y la zona de origen (para arrastre con ratón)
  const [draggedItemId, setDraggedItemId] = useState(null);
  const [draggedFromZoneId, setDraggedFromZoneId] = useState(null);
  // Estado para la zona sobre la que se está arrastrando (para efectos visuales del ratón)
  const [hoveredZoneId, setHoveredZoneId] = useState(null);
  // Estado para el valor del input de nueva matrícula
  const [newPlateInput, setNewPlateInput] = useState('');

  // NUEVO: Estados para la lógica de "Copiar-Pegar"
  const [copiedPlateId, setCopiedPlateId] = useState(null);
  const [copiedPlateContent, setCopiedPlateContent] = useState(null);
  const longPressTimeoutRef = useRef(null); // Ref para el temporizador de pulsación larga

  // Guardar el estado en localStorage cada vez que 'zones' cambie
  useEffect(() => {
    localStorage.setItem('vehicleTrackerZones', JSON.stringify(zones));
  }, [zones]);

  // --- Lógica de Arrastrar y Soltar (Ratón) ---
  const handleDragStart = (e, itemId, sourceZoneId) => {
    // Limpia cualquier matrícula copiada al iniciar un arrastre
    setCopiedPlateId(null);
    setCopiedPlateContent(null);

    e.dataTransfer.setData("text/plain", itemId);
    e.dataTransfer.setData("text/sourceZone", sourceZoneId);
    setDraggedItemId(itemId);
    setDraggedFromZoneId(sourceZoneId);
  };

  const handleDragOver = (e) => {
    e.preventDefault(); // Necesario para permitir el "drop"
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

  // --- NUEVO: Lógica de Copiar/Pegar (Pulsación Larga) ---

  // Inicia el temporizador de pulsación larga
  const handlePressStart = useCallback((e, itemId, sourceZoneId = null) => {
    // Solo inicia el temporizador si no estamos arrastrando con el ratón
    if (!draggedItemId) {
      // Previene el scroll o el zoom en el inicio del toque/pulsación
      e.preventDefault();
      
      longPressTimeoutRef.current = setTimeout(() => {
        // Si el itemId es null, significa que se pulsó en una zona de destino para "pegar"
        if (itemId === null) {
          // No hace nada aquí, la acción de pegar se maneja en handlePressEnd de la zona
        } else {
          // Si hay itemId, significa que se pulsó una matrícula para "copiar"
          const plateToCopy = zones[sourceZoneId || 'master-list'].items.find(item => item.id === itemId);
          if (plateToCopy) {
            setCopiedPlateId(plateToCopy.id);
            setCopiedPlateContent(plateToCopy.content);
            // Puedes usar una alerta o un mensaje temporal en pantalla
            alert(`Matrícula "${plateToCopy.content}" copiada. Ahora pulsa largo en una zona para "pegar".`);
          }
        }
      }, 700); // 700ms para considerar una pulsación larga
    }
  }, [zones, draggedItemId]); // Dependencias del useCallback

  // Limpia el temporizador y ejecuta la acción si fue una pulsación larga para pegar
  const handlePressEnd = useCallback((destinationZoneId = null) => {
    if (longPressTimeoutRef.current) {
      clearTimeout(longPressTimeoutRef.current);
      longPressTimeoutRef.current = null; // Reinicia la referencia

      // Si se soltó en una zona de destino Y hay una matrícula copiada, entonces "pegar"
      if (destinationZoneId && copiedPlateId) {
        handlePastePlate(copiedPlateId, destinationZoneId);
      }
    }
  }, [copiedPlateId]); // Dependencias del useCallback

  // Función para pegar la matrícula copiada en una zona de destino
  const handlePastePlate = (itemId, destinationZoneId) => {
    if (copiedPlateId && copiedPlateContent) {
      // Necesitamos encontrar la zona de origen de la matrícula copiada.
      // Recorre todas las zonas para encontrar dónde está actualmente la matrícula copiada.
      let sourceZoneId = null;
      for (const zoneKey in zones) {
        if (zones[zoneKey].items.some(item => item.id === copiedPlateId)) {
          sourceZoneId = zoneKey;
          break;
        }
      }

      if (sourceZoneId) {
        moveItemBetweenZones(itemId, sourceZoneId, destinationZoneId);
        // Limpia el estado de la matrícula copiada después de pegarla
        setCopiedPlateId(null);
        setCopiedPlateContent(null);
        alert(`Matrícula "${copiedPlateContent}" pegada en "${zones[destinationZoneId].name}".`);
      } else {
        alert("Error: La matrícula copiada no se encontró en ninguna zona.");
        setCopiedPlateId(null); // Limpiar por si acaso
        setCopiedPlateContent(null);
      }
    } else {
      alert("Primero copia una matrícula (mantén pulsada una matrícula por un momento).");
    }
  };


  // --- Lógica Común de Movimiento de Ítems ---
  const moveItemBetweenZones = (itemId, sourceZoneId, destinationZoneId) => {
    setZones((prevZones) => {
      const newZones = { ...prevZones };

      let itemToMove = null;
      if (newZones[sourceZoneId]) {
        itemToMove = newZones[sourceZoneId].items.find(item => item.id === itemId);
      }

      if (!itemToMove) return prevZones;

      // Elimina el ítem de la lista de origen
      if (newZones[sourceZoneId]) {
        newZones[sourceZoneId].items = newZones[sourceZoneId].items.filter(item => item.id !== itemId);
      }

      // Asegúrate de que no se duplique el ítem si ya existe en la zona de destino
      if (newZones[destinationZoneId]) {
        const itemExistsInDestination = newZones[destinationZoneId].items.some(item => item.id === itemId);
        if (!itemExistsInDestination) {
          newZones[destinationZoneId].items = [...newZones[destinationZoneId].items, itemToMove];
        } else {
          // Si ya existe, puedes decidir si no hacer nada o actualizarlo, etc.
          // Por ahora, simplemente no lo añadimos de nuevo.
        }
      }

      return newZones;
    });
  };


  // --- Funciones de Gestión de Matrículas y Zonas ---
  const handleReset = () => {
    const newZonesState = { ...initialZones };
    // Recopilar todas las matrículas actuales de todas las zonas
    let allCurrentPlates = [];
    Object.keys(zones).forEach(zoneId => {
      allCurrentPlates = [...allCurrentPlates, ...zones[zoneId].items];
    });

    // Asegurarse de que no haya duplicados y volver a la lista maestra
    const uniqueMasterListItems = [];
    const seenIds = new Set();
    allCurrentPlates.forEach(item => {
      if (!seenIds.has(item.id)) {
        uniqueMasterListItems.push(item);
        seenIds.add(item.id);
      }
    });
    newZonesState['master-list'].items = uniqueMasterListItems;

    // Vaciar todas las demás zonas
    Object.keys(zones).forEach(zoneId => {
      if (zoneId !== 'master-list') {
        newZonesState[zoneId].items = [];
      }
    });

    setZones(newZonesState);
    setCopiedPlateId(null); // Limpiar matrícula copiada al reiniciar
    setCopiedPlateContent(null);
  };

  const handleAddPlate = () => {
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

  const handleDeletePlate = (plateIdToDelete) => {
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
    // MODIFICADO: Eliminados los eventos globales de ratón/táctil que impedían el scroll
    <div className="min-h-screen bg-gradient-to-br from-blue-100 to-indigo-200 p-4 font-sans text-gray-800">
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet" />

      <h1 className="text-3xl md:text-4xl font-bold text-center text-blue-800 mb-6 drop-shadow-md">
        Gestor de Ubicación de Vehículos
      </h1>

      <div className="flex flex-col sm:flex-row justify-center items-center gap-4 mb-6">
        {/* Input para añadir nueva matrícula */}
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
            // ref={zoneRefs['master-list']} // MODIFICADO: No necesitamos ref aquí si no hay arrastre táctil global
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, 'master-list')}
            onDragEnter={() => handleDragEnter('master-list')}
            onDragLeave={handleDragLeave}
            style={getListStyle(hoveredZoneId === 'master-list', copiedPlateId !== null && hoveredZoneId === 'master-list')} // MODIFICADO: Añadido isPasteTarget
            className="rounded-lg transition-colors duration-200 overflow-y-auto max-h-96"
          >
            {zones['master-list'].items.length === 0 && (
              <p className="text-gray-500 text-center py-4">No hay matrículas disponibles.</p>
            )}
            {zones['master-list'].items.map((item) => (
              <div
                key={item.id}
                draggable="true" // Habilita el arrastre para este elemento (ratón)
                onDragStart={(e) => handleDragStart(e, item.id, 'master-list')}
                // NUEVO: Eventos para la pulsación larga de "copiar"
                onTouchStart={(e) => handlePressStart(e, item.id, 'master-list')}
                onTouchEnd={() => handlePressEnd(null)} // Pasa null porque no es zona de destino
                onMouseDown={(e) => handlePressStart(e, item.id, 'master-list')}
                onMouseUp={() => handlePressEnd(null)}
                onMouseLeave={() => handlePressEnd(null)}
                style={getItemStyle(item.id, draggedItemId, copiedPlateId === item.id)} // MODIFICADO: Añadido isCopied
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

        {/* Contenedores de Zonas */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full lg:w-3/4">
          {Object.keys(zones).map((zoneId) => {
            if (zoneId === 'master-list') return null; // No renderiza la lista maestra aquí

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
                  // ref={zoneRefs[zoneId]} // MODIFICADO: No necesitamos ref aquí si no hay arrastre táctil global
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, zoneId)}
                  onDragEnter={() => handleDragEnter(zoneId)}
                  onDragLeave={handleDragLeave}
                  // NUEVO: Eventos para la pulsación larga de "pegar" en la zona
                  onTouchStart={(e) => handlePressStart(e, null, zoneId)} // Pasa null como itemId, zoneId como sourceZoneId
                  onTouchEnd={() => handlePressEnd(zoneId)} // Pasa zoneId para "pegar"
                  onMouseDown={(e) => handlePressStart(e, null, zoneId)}
                  onMouseUp={() => handlePressEnd(zoneId)}
                  onMouseLeave={() => handlePressEnd(null)} // Si el ratón se sale, cancela posible pegado
                  style={getListStyle(hoveredZoneId === zoneId, copiedPlateId !== null && hoveredZoneId === zoneId)} // MODIFICADO: Añadido isPasteTarget
                  className="rounded-lg transition-colors duration-200 flex flex-col items-center overflow-y-auto max-h-96"
                >
                  {zone.items.length === 0 && (
                    <p className="text-gray-500 text-center py-4">
                      {copiedPlateId ? "Pulsa largo aquí para pegar." : "Arrastra matrículas aquí."} {/* NUEVO: Mensaje dinámico */}
                    </p>
                  )}
                  {zone.items.map((item) => (
                    <div
                      key={item.id}
                      draggable="true" // Habilita el arrastre para este elemento (ratón)
                      onDragStart={(e) => handleDragStart(e, item.id, zoneId)}
                      // NUEVO: Eventos para la pulsación larga de "copiar"
                      onTouchStart={(e) => handlePressStart(e, item.id, zoneId)}
                      onTouchEnd={() => handlePressEnd(null)}
                      onMouseDown={(e) => handlePressStart(e, item.id, zoneId)}
                      onMouseUp={() => handlePressEnd(null)}
                      onMouseLeave={() => handlePressEnd(null)}
                      style={getItemStyle(item.id, draggedItemId, copiedPlateId === item.id)} // MODIFICADO: Añadido isCopied
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
      {/* MODIFICADO: Eliminado el renderizado del elemento arrastrado con el dedo (ya no es necesario) */}
    </div>
  );
}

export default App;
