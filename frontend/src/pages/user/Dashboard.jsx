import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { logoutUser } from '../../api/auth.js';
import { fetchPublicPlaces } from '../../api/places.js';
import {
  GoogleMap,
  Marker,
  Circle,
  useLoadScript,
} from '@react-google-maps/api';

const libraries = ['places'];
const defaultCenter = { lat: 20.6597, lng: -103.3496 };

const mapContainerStyle = {
  width: '100%',
  height: '100%',
  borderRadius: '24px',
  overflow: 'hidden',
  boxShadow: '0 30px 70px -35px rgba(14,165,233,0.45)',
};

const mapOptions = {
  // Hide default Google Maps UI controls (removes Pegman and others)
  disableDefaultUI: true,
  // Extra explicit disables for clarity
  streetViewControl: false,
  zoomControl: false,
  mapTypeControl: false,
  fullscreenControl: false,
  rotateControl: false,
  scaleControl: false,
  // Ensure default cursor (avoid crosshair look)
  draggableCursor: 'default',
  keyboardShortcuts: false,
  styles: [
    { elementType: 'geometry', stylers: [{ color: '#020617' }] },
    { elementType: 'labels.text.fill', stylers: [{ color: '#94a3b8' }] },
    { elementType: 'labels.text.stroke', stylers: [{ color: '#020617' }] },
    { featureType: 'poi', stylers: [{ visibility: 'off' }] },
    { featureType: 'transit', stylers: [{ visibility: 'off' }] },
    { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#0f172a' }] },
    { featureType: 'road', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
    { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#64748b' }] },
    { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#082f49' }] },
  ],
};

const topBarStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '1rem 1.5rem',
  borderBottom: '1px solid rgba(148,163,184,0.18)',
  background: 'rgba(2,6,23,0.82)',
  backdropFilter: 'blur(14px)',
  position: 'sticky',
  top: 0,
  zIndex: 30,
};

const brandStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.75rem',
  color: '#e0f2fe',
  fontWeight: 700,
  fontSize: '1.15rem',
  letterSpacing: '0.06em',
  cursor: 'pointer',
};

const navListStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.8rem',
  flexWrap: 'wrap',
};

const navButtonStyle = {
  padding: '0.55rem 1.05rem',
  borderRadius: '999px',
  border: '1px solid transparent',
  background: 'rgba(56,189,248,0.12)',
  color: '#38bdf8',
  fontSize: '0.9rem',
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'all 0.2s ease',
};

const userSummaryStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.75rem',
  color: '#f8fafc',
  fontSize: '0.9rem',
};

const userBadgeStyle = {
  padding: '0.35rem 0.75rem',
  borderRadius: '12px',
  border: '1px solid rgba(148,163,184,0.35)',
  background: 'rgba(30,64,175,0.45)',
  fontSize: '0.75rem',
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
};

const filterPanelStyle = {
  background: 'rgba(15,23,42,0.75)',
  border: '1px solid rgba(148,163,184,0.18)',
  borderRadius: '20px',
  padding: '1.25rem',
  display: 'flex',
  flexDirection: 'column',
  gap: '1rem',
  boxShadow: '0 20px 45px -30px rgba(8,145,178,0.45)',
  backdropFilter: 'blur(12px)',
};

const filterSectionStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.65rem',
};

const filterToggleStyle = {
  display: 'flex',
  gap: '0.5rem',
  flexWrap: 'wrap',
};

const filterChipButtonStyle = {
  padding: '0.45rem 0.9rem',
  borderRadius: '999px',
  border: '1px solid rgba(56,189,248,0.35)',
  background: 'rgba(56,189,248,0.12)',
  color: '#38bdf8',
  fontSize: '0.8rem',
  fontWeight: 600,
  cursor: 'pointer',
};

const mapPanelStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '1.2rem',
  background: 'rgba(15,23,42,0.65)',
  borderRadius: '22px',
  border: '1px solid rgba(148,163,184,0.18)',
  padding: '1.4rem',
  boxShadow: '0 24px 60px -32px rgba(8,145,178,0.45)',
  backdropFilter: 'blur(12px)',
};

const userPanelStyle = {
  background: 'rgba(15,23,42,0.75)',
  border: '1px solid rgba(59,130,246,0.3)',
  borderRadius: '20px',
  padding: '1.25rem',
  boxShadow: '0 22px 55px -30px rgba(37,99,235,0.4)',
  backdropFilter: 'blur(12px)',
  display: 'flex',
  flexDirection: 'column',
  gap: '0.9rem',
};

const infoItemStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.25rem',
  fontSize: '0.9rem',
};

const resultsListStyle = {
  display: 'grid',
  gap: '0.85rem',
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
};

const resultCardStyle = {
  borderRadius: '16px',
  border: '1px solid rgba(56,189,248,0.25)',
  background: 'rgba(8,47,73,0.45)',
  padding: '0.95rem',
  display: 'flex',
  flexDirection: 'column',
  gap: '0.45rem',
};

const amenityLabels = {
  accessible: 'Accesible',
  family: 'Familiar',
  wifi: 'WiFi',
};

function useMediaQuery(query) {
  const [matches, setMatches] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(query).matches : false,
  );

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const media = window.matchMedia(query);
    const listener = (event) => setMatches(event.matches);
    setMatches(media.matches);
    if (typeof media.addEventListener === 'function') {
      media.addEventListener('change', listener);
      return () => media.removeEventListener('change', listener);
    }
    media.addListener(listener);
    return () => media.removeListener(listener);
  }, [query]);

  return matches;
}

function computeDistanceKm(lat1, lon1, lat2, lon2) {
  const toRad = (value) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
}

function computeDistanceM(a, b) {
  return computeDistanceKm(a.lat, a.lng, b.lat, b.lng) * 1000;
}

function stripHtml(html) {
  if (typeof html !== 'string') return '';
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
}

function Dashboard() {
  const navigate = useNavigate();
  const [position, setPosition] = useState(null);
  const lastAcceptedPosRef = useRef(null);
  const [heading, setHeading] = useState(null);
  const [speed, setSpeed] = useState(null);
  const [accuracy, setAccuracy] = useState(null);
  const [error, setError] = useState('');
  const [selectedPoint, setSelectedPoint] = useState(null);
  const [directions, setDirections] = useState(null);
  const [routeInfo, setRouteInfo] = useState(null);
  const [travelMode, setTravelMode] = useState('WALKING');
  const [guidance, setGuidance] = useState(null); // { text, subText, distanceM, etaMin }
  const dirRendererRef = useRef(null);
  const mapRef = useRef(null);
  const lastUserInteractionRef = useRef(0);
  // Access code modal state + tracking
  const [accessModalVisible, setAccessModalVisible] = useState(false);
  const [accessCode, setAccessCode] = useState(null);
  const lastAccessRef = useRef({ placeId: null, at: 0 });
  const [isFollowing, setIsFollowing] = useState(true); // follow camera on position updates
  // Proximity alert state
  const [nearbyAlert, setNearbyAlert] = useState(null); // { point, distanceM }
  const lastAlertRef = useRef({ placeId: null, at: 0 });
  // Accuracy / smoothing
  const posBufferRef = useRef([]); // recent samples: {lat, lng, acc}
  const lastRecalRef = useRef(0);
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [radiusMeters, setRadiusMeters] = useState(800);
  const currentUser = useMemo(() => {
    try {
      const stored = localStorage.getItem('popi_user');
      return stored ? JSON.parse(stored) : null;
    } catch (err) {
      console.warn('No se pudo leer el usuario almacenado', err);
      return null;
    }
  }, []);
  const [currentTime, setCurrentTime] = useState(new Date());

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries,
  });

  // Restore last known position immediately on mount so marker doesn't disappear on reload
  useEffect(() => {
    try {
      const raw = localStorage.getItem('popi_last_pos');
      if (raw) {
        const saved = JSON.parse(raw);
        if (saved && typeof saved.lat === 'number' && typeof saved.lng === 'number') {
          const restored = { lat: saved.lat, lng: saved.lng };
          setPosition(restored);
          lastAcceptedPosRef.current = restored;
          if (typeof saved.accuracy === 'number') setAccuracy(Math.round(saved.accuracy));
        }
      }
    } catch (_) {
      // ignore parse errors
    }
    // Kick off a one-shot read to speed up first fix
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude, accuracy: acc } = pos.coords;
          const nowPos = { lat: latitude, lng: longitude };
          setPosition(nowPos);
          lastAcceptedPosRef.current = nowPos;
          if (typeof acc === 'number') setAccuracy(Math.round(acc));
        },
        () => {},
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
      );
    }
  }, []);

  useEffect(() => {
    if (!('geolocation' in navigator)) {
      setError('Tu navegador no soporta geolocalizacion.');
      return;
    }

    const watcher = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, heading: hd, speed: spd, accuracy: acc } = pos.coords;
        const newPos = { lat: latitude, lng: longitude };

        if (typeof acc === 'number') setAccuracy(Math.round(acc));

        // Filter out unrealistic jumps when accuracy is poor
        const last = lastAcceptedPosRef.current;
        const distFromLastKm = last ? computeDistanceKm(last.lat, last.lng, newPos.lat, newPos.lng) : 0;
        const accMeters = typeof acc === 'number' ? acc : null;
        const poorAccThreshold = 80; // stricter threshold by default
        // If accuracy is very poor and the jump is big, ignore this update
        if (accMeters != null && accMeters > poorAccThreshold && distFromLastKm > 1.0) {
          setError('Precisión baja, esperando mejor señal…');
          return;
        }
        // Ignore absurd jumps regardless of accuracy (likely a glitch)
        if (distFromLastKm > 10) {
          return;
        }
        // Smoothing: keep last 5 samples and compute weighted average by 1/acc^2
        const buf = posBufferRef.current.slice(-4);
        buf.push({ lat: latitude, lng: longitude, acc: accMeters ?? 50 });
        posBufferRef.current = buf;
        const weighted = (() => {
          if (!buf.length) return newPos;
          let sumW = 0, sx = 0, sy = 0;
          for (const s of buf) {
            const a = Math.max(5, Math.min(200, Number.isFinite(s.acc) ? s.acc : 50));
            const w = 1 / (a * a); // higher weight for better accuracy
            sumW += w; sx += s.lat * w; sy += s.lng * w;
          }
          if (sumW === 0) return newPos;
          return { lat: sx / sumW, lng: sy / sumW };
        })();

        setPosition(weighted);
        lastAcceptedPosRef.current = weighted;
        setHeading(hd ?? null);
        setSpeed(spd != null ? (spd * 3.6).toFixed(1) : null);
        setError('');
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setError('Necesitamos permiso para acceder a tu ubicacion.');
        } else {
          setError('No pudimos obtener tu ubicacion. Intenta nuevamente.');
        }
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0, // avoid cached positions that can be far off
        timeout: 15000,
      },
    );

    return () => navigator.geolocation.clearWatch(watcher);
  }, []);

  // Persist last known position for instant restore after reload
  useEffect(() => {
    if (!position) return;
    try {
      const payload = {
        lat: position.lat,
        lng: position.lng,
        accuracy: typeof accuracy === 'number' ? accuracy : null,
        at: Date.now(),
      };
      localStorage.setItem('popi_last_pos', JSON.stringify(payload));
    } catch (_) {
      // ignore storage errors
    }
  }, [position, accuracy]);

  // Auto-recalibrate periodically if accuracy is poor without user interaction
  useEffect(() => {
    if (!('geolocation' in navigator)) return;
    const now = Date.now();
    const needRecal = accuracy == null || (typeof accuracy === 'number' && accuracy > 100);
    const minInterval = 15000; // 15s throttle
    if (needRecal && now - lastRecalRef.current > minInterval) {
      lastRecalRef.current = now;
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude, accuracy: acc } = pos.coords;
          const nowPos = { lat: latitude, lng: longitude };
          // Smooth by merging into buffer
          const buf = posBufferRef.current.slice(-4);
          buf.push({ lat: latitude, lng: longitude, acc: typeof acc === 'number' ? acc : 50 });
          posBufferRef.current = buf;
          let sumW = 0, sx = 0, sy = 0;
          for (const s of buf) {
            const a = Math.max(5, Math.min(200, Number.isFinite(s.acc) ? s.acc : 50));
            const w = 1 / (a * a);
            sumW += w; sx += s.lat * w; sy += s.lng * w;
          }
          const smoothed = sumW ? { lat: sx / sumW, lng: sy / sumW } : nowPos;
          setPosition(smoothed);
          lastAcceptedPosRef.current = smoothed;
          if (typeof acc === 'number') setAccuracy(Math.round(acc));
          setError('');
        },
        () => {},
        { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
      );
    }
  }, [accuracy, position]);

  useEffect(() => {
    const intervalId = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(intervalId);
  }, []);

  const [places, setPlaces] = useState([]);
  const [placesLoading, setPlacesLoading] = useState(false);
  const [placesError, setPlacesError] = useState('');

  // Fetch places from server when we have a position (or default center) and radius
  useEffect(() => {
    const origin = position || defaultCenter;
    const load = async () => {
      setPlacesLoading(true);
      setPlacesError('');
      try {
        const data = await fetchPublicPlaces({ lat: origin.lat, lng: origin.lng, radius_km: radiusMeters / 1000 });
        setPlaces(Array.isArray(data?.places) ? data.places : []);
      } catch (err) {
        setPlacesError(err.message || 'No pudimos cargar los lugares.');
        setPlaces([]);
      } finally {
        setPlacesLoading(false);
      }
    };
    load();
  }, [position, radiusMeters]);

  const filteredPoints = useMemo(() => {
    return places;
  }, [places]);

  useEffect(() => {
    if (selectedPoint && !filteredPoints.some((point) => point.id === selectedPoint.id)) {
      setSelectedPoint(null);
      try { dirRendererRef.current?.setMap(null); } catch (_) {}
      dirRendererRef.current = null;
      setDirections(null);
      setRouteInfo(null);
    }
  }, [filteredPoints, selectedPoint]);

  useEffect(() => {
    if (!position || !selectedPoint || !isLoaded) {
      try { dirRendererRef.current?.setMap(null); } catch (_) {}
      setDirections(null);
      setRouteInfo(null);
      setGuidance(null);
      return;
    }

    const mapsApi = typeof window !== 'undefined' ? window.google?.maps : null;
    if (!mapsApi || !mapRef.current) return;

    // Ask directions service for route
    const service = new mapsApi.DirectionsService();
    service.route(
      {
        origin: position,
        destination: { lat: selectedPoint.lat, lng: selectedPoint.lng },
        travelMode: mapsApi.TravelMode?.[travelMode] ?? mapsApi.TravelMode?.WALKING ?? 'WALKING',
      },
      (result, status) => {
        if (status === 'OK' && result?.routes?.length) {
          setDirections(result);

          // Ensure we have a renderer instance, reuse if present
          try {
            if (!dirRendererRef.current) {
              dirRendererRef.current = new mapsApi.DirectionsRenderer({ suppressMarkers: true, preserveViewport: false });
              // attach click listener on route to mark manual interaction
              try { dirRendererRef.current.addListener && dirRendererRef.current.addListener('click', () => setIsFollowing(false)); } catch (_) {}
            }
            dirRendererRef.current.setMap(mapRef.current);
            dirRendererRef.current.setDirections(result);
            // when a route is set, enable following by default
            setIsFollowing(true);
          } catch (_) {}

          const leg = result.routes[0].legs[0];
          if (leg) {
            setRouteInfo({
              distance: leg.distance?.text,
              duration: leg.duration?.text,
              endAddress: leg.end_address,
            });
            // Prime guidance on new route
            const steps = Array.isArray(leg.steps) ? leg.steps : [];
            if (steps.length) {
              const first = steps[0];
              setGuidance({
                text: stripHtml(first.instructions || first.html_instructions || ''),
                subText: leg.duration?.text ? `ETA ${leg.duration.text}` : null,
                distanceM: first.distance?.value ?? null,
                etaMin: leg.duration?.value ? Math.round(leg.duration.value / 60) : null,
              });
            } else {
              setGuidance(null);
            }
          } else {
            setRouteInfo(null);
            setGuidance(null);
          }

          // Fit map to route bounds for initial route display
          try {
            const bounds = result.routes[0].bounds;
            if (bounds && mapRef.current && typeof mapRef.current.fitBounds === 'function') {
              mapRef.current.fitBounds(bounds);
            }
          } catch (_) {}
        } else {
          try { dirRendererRef.current?.setMap(null); } catch (_) {}
          setDirections(null);
          setRouteInfo(null);
          setGuidance(null);
          setError('No pudimos calcular la ruta. Intenta otro modo.');
        }
      },
    );
  }, [position, selectedPoint, travelMode, isLoaded]);

  // Auto-follow behavior: pan the map to the user's current position
  useEffect(() => {
    if (!position || !isLoaded || !mapRef.current) return;
    const now = Date.now();
    // If the user interacted with the map recently, don't auto-follow
    if (now - lastUserInteractionRef.current < 5000) return;
    // Respect explicit follow toggle
    if (!isFollowing) return;
    try {
      // If following a route, try to center slightly ahead along the route
      if (directions && directions.routes && directions.routes.length) {
        try {
          const route = directions.routes[0];
          const leg = route.legs && route.legs[0];
          const steps = leg && Array.isArray(leg.steps) ? leg.steps : [];
          if (steps.length) {
            // find nearest step index
            let bestIdx = 0;
            let bestDist = Infinity;
            for (let i = 0; i < steps.length; i++) {
              const s = steps[i];
              if (Array.isArray(s.path) && s.path.length) {
                for (const p of s.path) {
                  const d = computeDistanceM(position, { lat: p.lat(), lng: p.lng() });
                  if (d < bestDist) { bestDist = d; bestIdx = i; }
                }
              } else if (s.start_location && s.end_location) {
                const d1 = computeDistanceM(position, { lat: s.start_location.lat(), lng: s.start_location.lng() });
                const d2 = computeDistanceM(position, { lat: s.end_location.lat(), lng: s.end_location.lng() });
                const d = Math.min(d1, d2);
                if (d < bestDist) { bestDist = d; bestIdx = i; }
              }
            }
            const next = steps[Math.min(bestIdx + 1, steps.length - 1)];
            if (next && next.end_location) {
              const nextLat = next.end_location.lat();
              const nextLng = next.end_location.lng();
              const centerLat = position.lat + 0.4 * (nextLat - position.lat);
              const centerLng = position.lng + 0.4 * (nextLng - position.lng);
              mapRef.current.panTo({ lat: centerLat, lng: centerLng });
              try {
                const targetZoom = isMobile ? 15 : 16;
                if (mapRef.current.getZoom() < targetZoom) mapRef.current.setZoom(targetZoom);
              } catch (_) {}
              return;
            }
          }
        } catch (_) {
          // fallback to simple pan
        }
      }

      const center = mapRef.current.getCenter();
      if (!center) {
        mapRef.current.panTo(position);
        return;
      }
      const centerPos = { lat: center.lat(), lng: center.lng() };
      const distM = computeDistanceM(centerPos, position);
      // Only recenter when the user has moved noticeably (avoid tiny pans)
      if (distM > 30) {
        mapRef.current.panTo(position);
        // keep sensible zoom when following user
        try {
          const targetZoom = isMobile ? 15 : 16;
          if (mapRef.current.getZoom() < targetZoom) mapRef.current.setZoom(targetZoom);
        } catch (_) {}
      }
    } catch (_) {
      // ignore map pan errors
    }
  }, [position, isLoaded, isMobile]);

  // Live guidance update based on current position vs route steps
  useEffect(() => {
    if (!directions || !position) {
      setGuidance((g) => (g ? { ...g } : null));
      return;
    }
    try {
      const route = directions.routes?.[0];
      const leg = route?.legs?.[0];
      const steps = Array.isArray(leg?.steps) ? leg.steps : [];
      if (!steps.length) return;

      // Find closest step by path or endpoints
      let bestIdx = 0;
      let bestDist = Infinity;
      for (let i = 0; i < steps.length; i++) {
        const s = steps[i];
        // Prefer path if available (array of LatLngs)
        if (Array.isArray(s.path) && s.path.length) {
          for (const p of s.path) {
            const d = computeDistanceM(position, { lat: p.lat(), lng: p.lng() });
            if (d < bestDist) { bestDist = d; bestIdx = i; }
          }
        } else if (s.start_location && s.end_location) {
          const d1 = computeDistanceM(position, { lat: s.start_location.lat(), lng: s.start_location.lng() });
          const d2 = computeDistanceM(position, { lat: s.end_location.lat(), lng: s.end_location.lng() });
          const d = Math.min(d1, d2);
          if (d < bestDist) { bestDist = d; bestIdx = i; }
        }
      }

      const current = steps[Math.min(bestIdx, steps.length - 1)];
      const toEndM = current?.end_location
        ? computeDistanceM(position, { lat: current.end_location.lat(), lng: current.end_location.lng() })
        : null;

      const text = stripHtml(current?.instructions || current?.html_instructions || 'Sigue la ruta');
      const etaSec = leg?.duration?.value ?? null;
      const etaMin = etaSec != null ? Math.max(0, Math.round(etaSec / 60)) : null;
      const next = steps[bestIdx + 1] || null;
      const nextText = next ? stripHtml(next.instructions || next.html_instructions || '') : null;

      setGuidance({
        text: toEndM != null ? `En ${Math.max(0, Math.round(toEndM))} m: ${text}` : text,
        subText: nextText ? `Luego: ${nextText}` : (leg?.distance?.text ? `Faltan ${leg.distance.text}` : null),
        distanceM: toEndM != null ? Math.round(toEndM) : null,
        etaMin,
      });
    } catch (_e) {
      // ignore
    }
  }, [directions, position]);

  // Detect proximity to the nearest bathroom and raise a lightweight alert
  useEffect(() => {
    if (!position || !filteredPoints.length) {
      setNearbyAlert(null);
      return;
    }
    const PROXIMITY_M = 60; // alert threshold in meters
    let nearest = null;
    let nearestDistM = Infinity;
    for (const p of filteredPoints) {
      const dKm = computeDistanceKm(position.lat, position.lng, p.lat, p.lng);
      const dM = dKm * 1000;
      if (dM < nearestDistM) {
        nearestDistM = dM;
        nearest = p;
      }
    }
    if (!nearest) {
      setNearbyAlert(null);
      return;
    }
    const now = Date.now();
    const cooldownMs = 2 * 60 * 1000; // 2 minutes cooldown per place
    const wasRecentlyAlerted =
      lastAlertRef.current.placeId === nearest.id &&
      now - lastAlertRef.current.at < cooldownMs;

    if (nearestDistM <= PROXIMITY_M && !wasRecentlyAlerted) {
      setNearbyAlert({ point: nearest, distanceM: Math.round(nearestDistM) });
      lastAlertRef.current = { placeId: nearest.id, at: now };
      // Optionally auto-select the point for quick actions
      setSelectedPoint((prev) => prev ?? nearest);
    } else if (nearestDistM > PROXIMITY_M + 10) {
      // Hide alert when moving away with hysteresis
      setNearbyAlert(null);
    }
  }, [position, filteredPoints]);

  // Show access-code modal when user is very close to the selectedPoint
  useEffect(() => {
    if (!position || !selectedPoint) return;
    try {
      const distM = computeDistanceM(position, { lat: selectedPoint.lat, lng: selectedPoint.lng });
      const ACCESS_THRESHOLD_M = 25; // threshold to show the code
      const now = Date.now();
      const cooldownMs = 5 * 60 * 1000; // don't re-show for 5 minutes for same place
      const wasRecentlyShown = lastAccessRef.current.placeId === selectedPoint.id && (now - lastAccessRef.current.at) < cooldownMs;
      if (distM <= ACCESS_THRESHOLD_M && !wasRecentlyShown) {
        // generate a simple temporary code (6 digits)
        const code = String(Math.floor(100000 + Math.random() * 900000));
        setAccessCode(code);
        setAccessModalVisible(true);
        lastAccessRef.current = { placeId: selectedPoint.id, at: now };
      }
      if (distM > ACCESS_THRESHOLD_M + 10) {
        // hide when moving away
        setAccessModalVisible(false);
      }
    } catch (_e) {
      // ignore
    }
  }, [position, selectedPoint]);

  const handleRadiusChange = (event) => setRadiusMeters(Number(event.target.value));
  const handleRecenter = () => {
    if (!('geolocation' in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, accuracy: acc } = pos.coords;
        const newPos = { lat: latitude, lng: longitude };
        setPosition(newPos);
        lastAcceptedPosRef.current = newPos;
        if (typeof acc === 'number') setAccuracy(Math.round(acc));
        setError('');
      },
      () => setError('No pudimos recentrar tu ubicacion.'),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  const mapContainerResponsiveStyle = {
    ...mapContainerStyle,
    height: isMobile ? '60vh' : '520px',
    minHeight: isMobile ? '360px' : '520px',
  };

  const mainContentStyles = isMobile
    ? {
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem',
        padding: '1.25rem 1rem 2rem',
      }
    : {
        display: 'grid',
        gridTemplateColumns: 'minmax(240px, 280px) 1fr minmax(260px, 300px)',
        gap: '1.5rem',
        padding: '1.75rem',
        alignItems: 'start',
      };

  const filterPanelResponsiveStyle = { ...filterPanelStyle, width: '100%', order: isMobile ? 2 : 1 };

  const mapPanelResponsiveStyle = {
    ...mapPanelStyle,
    order: isMobile ? 1 : 2,
  };

  const userPanelResponsiveStyle = {
    ...userPanelStyle,
    width: '100%',
    order: 3,
  };

  const formattedTime = currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const locationStatus = position ? 'Ubicacion activa' : 'Esperando ubicacion...';
  const resultsCountLabel = placesLoading
    ? 'Cargando lugares...'
    : filteredPoints.length === 1
    ? '1 resultado cercano'
    : `${filteredPoints.length} resultados cercanos`;

  const userMarkerIcon = (() => {
    if (typeof window === 'undefined' || !window.google?.maps) return undefined;
    if (heading != null) {
      return {
        path: window.google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
        scale: 6,
        fillColor: '#22d3ee',
        fillOpacity: 1,
        strokeWeight: 2,
        strokeOpacity: 0.9,
        strokeColor: '#0ea5e9',
        rotation: heading,
      };
    }
    return {
      path: window.google.maps.SymbolPath.CIRCLE,
      scale: 8,
      fillColor: '#38bdf8',
      fillOpacity: 1,
      strokeWeight: 2,
      strokeColor: '#0ea5e9',
    };
  })();

  const handleNavigateProfile = () => navigate('/profile');
  const handleLogout = async () => {
    try { await logoutUser(); } catch (_) {}
    localStorage.removeItem('popi_user');
    navigate('/login');
  };

  const handleOpenDirections = () => {
    if (!position || !selectedPoint) return;
    const url = `https://www.google.com/maps/dir/?api=1&origin=${position.lat},${position.lng}&destination=${selectedPoint.lat},${selectedPoint.lng}&travelmode=${travelMode.toLowerCase()}`;
    window.open(url, '_blank', 'noopener');
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: 'radial-gradient(circle at top, rgba(56,189,248,0.15), rgba(2,6,23,0.92))',
        color: '#e2e8f0',
      }}
    >
      <header style={topBarStyle}>
        <div style={brandStyle} onClick={() => navigate('/')}>
          Popi
        </div>
        <nav style={navListStyle}>
          <button type="button" style={navButtonStyle} onClick={() => navigate('/app')}>
            Mapa
          </button>
          {!currentUser && (
            <button type="button" style={navButtonStyle} onClick={() => navigate('/colaborar')}>
              Colabora
            </button>
          )}
          {currentUser?.role === 'collaborator' && (
            <button type="button" style={navButtonStyle} onClick={() => navigate('/colaborador/panel')}>
              Panel colaborador
            </button>
          )}
          {currentUser?.is_staff && (
            <button type="button" style={navButtonStyle} onClick={() => navigate('/admin/panel')}>
              Administrador
            </button>
          )}
        </nav>
        <div style={userSummaryStyle}>
          <span>{formattedTime}</span>
          <button
            type="button"
            onClick={() => navigate('/profile')}
            style={{ ...userBadgeStyle, background: 'rgba(56,189,248,0.15)', cursor: 'pointer' }}
            title="Ver perfil"
          >
            {currentUser?.role ?? (currentUser?.is_staff ? 'admin' : 'invitado')}
          </button>
        </div>
      </header>

      <main style={mainContentStyles}>
        <aside style={filterPanelResponsiveStyle}>
          <div style={filterSectionStyle}>
            <h2 style={{ fontSize: '1rem', margin: 0, color: '#bae6fd' }}>Búsqueda</h2>
            <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
              Ajusta el radio y explora lugares cercanos aprobados.
            </span>
          </div>

          <div style={filterSectionStyle}>
            <label style={{ fontSize: '0.8rem', color: '#7dd3fc' }}>
              Radio de búsqueda ({radiusMeters} m)
            </label>
            <input
              type="range"
              min="200"
              max="3000"
              step="50"
              value={radiusMeters}
              onChange={handleRadiusChange}
            />
            <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <button type="button" style={{ ...filterChipButtonStyle, border: '1px solid rgba(59,130,246,0.55)', background: 'rgba(59,130,246,0.2)' }} onClick={handleRecenter}>
                Recentrar ubicacion
              </button>
              {typeof accuracy === 'number' && (
                <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Precisión ~±{accuracy} m</span>
              )}
            </div>
          </div>

          <div style={filterSectionStyle}>
            <span style={{ fontSize: '0.8rem', color: '#7dd3fc' }}>Modo de desplazamiento</span>
            <div style={filterToggleStyle}>
              {['WALKING', 'DRIVING'].map((mode) => {
                const active = travelMode === mode;
                return (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setTravelMode(mode)}
                    style={{
                      ...filterChipButtonStyle,
                      border: active ? '1px solid rgba(59,130,246,0.75)' : filterChipButtonStyle.border,
                      background: active ? 'rgba(37,99,235,0.35)' : filterChipButtonStyle.background,
                    }}
                  >
                    {mode === 'WALKING' ? 'A pie' : 'Auto'}
                  </button>
                );
              })}
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.65rem',
              background: 'rgba(8,47,73,0.45)',
              borderRadius: '16px',
              border: '1px solid rgba(59,130,246,0.35)',
              padding: '0.85rem 1rem',
            }}
          >
            <span style={{ fontSize: '0.75rem', color: '#7dd3fc', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
              Estado
            </span>
            <span style={{ fontSize: '0.9rem', color: '#e2e8f0' }}>{locationStatus}</span>
            {error && <span style={{ fontSize: '0.8rem', color: '#fca5a5' }}>{error}</span>}
          </div>
        </aside>

        <section style={mapPanelResponsiveStyle}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <h1 style={{ fontSize: '1.3rem', margin: 0, color: '#f8fafc' }}>Mapa en vivo y resultados</h1>
            <span style={{ fontSize: '0.9rem', color: '#94a3b8' }}>
              {resultsCountLabel}. Ajusta filtros o selecciona un punto para obtener la ruta.
            </span>
            {routeInfo && (
              <div
                style={{
                  display: 'flex',
                  gap: '1rem',
                  flexWrap: 'wrap',
                  fontSize: '0.85rem',
                  color: '#bae6fd',
                }}
              >
                <span>Distancia: {routeInfo.distance ?? 'N/D'}</span>
                <span>Tiempo estimado: {routeInfo.duration ?? 'N/D'}</span>
              </div>
            )}
          </div>

          <div
            style={{
              minHeight: mapContainerResponsiveStyle.minHeight,
              borderRadius: '24px',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div style={{ position: 'absolute', top: 12, right: 12, zIndex: 40 }}>
              <button
                type="button"
                onClick={() => setIsFollowing((v) => !v)}
                title={isFollowing ? 'Detener seguimiento' : 'Seguir mi ubicación'}
                style={{
                  padding: '0.5rem 0.65rem',
                  borderRadius: 10,
                  border: '1px solid rgba(148,163,184,0.18)',
                  background: isFollowing ? 'rgba(59,130,246,0.25)' : 'rgba(15,23,42,0.6)',
                  color: '#e2f8ff',
                  cursor: 'pointer',
                  fontWeight: 700,
                }}
              >
                {isFollowing ? 'Siguiendo' : 'No seguir'}
              </button>
            </div>
            {guidance && (
              <div
                style={{
                  position: 'absolute',
                  top: nearbyAlert ? 56 : 12,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  zIndex: 4,
                  background: 'rgba(15,23,42,0.92)',
                  border: '1px solid rgba(148,163,184,0.35)',
                  color: '#e2e8f0',
                  padding: '0.6rem 0.9rem',
                  borderRadius: 12,
                  boxShadow: '0 12px 30px -18px rgba(148,163,184,0.35)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.25rem',
                  maxWidth: 520,
                  width: 'calc(100% - 2rem)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', alignItems: 'baseline' }}>
                  <span style={{ fontWeight: 700, color: '#bae6fd' }}>{guidance.text}</span>
                  {typeof guidance.etaMin === 'number' && (
                    <span style={{ fontSize: '0.85rem', color: '#93c5fd' }}>ETA {guidance.etaMin} min</span>
                  )}
                </div>
                {guidance.subText && (
                  <span style={{ fontSize: '0.9rem', color: '#94a3b8' }}>{guidance.subText}</span>
                )}
              </div>
            )}
            {nearbyAlert && (
              <div
                style={{
                  position: 'absolute',
                  top: 12,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  zIndex: 5,
                  background: 'rgba(8,145,178,0.95)',
                  border: '1px solid rgba(56,189,248,0.65)',
                  color: '#ecfeff',
                  padding: '0.65rem 0.9rem',
                  borderRadius: 12,
                  boxShadow: '0 12px 30px -18px rgba(56,189,248,0.6)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.65rem',
                }}
              >
                <span>
                  Estás cerca de <strong>{nearbyAlert.point.business_name}</strong> (~{nearbyAlert.distanceM} m)
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPoint(nearbyAlert.point);
                    setNearbyAlert(null);
                  }}
                  style={{
                    padding: '0.35rem 0.6rem',
                    borderRadius: 10,
                    border: '1px solid rgba(2,132,199,0.6)',
                    background: 'rgba(2,132,199,0.2)',
                    color: '#e0f2fe',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Ver
                </button>
                <button
                  type="button"
                  onClick={() => setNearbyAlert(null)}
                  style={{
                    padding: '0.35rem 0.6rem',
                    borderRadius: 10,
                    border: '1px solid rgba(148,163,184,0.35)',
                    background: 'rgba(15,23,42,0.35)',
                    color: '#e2e8f0',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Cerrar
                </button>
              </div>
            )}
            {accessModalVisible && selectedPoint && (
              <div
                role="dialog"
                aria-modal="true"
                style={{
                  position: 'absolute',
                  bottom: 24,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  zIndex: 6,
                  background: 'linear-gradient(180deg, rgba(8,47,73,0.98), rgba(2,6,23,0.95))',
                  border: '1px solid rgba(59,130,246,0.45)',
                  color: '#ecfeff',
                  padding: '0.85rem 1rem',
                  borderRadius: 12,
                  boxShadow: '0 18px 40px -20px rgba(2,132,199,0.45)',
                  maxWidth: 520,
                  width: 'calc(100% - 2rem)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', alignItems: 'center' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <strong style={{ color: '#bfdbfe' }}>Estás por llegar</strong>
                    <span style={{ color: '#c7f9ff' }}>Por favor entrega este código al negocio para obtener acceso:</span>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#93c5fd' }}>{accessCode}</div>
                    <div style={{ fontSize: '0.9rem', color: '#94a3b8' }}>{selectedPoint.business_name}</div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(accessCode || '');
                        } catch (_) {}
                      }}
                      style={{ padding: '0.5rem 0.75rem', borderRadius: 10, border: '1px solid rgba(148,163,184,0.18)', background: 'rgba(59,130,246,0.18)', color: '#e2f8ff', cursor: 'pointer' }}
                    >
                      Copiar código
                    </button>
                    <button
                      type="button"
                      onClick={() => setAccessModalVisible(false)}
                      style={{ padding: '0.45rem 0.7rem', borderRadius: 10, border: '1px solid rgba(148,163,184,0.18)', background: 'rgba(15,23,42,0.35)', color: '#e2e8f0', cursor: 'pointer' }}
                    >
                      Cerrar
                    </button>
                  </div>
                </div>
              </div>
            )}
            {loadError && (
              <div style={{ padding: '2rem', color: '#f87171' }}>
                No se pudo cargar el mapa. Revisa tu API Key.
              </div>
            )}
            {!isLoaded && !loadError && (
              <div style={{ padding: '2rem', color: '#94a3b8' }}>Cargando mapa en tiempo real...</div>
            )}
            {isLoaded && (
              <GoogleMap
                mapContainerStyle={mapContainerResponsiveStyle}
                zoom={position ? (isMobile ? 15 : 16) : 12}
                center={position || defaultCenter}
                options={mapOptions}
                onLoad={(map) => {
                  mapRef.current = map;
                  // attach interaction listeners so we don't fight user pans
                  try {
                      const dragListener = map.addListener('dragstart', () => { lastUserInteractionRef.current = Date.now(); setIsFollowing(false); });
                      const zoomListener = map.addListener('zoom_changed', () => { lastUserInteractionRef.current = Date.now(); setIsFollowing(false); });
                      const mouseDown = map.addListener('mousedown', () => { lastUserInteractionRef.current = Date.now(); setIsFollowing(false); });
                    // store listeners for cleanup
                    map.__popi_listeners = [dragListener, zoomListener, mouseDown];
                  } catch (e) {
                    // ignore listener attach errors
                  }

                      // Create a single DirectionsRenderer instance and attach to the map
                  try {
                    const mapsApi = window.google?.maps;
                    if (mapsApi) {
                      // ensure previous instance removed
                      try { dirRendererRef.current?.setMap(null); } catch (_) {}
                      dirRendererRef.current = new mapsApi.DirectionsRenderer({
                        suppressMarkers: true,
                        preserveViewport: false,
                      });
                      dirRendererRef.current.setMap(map);
                    }
                  } catch (_) {
                    // ignore
                  }
                }}
                onUnmount={() => {
                  try {
                    if (mapRef.current && mapRef.current.__popi_listeners) {
                      for (const l of mapRef.current.__popi_listeners) {
                        try { l.remove(); } catch (_) {}
                      }
                    }
                  } catch (_) {}
                  try { dirRendererRef.current?.setMap(null); } catch (_) {}
                  dirRendererRef.current = null;
                  mapRef.current = null;
                }}
              >
                {position && (
                  <>
                    <Marker position={position} icon={userMarkerIcon} />
                    <Circle
                      center={position}
                      radius={Math.min(Math.max(accuracy ?? 100, 60), 300)}
                      options={{
                        strokeColor: '#38bdf8',
                        strokeOpacity: 0.35,
                        strokeWeight: 1,
                        fillColor: '#38bdf8',
                        fillOpacity: 0.08,
                      }}
                    />
                  </>
                )}

                {filteredPoints.map((point) => {
                  const isSelected = selectedPoint?.id === point.id;
                  const mapsInstance = typeof window !== 'undefined' ? window.google?.maps : undefined;
                  const scaledSize = mapsInstance ? new mapsInstance.Size(40, 40) : undefined;
                  return (
                    <Marker
                      key={point.id}
                      position={{ lat: point.lat, lng: point.lng }}
                      onClick={() => setSelectedPoint(point)}
                      icon={{
                        url: isSelected
                          ? 'https://maps.gstatic.com/mapfiles/ms2/micons/toilets.png'
                          : 'https://maps.gstatic.com/mapfiles/ms2/micons/lightblue.png',
                        scaledSize,
                      }}
                    />
                  );
                })}

                {/* DirectionsRenderer is managed manually (single instance) via map onLoad and effects */}
              </GoogleMap>
            )}
          </div>

          <div style={resultsListStyle}>
            {filteredPoints.map((point) => {
              const isSelected = selectedPoint?.id === point.id;
              const distanceKm = point.distance_km ?? (position ? computeDistanceKm(position.lat, position.lng, point.lat, point.lng) : null);
              return (
                <div
                  key={point.id}
                  style={{
                    ...resultCardStyle,
                    border: isSelected ? '1px solid rgba(56,189,248,0.65)' : resultCardStyle.border,
                    cursor: 'pointer',
                  }}
                  onClick={() => setSelectedPoint(point)}
                >
                  <strong style={{ color: '#38bdf8', fontSize: '1rem' }}>{point.business_name}</strong>
                  <span style={{ fontSize: '0.85rem', color: '#cbd5f5' }}>
                    {distanceKm != null ? `${distanceKm.toFixed(2)} km de distancia` : 'Distancia por calcular'}
                  </span>
                  <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', fontSize: '0.85rem' }}>
                    <span style={{ color: '#facc15' }}>{point.rating != null ? `${Number(point.rating).toFixed(1)} pts` : 'Sin rating'}</span>
                    <span style={{ color: '#94a3b8' }}>{point.review_count ?? 0} reseñas</span>
                  </div>
                  {point.website && (
                    <a href={point.website} target="_blank" rel="noreferrer" style={{ fontSize: '0.8rem', color: '#38bdf8' }}>
                      Sitio web
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        <aside style={userPanelResponsiveStyle}>
          <div>
            <h2 style={{ fontSize: '1.1rem', margin: 0, color: '#bfdbfe' }}>Panel del usuario</h2>
            <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '0.35rem' }}>
              Revisa tu informacion y configura tu experiencia.
            </p>
          </div>

          {selectedPoint && (
            <div
              style={{
                display: 'grid',
                gap: '0.6rem',
                border: '1px solid rgba(56,189,248,0.35)',
                borderRadius: '14px',
                padding: '0.9rem',
                background: 'rgba(8,47,73,0.35)',
              }}
            >
              <strong style={{ color: '#38bdf8' }}>Lugar seleccionado</strong>
              {selectedPoint.photo_url && (
                <img src={selectedPoint.photo_url} alt={selectedPoint.business_name} style={{ width: '100%', borderRadius: '10px', objectFit: 'cover', maxHeight: 160 }} />
              )}
              <div style={{ fontSize: '0.9rem', color: '#e2e8f0' }}>{selectedPoint.business_name}</div>
              <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>{selectedPoint.address}</div>
              {selectedPoint.business_phone && (
                <a href={`tel:${selectedPoint.business_phone}`} style={{ color: '#7dd3fc', fontSize: '0.85rem' }}>
                  Llamar: {selectedPoint.business_phone}
                </a>
              )}
              {selectedPoint.website && (
                <a href={selectedPoint.website} target="_blank" rel="noreferrer" style={{ color: '#7dd3fc', fontSize: '0.85rem' }}>
                  Sitio web
                </a>
              )}
              <button
                type="button"
                onClick={handleOpenDirections}
                style={{
                  padding: '0.7rem 0.9rem',
                  borderRadius: '10px',
                  border: '1px solid rgba(59,130,246,0.45)',
                  background: 'rgba(59,130,246,0.18)',
                  color: '#bfdbfe',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Cómo llegar
              </button>
            </div>
          )}

          <div style={infoItemStyle}>
            <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.15em', color: '#7dd3fc' }}>
              Nombre
            </span>
            <span>
              {currentUser
                ? `${currentUser.first_name ?? ''} ${currentUser.last_name ?? ''}`.trim() || currentUser.email
                : 'Sin autenticacion'}
            </span>
          </div>

          <div style={infoItemStyle}>
            <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.15em', color: '#7dd3fc' }}>
              Correo
            </span>
            <span style={{ color: '#38bdf8' }}>{currentUser?.email ?? 'N/D'}</span>
          </div>

          <div style={infoItemStyle}>
            <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.15em', color: '#7dd3fc' }}>
              Rol
            </span>
            <span>{currentUser?.role ?? (currentUser?.is_staff ? 'admin' : 'invitado')}</span>
          </div>

          <button
            type="button"
            onClick={handleNavigateProfile}
            style={{
              padding: '0.8rem 1rem',
              borderRadius: '12px',
              border: '1px solid rgba(56,189,248,0.45)',
              background: 'rgba(56,189,248,0.18)',
              color: '#38bdf8',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Editar perfil
          </button>

          <button
            type="button"
            onClick={handleLogout}
            style={{
              padding: '0.8rem 1rem',
              borderRadius: '12px',
              border: '1px solid rgba(248,113,113,0.45)',
              background: 'rgba(239,68,68,0.18)',
              color: '#fecaca',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Cerrar sesión
          </button>

          <div
            style={{
              borderTop: '1px solid rgba(148,163,184,0.2)',
              paddingTop: '0.9rem',
              display: 'grid',
              gap: '0.55rem',
            }}
          >
            <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
              Velocidad: {speed != null ? `${speed} km/h` : 'N/D'}
            </div>
            <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
              Direccion: {heading != null ? `${Math.round(heading)} deg` : 'N/D'}
            </div>
            <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
              Radio: {radiusMeters} m · Modo: {travelMode === 'WALKING' ? 'A pie' : 'Auto'}
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
}

export default Dashboard;
