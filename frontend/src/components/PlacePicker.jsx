import { useCallback, useMemo, useRef, useState } from 'react';
import { GoogleMap, Marker, Autocomplete, useLoadScript } from '@react-google-maps/api';

const libraries = ['places'];
const defaultCenter = { lat: 20.6597, lng: -103.3496 };

const mapContainerStyle = {
  width: '100%',
  height: '320px',
  borderRadius: '16px',
  border: '1px solid rgba(148,163,184,0.25)',
  overflow: 'hidden'
};

const inputStyle = {
  width: '100%',
  padding: '0.75rem 1rem',
  borderRadius: '14px',
  border: '1px solid rgba(148,163,184,0.35)',
  background: 'rgba(15,23,42,0.78)',
  color: '#e2e8f0',
  fontSize: '0.95rem'
};

function PlacePicker({ onPlaceSelected, initialPosition }) {
  const [center, setCenter] = useState(initialPosition || defaultCenter);
  const [marker, setMarker] = useState(initialPosition || defaultCenter);
  const autocompleteRef = useRef(null);
  const mapRef = useRef(null);

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: apiKey,
    libraries
  });

  const mapOptions = useMemo(
    () => ({
      disableDefaultUI: false,
      styles: [
        { elementType: 'geometry', stylers: [{ color: '#0f172a' }] },
        { elementType: 'labels.text.stroke', stylers: [{ color: '#0f172a' }] },
        { elementType: 'labels.text.fill', stylers: [{ color: '#64748b' }] },
        {
          featureType: 'poi',
          elementType: 'labels.text.fill',
          stylers: [{ color: '#38bdf8' }]
        },
        {
          featureType: 'road',
          elementType: 'geometry',
          stylers: [{ color: '#1e293b' }]
        },
        {
          featureType: 'water',
          elementType: 'geometry',
          stylers: [{ color: '#082f49' }]
        }
      ]
    }),
    []
  );

  const autocompleteOptions = useMemo(
    () => ({
      fields: [
        'name',
        'formatted_address',
        'geometry',
        'international_phone_number',
        'website',
        'opening_hours',
        'rating',
        'user_ratings_total',
        'photos',
        'types',
        'place_id'
      ]
    }),
    []
  );

  const onPlaceChanged = useCallback(() => {
    const autocomplete = autocompleteRef.current;
    if (!autocomplete) return;
    const place = autocomplete.getPlace();
    if (!place || !place.geometry) return;

    const location = place.geometry.location;
    const newPosition = { lat: location.lat(), lng: location.lng() };
    setCenter(newPosition);
    setMarker(newPosition);

    const photoUrl = place.photos && place.photos.length > 0 ? place.photos[0].getUrl() : '';
    const schedule = place.opening_hours && place.opening_hours.weekday_text
      ? place.opening_hours.weekday_text.join('\n')
      : '';

    onPlaceSelected({
      business_name: place.name || '',
      address: place.formatted_address || '',
      latitude: newPosition.lat,
      longitude: newPosition.lng,
      business_phone: place.international_phone_number || '',
      website: place.website || '',
      schedule,
      rating: place.rating || null,
      review_count: place.user_ratings_total || 0,
      photo_url: photoUrl,
      place_types: (place.types || []).join(','),
      place_id: place.place_id || ''
    });

    if (mapRef.current) {
      mapRef.current.panTo(newPosition);
      mapRef.current.setZoom(17);
    }
  }, [onPlaceSelected]);

  const onMapLoad = useCallback((map) => {
    mapRef.current = map;
  }, []);

  const handleMapClick = useCallback((e) => {
    if (!e?.latLng) return;
    const newPos = { lat: e.latLng.lat(), lng: e.latLng.lng() };
    setMarker(newPos);
    setCenter(newPos);
    // Permitimos seleccionar coordenadas manualmente como fallback
    onPlaceSelected({
      latitude: newPos.lat,
      longitude: newPos.lng,
    });
  }, [onPlaceSelected]);

  if (loadError) {
    return <p style={{ color: '#f87171' }}>No se pudo cargar el mapa. Revisa tu API Key.</p>;
  }

  if (!isLoaded) {
    return <p style={{ color: '#94a3b8' }}>Cargando mapa...</p>;
  }

  return (
    <div style={{ display: 'grid', gap: '1rem' }}>
      <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
        Consejo: si el autocompletado no aparece, puedes escribir el nombre y dirección manualmente y hacer clic en el mapa para fijar las coordenadas.
      </div>
      <Autocomplete
        onLoad={(autocomplete) => (autocompleteRef.current = autocomplete)}
        onPlaceChanged={onPlaceChanged}
        options={autocompleteOptions}
      >
        <input
          type="text"
          placeholder="Busca el negocio por nombre o direccion..."
          style={inputStyle}
        />
      </Autocomplete>
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={center}
        zoom={14}
        options={mapOptions}
        onLoad={onMapLoad}
        onClick={handleMapClick}
      >
        {marker && <Marker position={marker} />}
      </GoogleMap>
    </div>
  );
}

export default PlacePicker;
