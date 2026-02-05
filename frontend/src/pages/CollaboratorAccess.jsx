import { useEffect, useState, useRef } from 'react';
import AuthLayout from '../components/AuthLayout.jsx';
import { request } from '../api/auth.js';

function simpleFetchJson(path, opts = {}) {
  // Delegate to shared request helper which handles CSRF and FormData
  return request(path, { method: opts.method || 'GET', body: opts.body, headers: opts.headers });
}

function CollaboratorAccess() {
  const [manualCode, setManualCode] = useState('');
  const [verifyResult, setVerifyResult] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [scanning, setScanning] = useState(true); // start scanning by default

  const handleVerify = async (rawInput) => {
    // Accepts: manual code string, QR raw string (JSON or semi-colon kv), or parsed object
    let raw = rawInput ?? manualCode;
    if (!raw) {
      return alert('Código requerido');
    }

    let appId = null;
    let code = null;
    let isToken = false;

    // If we got a string, try common encodings: "app:123;code:ABC" or JSON
    if (typeof raw === 'string') {
      // try kv pair format
      const kvMatch = raw.match(/app\s*[:=]\s*(\d+)\s*[;|,]?\s*code\s*[:=]\s*([A-Za-z0-9_-]+)/i);
      if (kvMatch) {
        appId = Number(kvMatch[1]);
        code = kvMatch[2];
      } else {
        // try JSON
        try {
          const parsed = JSON.parse(raw);
          raw = parsed;
        } catch (_) {
          // leave as-is (could be plain code)
        }
      }
    }

    if (typeof raw === 'object') {
      appId = Number(raw.application_id || raw.app) || appId;
      code = code || raw.code || raw.value || raw.token;
      if (raw.token) isToken = true;
    }

    // If still no code but raw is a simple string, treat it as the code
    if (!code && typeof raw === 'string') code = raw;

    // Build request body
    const body = {};
    if (appId) body.application_id = appId;
    if (isToken) body.token = code; else body.code = code;

    try {
      const res = await simpleFetchJson('/api/auth/codes/verify/', { method: 'POST', body });
      setVerifyResult(res);
      if (res?.ok) alert('Acceso autorizado para: ' + (res.place?.business_name || '')); else alert('Código inválido.');
    } catch (e) {
      alert('Error al verificar: ' + (e.message || e));
    }
  };

  // Basic QR scanning using BarcodeDetector if available
  useEffect(() => {
    let stream;
    let detector;
    let rafId;
    async function startScan() {
      if (!('BarcodeDetector' in window)) return;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        if (videoRef.current) videoRef.current.srcObject = stream;
        detector = new window.BarcodeDetector({ formats: ['qr_code'] });
        await videoRef.current.play();

        const scanLoop = async () => {
          try {
            const bitmap = await createImageBitmap(videoRef.current);
            const barcodes = await detector.detect(bitmap);
            if (barcodes && barcodes.length) {
              const raw = barcodes[0].rawValue;
              // pass the whole payload to the verifier (it will extract app+code)
              handleVerify(raw);
              // stop scanning after a successful detection to avoid duplicates
              setScanning(false);
            }
          } catch (_) { }
          rafId = requestAnimationFrame(scanLoop);
        };
        scanLoop();
      } catch (e) {
        console.warn('scan start failed', e);
      }
    }
    if (scanning) startScan();
    return () => {
      try { if (rafId) cancelAnimationFrame(rafId); } catch(_){ }
      try { if (videoRef.current) { videoRef.current.pause(); videoRef.current.srcObject = null; } } catch(_){ }
      try { if (stream) { stream.getTracks().forEach(t=>t.stop()); } } catch(_){ }
    };
  }, [scanning]);

  return (
    <AuthLayout title="Control de acceso" subtitle="Verifica códigos o escanea QR para permitir acceso" backTo="/app">
      <div style={{ display: 'grid', gap: '1rem' }}>
        <div style={{ display: 'grid', gap: '0.5rem' }}>
          <label style={{ fontWeight: 700, color: '#bae6fd' }}>Ingresar código</label>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <input value={manualCode} onChange={(e)=>setManualCode(e.target.value)} placeholder="123456" />
            <button onClick={()=>handleVerify(manualCode)}>Verificar</button>
          </div>
        </div>

        <div style={{ display: 'grid', gap: '0.5rem' }}>
          <label style={{ fontWeight: 700, color: '#bae6fd' }}>Cámara (escaneo QR)</label>
          {!('BarcodeDetector' in window) && <div style={{ color: '#f59e0b' }}>Tu navegador no soporta escaneo directo. Puedes usar la cámara del teléfono o introducir el código manualmente.</div>}
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <video ref={videoRef} style={{ width: 320, height: 240, borderRadius: 8, background: '#000' }} muted playsInline autoPlay />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <button onClick={()=>setScanning(s=>!s)}>{scanning ? 'Detener escaneo' : 'Iniciar escaneo'}</button>
              <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Al detectar QR se intentará verificar automáticamente.</div>
            </div>
          </div>
        </div>
      </div>
    </AuthLayout>
  );
}

export default CollaboratorAccess;
