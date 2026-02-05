# Popi — Manual del Proyecto

w

Resumen
- Popi es una aplicación full‑stack para localizar negocios con baños públicos/colaboradores, registrar colaboradores y controlar acceso mediante códigos/QR.
- Backend: Django 5 + Django REST Framework. Carpeta: `backend/`.
- Frontend: React 18 + Vite. Carpeta: `frontend/`.

Índice
- Introducción
- Estructura del repositorio
- Backend (arquitectura y endpoints)
- Frontend (arquitectura y rutas)
- Flujo de colaborador (registro, revisión, baños)
- Control de acceso (códigos/QR)
- Configuración de desarrollo
- Variables de entorno necesarias
- Migraciones y manejo de archivos (media)
# Popi — Manual completo del proyecto

Última actualización: 2025-12-02

Resumen ejecutivo
- Popi es una aplicación full‑stack para localizar baños colaboradores (negocios que abren su baño al público) y gestionar el proceso de registro, aprobación y control de acceso con códigos y QR.
- La app está diseñada para entornos urbanos: busca negocios cercanos, muestra rutas, y emite códigos temporales para permitir el acceso a usuarios finales (clientes) mientras mantiene controles anti‑abuso.

Audiencia de este manual
- Desarrolladores: para comprender arquitectura, modelos y rutas.
- DevOps: para desplegar y configurar entornos.
- Administradores de producto: para entender flujos de usuarios y operadores.

Índice
- Visión general
- Arquitectura
- Componentes y responsabilidades
- Modelos de datos
- API pública y contratos (ejemplos)
- Flujos principales
  - Registro de colaborador
  - Revisión / decisión administrativa
  - Registro de baño por el partner
  - Emisión y verificación de códigos / QR
- Seguridad y consideraciones
- Entorno de desarrollo
- Despliegue y producción
- Pruebas y verificación local
- Generar este manual en PDF
- Preguntas frecuentes y solución de problemas

====================

Visión general
---------------
Popi conecta a usuarios con negocios que aceptan compartir sus baños. Los negocios (colaboradores) solicitan aparecer en la plataforma; el equipo admin valida la información y, una vez aprobados, el propietario puede registrar un baño. Los usuarios finales ven los baños en el mapa, obtienen rutas y, cuando están físicamente cerca, pueden obtener un código o QR para que el negocio valide su acceso.

Arquitectura
------------
Top‑level:
- Backend: Django 5 + Django REST Framework (API REST). Almacenamiento principal: PostgreSQL. Archivos subidos (INE, comprobante) en `MEDIA_ROOT`.
- Frontend: React 18 + Vite, usa `@react-google-maps/api` para mapas.
- Autenticación: sesiones Django (cookies) — la app frontend usa `credentials: 'include'` en fetch.

Componentes y responsabilidades
--------------------------------
- `backend/accounts/`:
  - Modelos: `UserProfile`, `CollaboratorApplication`, `Bathroom`, `AccessCode`.
  - Serializers: validaciones de campos y archivos (email/phone uniquness, password confirm, coverage checks).
  - Views/API: endpoints de registro, login, collaborator register (multipart), admin overview, issue/verify codes, places public listing.
- `frontend/src/`:
  - Páginas: `Dashboard` (mapa), `Register`, `Login`, `Collaborator` (registro), `CollaboratorAccess` (scanner), `PartnerDashboard`.
  - API helpers: `src/api/*` construyen requests con base en `VITE_API_BASE_URL`.

Modelos de datos (resumen)
-------------------------
- UserProfile
  - user: OneToOne -> User
  - phone_number: unique
  - role: customer | collaborator

- CollaboratorApplication
  - user: ForeignKey -> User
  - business_name, address, latitude/longitude
  - place_id: unique (Google Place id or canonical id)
  - ine_document, address_proof_document: FileField
  - status: pending | approved | rejected

- Bathroom
  - application: OneToOne -> CollaboratorApplication
  - is_active: boolean (permite marcar rechazo/inactividad)

- AccessCode
  - application: FK -> CollaboratorApplication
  - code: 6-digit string (visible)
  - token_hash: HMAC-SHA256 hash of a stronger token (no plaintext storage)
  - user_id (opt), created_by (opt), expires_at, used, used_by, used_at

API pública y contratos (ejemplos)
---------------------------------
Notas: rutas montadas bajo `/api/auth/`.

1) Salud
  - GET /health/
  - Respuesta: 200 {"status": "ok"}

2) Registro de usuario
  - POST /api/auth/register/
  - Body JSON: {"first_name","last_name","email","password","password_confirm","phone_number"}
  - Respuesta 201: {message, user}

3) Login
  - POST /api/auth/login/
  - Body: {email, password}
  - Respuesta 200: {message, user}

4) Registrar solicitud colaborador (archivos)
  - POST /api/auth/collaborator/register/ (multipart/form-data)
  - Campos: business_name, address, lat, lng, place_id, ine_document (file), address_proof_document (file), etc.
  - Respuesta 201: {message, user}

5) Admin: ver y decidir
  - GET /api/auth/admin/overview/ (admin only)
  - POST /api/auth/admin/applications/<pk>/decision/ (body {action: 'approve'|'reject'})
  - Rechazo: en la implementación actual la app (y archivos asociados) se eliminan para permitir re‑registro.

6) Public places
  - GET /api/auth/places/public/?lat=<>&lng=<>&radius_km=<>
  - Devuelve: {places: [{id,business_name,address,lat,lng,photo_url,place_id,distance_km,...}]}
  - Nota: devuelve solo aplicaciones aprobadas con `Bathroom` activo.

7) Partner registra baño
  - POST /api/auth/partner/applications/<id>/bathroom/
  - Requiere: application.status == approved
  - Responde: 201 {bathroom}

8) Emitir código/QR
  - POST /api/auth/codes/issue/
  - Body: {application_id:int, ttl_minutes?:int, guest?:true, user_id?:int}
  - Respuesta 201: {code, token, expires_at, application_id, text, payload}
  - Observación: backend guarda `token_hash` y no el token en claro.

9) Verificar código/QR
  - POST /api/auth/codes/verify/
  - Body: {application_id:int, code?:string, token?:string, user_id?:int}
  - Verificaciones: existe, no usado, no expirado, (user_id si aplica)
  - Marca `used=true` con transacción (select_for_update)

Flujos principales
------------------

1) Registro de colaborador
  - El propietario completa el formulario con datos del negocio y archivos.
  - El backend valida campos y crea `CollaboratorApplication(status=pending)`.

2) Revisión administrativa
  - Admin revisa documentos en `GET /api/auth/admin/overview/`.
  - Admin `approve` o `reject` con `/decision/`.
  - Approve: cambia `status=approved`, se actualiza `UserProfile.role='collaborator'`.
  - Reject: en la implementación actual se eliminan archivos y la aplicación para permitir re-registro; el rol del usuario se fuerza a `customer`.

3) Registro de baño por partner
  - Partner autenticado llama `POST /partner/applications/<id>/bathroom/`.
  - Si existe un `Bathroom` inactivo (rechazado), el endpoint intentará eliminarlo antes de crear el nuevo (resuelve conflictos OneToOne).

4) Emisión y verificación de código
  - Usuario cercano solicita código (guest) o el owner emite un código para cliente.
  - Backend genera `code` (6 dígitos) y `token` (UUID), calcula `token_hash` y guarda `AccessCode` con `expires_at`.
  - El frontend recibe `token` y `text` (JSON) para generar un QR.
  - El negocio/colaborador usa `CollaboratorAccess` (scanner o entrada manual) para enviar `token` o `code` a `/codes/verify/`.
  - Backend marca el código como usado en transacción atomic y retorna `{ok:true, place:{...}}`.

Seguridad y consideraciones
----------------------------
- Tokens: no almacenar el token en texto claro en la base de datos; almacenar sólo `token_hash` usando HMAC-SHA256 con `ACCESS_TOKEN_SECRET` o `SECRET_KEY`.
- Concurrency: verificación marca `AccessCode` como usado dentro de `select_for_update()` para evitar race conditions.
- CSRF: usar `CsrfTokenView` y `credentials: 'include'` en fetch; en producción configurar `CSRF_TRUSTED_ORIGINS` y cookies seguras.
- Rate limiting: cooldown simple por IP al emitir códigos; mejorar con Redis/DRF throttles si se necesita producción.
- Archivos: borrar archivos de solicitudes rechazadas (best-effort) para no retener datos innecesarios.

Entorno de desarrollo
---------------------
Requisitos mínimos:
- Python 3.12+
- Node.js 18+ (o similar)
- PostgreSQL (o sqlite para pruebas locales)

Pasos rápidos (PowerShell)
```powershell
# Backend
cd backend
python -m venv .venv
.venv\Scripts\Activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver 0.0.0.0:8000

# Frontend
cd frontend
npm install
npm run dev
```

Variables de entorno importantes
- `VITE_API_BASE_URL` — URL base del backend desde frontend (ej. `http://localhost:8000`).
- `VITE_GOOGLE_MAPS_API_KEY` — API Key de Google Maps para `@react-google-maps/api`.
- `ACCESS_TOKEN_SECRET` — secreto para HMAC tokens (opcional; si no existe se usa `SECRET_KEY`).
- `DATABASE_URL`, `SECRET_KEY`, `DEBUG`, `ALLOWED_HOSTS` en `backend/.env`.

Migraciones y manejo de media
----------------------------
- Las migraciones están en `backend/accounts/migrations/`.
- En desarrollo Django sirve `MEDIA_URL` desde `MEDIA_ROOT` mediante `static()` cuando `DEBUG=True`.
- Cuando una aplicación es rechazada, la implementación elimina archivos asociados (best‑effort) y la propia fila para permitir re‑registro.

Pruebas y verificación local
----------------------------
- Health: `GET /health/` → {"status":"ok"}.
- Emisión de código (ejemplo con curl):
```powershell
curl -X POST http://127.0.0.1:8000/api/auth/codes/issue/ -H "Content-Type: application/json" -d '{"application_id":123, "guest": true}'
```
- Verificación:
```powershell
curl -X POST http://127.0.0.1:8000/api/auth/codes/verify/ -H "Content-Type: application/json" -d '{"application_id":123, "token":"<TOKEN>"}'
```

Generar este manual en PDF
--------------------------
- He incluido `scripts/generate_manual.ps1` que usa `pandoc` y `xelatex` para generar `DOCS/PROJECT_MANUAL.pdf`.
- Ejecutar desde la raíz del proyecto:
```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\generate_manual.ps1
```
- Si no tiene `pandoc/LaTeX`, use VSCode Markdown Preview -> "Export as PDF" o un convertidor online.

Despliegue y producción (notas rápidas)
--------------------------------------
- Usar PostgreSQL gestionado y S3 (o similar) para media en producción.
- Configurar `CSRF_TRUSTED_ORIGINS` y `CORS_ALLOWED_ORIGINS` con los dominios reales.
- Asegurar `SESSION_COOKIE_SECURE=True`, `CSRF_COOKIE_SECURE=True`, `SECURE_SSL_REDIRECT=True` si se expone por HTTPS.
- Considerar auditoría y logging para decisiones admin y emisiones de códigos (puede ser obligatorio por motivos legales).

Preguntas frecuentes / troubleshooting
-------------------------------------
- Q: Después de rechazar una solicitud, no puedo registrar el mismo place_id. ¿Qué pasa?
  - A: Ahora el backend elimina la `CollaboratorApplication` y los archivos asociados al rechazar la solicitud; además, si existe un `Bathroom` inactivo el endpoint de creación lo elimina antes de crear uno nuevo. Reinicie el servidor si acaba de actualizar el código.

- Q: ¿Por qué no veo el mapa en local?
  - A: Verifique `VITE_GOOGLE_MAPS_API_KEY` y que la clave esté habilitada para Maps JavaScript API.

- Q: ¿Por qué recibo 403 CSRF al POST desde frontend?
  - A: Use `GET /api/auth/csrf/` (implementado como `CsrfTokenView`) para forzar la cookie CSRF y asegúrese de enviar `credentials: 'include'` en fetch.

Contribuciones
--------------
- Sigue el estilo del repo: pequeñas PRs, tests cuando agregues lógica crítica, y describe cambios de seguridad claramente.

Contacto
-------
- En este repositorio, usa la sección de Issues o contacta al mantenedor responsable del proyecto.

---

Si quieres, puedo:
- Añadir ejemplos concretos de payloads/respuestas en cada endpoint.
- Generar el PDF si confirmas que `pandoc`/LaTeX están instalados en tu entorno.
- Agregar diagrams (PlantUML o Graphviz) para ilustrar arquitectura y flujos.

Fin del manual.
