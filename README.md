# Popi - Full-Stack Starter

This repository contains a minimal frontend (React + Vite) and backend (Django REST) setup. It is intentionally lean so you can adapt it to your needs.

## Frontend

### Requirements
- Node.js 18+
- Google Maps API key (coloca en `VITE_GOOGLE_MAPS_API_KEY`)

### Setup
```bash
cd frontend
npm install
npm run dev
```
The development server runs on https://localhost:5173 by default (dev HTTPS enabled).

Create a `.env` file (or export the variables) with:
```
VITE_API_BASE_URL=http://localhost:8000
VITE_GOOGLE_MAPS_API_KEY=tu_api_key_de_google
```

Dev proxy notes:

- Vite proxies requests to Django in development:
	- `/api -> http://localhost:8000`
	- `/media -> http://localhost:8000` (para ver PDFs/imagenes subidas desde el panel admin)
- Alternatively, set `VITE_API_BASE_URL` to call the backend with URLs absolutas (sin proxy).

Available routes:
- `/` Landing page con CTA
- `/register` registro clasico (cliente)
- `/login` Inicio de sesion
- `/colaborar` Alta de negocio para colaboradores (requiere estar autenticado); sube INE y comprobante + selecciona direccion con Google Maps
- `/colaborador/panel` Panel del colaborador: lista tus negocios, permite publicar un baño cuando sea aprobado
- `/admin/panel` Panel administrador: revisar y aprobar/rechazar solicitudes de negocio (solo staff)
- `/app` Dashboard posterior al login: mapa en vivo que sigue tu posicion y muestra baños cercanos aprobados y publicados

## Backend

### Requirements
- Python 3.12+
- PostgreSQL running locally (database: popi, user: postgres, password: Bryan3322)

### Setup
```bash
cd backend
python -m venv .venv
.venv\Scripts\activate  # On Windows
pip install -r requirements.txt
cp .env.example .env
python manage.py migrate
python manage.py runserver
```
The API is served at http://localhost:8000 and exposes (principalmente):
- `GET /health/` simple health-check
- `POST /api/auth/register/` registro de clientes
- `POST /api/auth/login/` inicio de sesion por email
- `POST /api/auth/collaborator/apply/` enviar solicitud de negocio (colaborador autenticado; `multipart/form-data` con INE y comprobante)
- `GET /api/partner/applications/` ver mis solicitudes de negocio (colaborador autenticado)
- `POST /api/partner/applications/<id>/bathroom/` crear baño para un negocio aprobado (uno por negocio)
- `GET /api/auth/admin/overview/` resumen para admin (solo staff)
- `GET /api/public/places/` lugares publicos para el mapa (solo negocios aprobados que ya tienen baño publicado)

## Notes

- CORS está habilitado en desarrollo para que React hable con Django; la autenticación usa sesiones (cookies) + cabeceras CSRF.
- `UserProfile` maneja el rol (`customer` o `collaborator`) y banderas admin (`is_staff`, `is_superuser`).
- `CollaboratorApplication` guarda datos del negocio, info de Google Place, y documentos (INE + comprobante); hace validación de cobertura (~30 km de Guadalajara) y de dirección exacta.
- Flujo colaborador en dos pasos: 1) crea cuenta normal, 2) desde `/colaborar` envía su negocio (aprobación por admin). Una vez aprobado, puede publicar un único baño para ese negocio.
- En desarrollo, los archivos de medios se sirven desde `/media/...` (gracias al proxy de Vite puedes abrir PDFs/imagenes directamente desde el frontend).
- El dashboard `/app` usa geolocalización con filtros de precisión y saltos para mayor estabilidad; muestra solo baños de negocios aprobados y publicados.

## Autenticación y roles

- La landing (`/`) fuerza sesión cerrada para iniciar limpio.
- Rutas protegidas requieren login; el panel admin es solo para `is_staff`/`is_superuser`.
- El login respeta `next` y aplica reglas por rol (no permite a no-admins entrar al panel admin).

