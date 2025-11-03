# Troubleshooting - Popi

## Error al aprobar solicitudes de colaborador

Si experimentas un error al intentar aprobar o rechazar solicitudes desde el panel de administrador, sigue estos pasos:

### 1. Verificar que eres administrador

El usuario debe tener `is_staff=True` o `is_superuser=True`. Para verificar tu sesión actual:

**Opción A: En la consola del navegador**
```javascript
fetch('https://localhost:5173/api/auth/debug/session/', { credentials: 'include' })
  .then(r => r.json())
  .then(data => console.log('Estado de sesión:', data));
```

**Opción B: Revisar el localStorage**
```javascript
console.log(JSON.parse(localStorage.getItem('popi_user')));
```

### 2. Crear un superusuario si no existe

```powershell
cd backend
python manage.py createsuperuser
```

Ingresa los datos cuando te los solicite. Luego inicia sesión con ese usuario en `/login` e intenta acceder al panel admin en `/admin/panel`.

### 3. Verificar la sesión y CSRF

El error más común es que la cookie CSRF no se esté enviando correctamente. Verifica en las DevTools del navegador:

1. Abre DevTools (F12)
2. Ve a la pestaña **Network**
3. Haz clic en "Aprobar" en una solicitud
4. Busca la petición POST a `/api/auth/admin/collaborators/.../decision/`
5. En **Headers**, verifica que:
   - La cookie `sessionid` esté presente
   - La cookie `csrftoken` esté presente
   - El header `X-CSRFToken` se esté enviando

### 4. Verificar logs de consola

El código ahora incluye logs detallados. Al hacer clic en "Aprobar" o "Rechazar", deberías ver en la consola:

```javascript
Error al decidir sobre colaborador: {applicationId: ..., action: ..., error: ...}
```

Esto te dará más información sobre qué está fallando exactamente.

### 5. Errores comunes y soluciones

#### Error 403 Forbidden
- **Causa**: El usuario no tiene permisos de staff/superuser
- **Solución**: Asegúrate de estar logueado con un usuario administrador

#### Error 401 Unauthorized
- **Causa**: La sesión expiró o no existe
- **Solución**: Cierra sesión y vuelve a iniciar sesión desde `/login`

#### Error 404 Not Found
- **Causa**: El ID de la aplicación no existe o la ruta es incorrecta
- **Solución**: Verifica que la solicitud existe en la base de datos

#### Error de CORS
- **Causa**: El origen del frontend no está en CORS_ALLOWED_ORIGINS
- **Solución**: Verifica que `backend/popi_backend/settings.py` incluye:
```python
CORS_ALLOWED_ORIGINS = [
    'https://localhost:5173',
    'http://localhost:5173',
]
```

### 6. Probar directamente con curl

Si quieres probar el endpoint sin el frontend:

```powershell
# Primero obtén el CSRF token
curl -c cookies.txt https://localhost:5173/api/auth/csrf/

# Luego haz login (ajusta email y password)
curl -b cookies.txt -c cookies.txt -X POST https://localhost:5173/api/auth/login/ `
  -H "Content-Type: application/json" `
  -d '{\"email\":\"admin@example.com\",\"password\":\"tupassword\"}'

# Finalmente prueba aprobar (ajusta el ID)
curl -b cookies.txt -X POST https://localhost:5173/api/auth/admin/collaborators/1/decision/ `
  -H "Content-Type: application/json" `
  -H "X-CSRFToken: TU_TOKEN_AQUI" `
  -d '{\"action\":\"approve\"}'
```

### 7. Revisar el backend directamente

Si el servidor Django está corriendo, puedes verificar el endpoint directamente navegando a:
- `http://localhost:8000/admin/` (Django admin panel)
- O usando el shell de Django:

```powershell
cd backend
python manage.py shell
```

```python
from django.contrib.auth.models import User
from accounts.models import CollaboratorApplication

# Ver usuarios admin
User.objects.filter(is_staff=True)

# Ver solicitudes pendientes
CollaboratorApplication.objects.filter(status='pending')

# Aprobar manualmente una solicitud (ejemplo con id=1)
app = CollaboratorApplication.objects.get(id=1)
app.status = 'approved'
app.save()
```

### 8. Verificar que el backend está corriendo

```powershell
cd backend
python manage.py runserver
```

El servidor debe estar activo en `http://localhost:8000` para que el proxy de Vite funcione.

## Otros problemas comunes

### El mapa no muestra baños
- Solo se muestran negocios `approved` que ya tengan un `Bathroom` creado
- Verifica en el panel admin que el negocio esté aprobado
- Desde el panel colaborador, asegúrate de haber hecho clic en "Registrar baño"

### No puedo subir documentos PDF
- Verifica que el proxy de `/media` esté configurado en `frontend/vite.config.js`
- El servidor Django debe estar corriendo para servir archivos media

### Error al iniciar sesión
- Verifica que el backend esté corriendo
- Revisa que las cookies se estén configurando correctamente (sin bloqueo de navegador)
- Intenta en modo incógnito para descartar problemas de caché

## Contacto

Si ninguna de estas soluciones funciona, revisa:
1. Los logs del servidor Django en la terminal donde ejecutaste `runserver`
2. Los logs de la consola del navegador (F12 → Console)
3. La pestaña Network en DevTools para ver las respuestas exactas del servidor
