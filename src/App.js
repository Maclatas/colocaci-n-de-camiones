import React, { useState, useEffect, useRef } from 'react';

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

// Estilos para los elementos arrastrables
const getItemStyle = (itemId, currentDraggedItemId, isDraggingTouch, touchPosition) => {
  const style = {
    userSelect: 'none',
    padding: '1rem',
    margin: '0 0 0.5rem 0',
    borderRadius: '0.5rem',
    backgroundColor: itemId === currentDraggedItemId ? '#2563eb' : '#3b82f6', // Azul más oscuro al arrastrar
    color: 'white',
    boxShadow: itemId === currentDraggedItemId ? '0 4px 8px rgba(0,0,0,0.2)' : '0 2px 4px rgba(0,0,0,0.1)',
    opacity: itemId === currentDraggedItemId ? 0.4 : 1, // Hace el elemento arrastrado semi-transparente
    cursor: 'grab',
    transition: 'background-color 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
  };

  if (isDraggingTouch && itemId === currentDraggedItemId && touchPosition) {
    // Estilos para el elemento que se está arrastrando con el dedo
    Object.assign(style, {
      position: 'fixed',
      left: touchPosition.x - 50, // Ajuste para centrar el dedo
      top: touchPosition.y - 20,  // Ajuste para centrar el dedo
      zIndex: 1000,
      pointerEvents: 'none', // Para que los eventos de abajo sigan funcionando
      width: '150px', // Ancho fijo para el elemento arrastrado
      textAlign: 'center',
      opacity: 0.9,
      transform: 'scale(1.05)', // Ligeramente más grande
    });
  }
  return style;
};


// Estilos para las zonas de destino (listas)
const getListStyle = (isHovered) => ({
  background: isHovered ? '#bfdbfe' : '#eff6ff', // Azul claro al arrastrar sobre ella
  padding: '0.5rem',
  borderRadius: '0.75rem',
  minHeight: '100px',
  flexGrow: 1, // Permite que las zonas se expandan
  transition: 'background 0.2s ease-in-out', // Transición suave para el color de fondo
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
  // Estado para la zona sobre la que se está arrastrando (para efectos visuales)
  const [hoveredZoneId, setHoveredZoneId] = useState(null);
  // Estado para el valor del input de nueva matrícula
  const [newPlateInput, setNewPlateInput] = useState('');

  // Estados para el arrastre táctil
  const [isDraggingTouch, setIsDraggingTouch] = useState(false);
  const [touchPosition, setTouchPosition] = useState(null);
  const draggedItemRef = useRef(null); // Referencia al elemento que se está arrastrando con el dedo
  const zoneRefs = { // Referencias a los contenedores de las zonas para detectar colisiones
    'master-list': useRef(null),
    'nave-oficinas': useRef(null),
    'nave-mecanico': useRef(null),
    'nave-nueva': useRef(null),
    'exterior': useRef(null),
  };


  // Guardar el estado en localStorage cada vez que 'zones' cambie
  useEffect(() => {
    localStorage.setItem('vehicleTrackerZones', JSON.stringify(zones));
  }, [zones]);

  // --- Lógica de Arrastrar y Soltar (Ratón) ---
  const handleDragStart = (e, itemId, sourceZoneId) => {
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

  // --- Lógica de Arrastrar y Soltar (Táctil) ---
  const handleTouchStart = (e, itemId, sourceZoneId) => {
    setIsDraggingTouch(true);
    setDraggedItemId(itemId);
    setDraggedFromZoneId(sourceZoneId);
    // Captura la posición inicial del toque
    const touch = e.touches[0];
    setTouchPosition({ x: touch.clientX, y: touch.clientY });

    // Previene el scroll o el zoom mientras se arrastra
    e.preventDefault();
  };

  const handleTouchMove = (e) => {
    if (!isDraggingTouch) return;

    const touch = e.touches[0];
    setTouchPosition({ x: touch.clientX, y: touch.clientY });

    // Detectar si el elemento arrastrado está sobre una zona de destino
    let currentHoveredZone = null;
    for (const zoneId in zoneRefs) {
      const zoneRect = zoneRefs[zoneId].current?.getBoundingClientRect();
      if (zoneRect &&
          touch.clientX >= zoneRect.left &&
          touch.clientX <= zoneRect.right &&
          touch.clientY >= zoneRect.top &&
          touch.clientY <= zoneRect.bottom) {
        currentHoveredZone = zoneId;
        break;
      }
    }
    setHoveredZoneId(currentHoveredZone);
    e.preventDefault(); // Previene el scroll de la página
  };

  const handleTouchEnd = () => {
    if (!isDraggingTouch) return;

    setIsDraggingTouch(false);
    setTouchPosition(null);

    // Determinar la zona de destino final
    let finalDestinationZoneId = null;
    if (hoveredZoneId && draggedItemId && draggedFromZoneId !== hoveredZoneId) {
      finalDestinationZoneId = hoveredZoneId;
    } else if (hoveredZoneId === draggedFromZoneId) {
      // Si se soltó en la misma zona de origen, no mover
      finalDestinationZoneId = null;
    } else if (!hoveredZoneId) {
      // Si se soltó fuera de cualquier zona, devolver a la lista maestra
      finalDestinationZoneId = 'master-list';
    }

    if (finalDestinationZoneId && draggedItemId && draggedFromZoneId) {
      moveItemBetweenZones(draggedItemId, draggedFromZoneId, finalDestinationZoneId);
    }

    setDraggedItemId(null);
    setDraggedFromZoneId(null);
    setHoveredZoneId(null);
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

      // Añade el ítem a la lista de destino
      if (newZones[destinationZoneId]) {
        newZones[destinationZoneId].items = [...newZones[destinationZoneId].items, itemToMove];
      }

      return newZones;
    });
  };

  // --- Funciones de Gestión de Matrículas y Zonas ---
  const handleReset = () => {
    const newZonesState = { ...initialZones };
    newZonesState['master-list'].items = [...zones['master-list'].items];

    Object.keys(zones).forEach(zoneId => {
      if (zoneId !== 'master-list') {
        newZonesState['master-list'].items = [
          ...newZonesState['master-list'].items,
          ...zones[zoneId].items
        ];
        newZonesState[zoneId].items = [];
      }
    });

    const uniqueMasterListItems = [];
    const seenIds = new Set();
    newZonesState['master-list'].items.forEach(item => {
      if (!seenIds.has(item.id)) {
        uniqueMasterListItems.push(item);
        seenIds.add(item.id);
      }
    });
    newZonesState['master-list'].items = uniqueMasterListItems;

    setZones(newZonesState);
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
    setZones(prevZones => ({
      ...prevZones,
      'master-list': {
        ...prevZones['master-list'],
        items: prevZones['master-list'].items.filter(item => item.id !== plateIdToDelete),
      },
      'nave-oficinas': {
        ...prevZones['nave-oficinas'],
        items: prevZones['nave-oficinas'].items.filter(item => item.id !== plateIdToDelete),
      },
      'nave-mecanico': {
        ...prevZones['nave-mecanico'],
        items: prevZones['nave-mecanico'].items.filter(item => item.id !== plateIdToDelete),
      },
      'nave-nueva': {
        ...prevZones['nave-nueva'],
        items: prevZones['nave-nueva'].items.filter(item => item.id !== plateIdToDelete),
      },
      'exterior': {
        ...prevZones['exterior'],
        items: prevZones['exterior'].items.filter(item => item.id !== plateIdToDelete),
      },
    }));
  };


  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 to-indigo-200 p-4 font-sans text-gray-800"
         onMouseMove={isDraggingTouch ? handleTouchMove : undefined}
         onMouseUp={isDraggingTouch ? handleTouchEnd : undefined}
         onTouchMove={isDraggingTouch ? handleTouchMove : undefined}
         onTouchEnd={isDraggingTouch ? handleTouchEnd : undefined}>
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
            ref={zoneRefs['master-list']} // Asigna la referencia
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, 'master-list')}
            onDragEnter={() => handleDragEnter('master-list')}
            onDragLeave={handleDragLeave}
            style={getListStyle(hoveredZoneId === 'master-list')}
            className="rounded-lg transition-colors duration-200"
          >
            {zones['master-list'].items.length === 0 && (
              <p className="text-gray-500 text-center py-4">No hay matrículas disponibles.</p>
            )}
            {zones['master-list'].items.map((item) => (
              <div
                key={item.id}
                draggable="true" // Habilita el arrastre para este elemento (ratón)
                onDragStart={(e) => handleDragStart(e, item.id, 'master-list')}
                onTouchStart={(e) => handleTouchStart(e, item.id, 'master-list')} // Evento táctil
                style={getItemStyle(item.id, draggedItemId, isDraggingTouch, touchPosition)}
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
                  ref={zoneRefs[zoneId]} // Asigna la referencia
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, zoneId)}
                  onDragEnter={() => handleDragEnter(zoneId)}
                  onDragLeave={handleDragLeave}
                  style={getListStyle(hoveredZoneId === zoneId)}
                  className="rounded-lg transition-colors duration-200 flex flex-col items-center"
                >
                  {zone.items.length === 0 && (
                    <p className="text-gray-500 text-center py-4">Arrastra matrículas aquí.</p>
                  )}
                  {zone.items.map((item) => (
                    <div
                      key={item.id}
                      draggable="true" // Habilita el arrastre para este elemento (ratón)
                      onDragStart={(e) => handleDragStart(e, item.id, zoneId)}
                      onTouchStart={(e) => handleTouchStart(e, item.id, zoneId)} // Evento táctil
                      style={getItemStyle(item.id, draggedItemId, isDraggingTouch, touchPosition)}
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
      {/* Renderiza el elemento arrastrado con el dedo fuera del flujo normal */}
      {isDraggingTouch && draggedItemId && (
        <div
          ref={draggedItemRef}
          style={getItemStyle(draggedItemId, draggedItemId, isDraggingTouch, touchPosition)}
          className="text-center text-lg font-medium absolute"
        >
          {zones[draggedFromZoneId]?.items.find(item => item.id === draggedItemId)?.content}
        </div>
      )}
    </div>
  );
}

export default App;
