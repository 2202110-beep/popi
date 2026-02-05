from datetime import timedelta

from django.contrib.auth import authenticate, login
from django.contrib.auth.models import User
from django.utils import timezone
from rest_framework import permissions, status
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.middleware.csrf import get_token
from rest_framework.response import Response
from rest_framework.views import APIView
from django.conf import settings
from django.db import transaction
from django.core.cache import cache

from .models import CollaboratorApplication, UserProfile, Bathroom
from .models import AccessCode
from .serializers import RegisterSerializer, LoginSerializer, CollaboratorApplicationSerializer, CollaboratorBusinessSerializer, BathroomSerializer


class RegisterView(APIView):
    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(
            {
                'message': 'Registro exitoso',
                'user': user_payload(user),
            },
            status=status.HTTP_201_CREATED
        )


class CollaboratorRegisterView(APIView):
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def post(self, request):
        serializer = CollaboratorApplicationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(
            {
                'message': 'Solicitud registrada. Nuestro equipo revisara tu informacion y recibiras una respuesta pronto.',
                'user': user_payload(user),
            },
            status=status.HTTP_201_CREATED
        )


class LoginView(APIView):
    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data['email']
        password = serializer.validated_data['password']
        # Accept either email or username
        user = None
        try:
            candidate = User.objects.get(email__iexact=email)
            user = authenticate(username=candidate.username, password=password)
        except User.DoesNotExist:
            user = authenticate(username=email, password=password)
        if not user:
            return Response({'detail': 'Credenciales invalidas.'}, status=status.HTTP_400_BAD_REQUEST)

        login(request, user)
        return Response(
            {
                'message': 'Inicio de sesion exitoso',
                'user': user_payload(user),
            },
            status=status.HTTP_200_OK
        )


class LogoutView(APIView):
    def post(self, request):
        from django.contrib.auth import logout
        logout(request)
        return Response({'message': 'Sesion cerrada'}, status=status.HTTP_200_OK)


class MeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return Response({'user': user_payload(request.user)})


class DebugSessionView(APIView):
    """Debug endpoint to check current session state."""
    def get(self, request):
        return Response({
            'authenticated': request.user.is_authenticated,
            'user_id': request.user.id if request.user.is_authenticated else None,
            'is_staff': request.user.is_staff if request.user.is_authenticated else False,
            'is_superuser': request.user.is_superuser if request.user.is_authenticated else False,
            'session_key': request.session.session_key,
            'csrf_cookie': request.COOKIES.get('csrftoken', 'No CSRF cookie'),
        })


class CsrfTokenView(APIView):
    """Return a CSRF token to frontend so subsequent requests include the cookie.
    Useful when using fetch with `credentials: 'include'`.
    """
    def get(self, request):
        token = get_token(request)
        # Asegura que el cookie CSRF quede seteado incluso si el middleware no lo hace
        resp = Response({'csrftoken': token})
        # Ajusta flags de cookie para dev; en prod, Secure=True si usas HTTPS con dominio real
        resp.set_cookie(
            'csrftoken',
            token,
            samesite='Lax',
            secure=False if request.scheme == 'http' else True,
            httponly=False,
        )
        resp['X-CSRFToken'] = token
        return resp


class AdminOverviewView(APIView):
    permission_classes = [permissions.IsAdminUser]

    def get(self, request):
        users = (
            User.objects.select_related('profile')
            .all()
            .order_by('-date_joined')
        )
        applications = (
            CollaboratorApplication.objects.select_related('user', 'user__profile')
            .all()
            .order_by('-created_at')
        )

        total_users = users.count()
        total_collaborators = applications.filter(status=CollaboratorApplication.Status.APPROVED).count()
        total_customers = (
            UserProfile.objects.filter(role='customer').count()
        )
        total_staff = users.filter(is_staff=True).count()
        total_pending = applications.filter(status=CollaboratorApplication.Status.PENDING).count()
        total_rejected = applications.filter(status=CollaboratorApplication.Status.REJECTED).count()

        last_week = timezone.now() - timedelta(days=7)
        new_users_week = users.filter(date_joined__gte=last_week).count()
        new_applications_week = applications.filter(created_at__gte=last_week).count()

        users_payload = [
            {
                'id': user.id,
                'name': f'{user.first_name} {user.last_name}'.strip(),
                'email': user.email,
                'role': getattr(user.profile, 'role', 'admin') if hasattr(user, 'profile') else ('admin' if user.is_staff else 'customer'),
                'is_staff': user.is_staff,
                'date_joined': user.date_joined,
            }
            for user in users[:25]
        ]

        collaborator_payload = []
        for app in applications[:25]:
            user = app.user
            collaborator_payload.append(
                {
                    'application_id': app.id,
                    'user_id': user.id,
                    'name': f'{user.first_name} {user.last_name}'.strip(),
                    'email': user.email,
                    'phone_number': getattr(user.profile, 'phone_number', None) if hasattr(user, 'profile') else None,
                    'business_name': app.business_name,
                    'address': app.address,
                    'lat': float(app.latitude),
                    'lng': float(app.longitude),
                    'created_at': app.created_at,
                    'place_id': app.place_id,
                    'website': app.website,
                    'schedule': app.schedule,
                    'rating': float(app.rating) if app.rating is not None else None,
                    'review_count': app.review_count,
                    'status': app.status,
                    'address_proof_text': app.address_proof_text,
                    'ine_document_url': app.ine_document.url if app.ine_document else None,
                    'address_proof_document_url': app.address_proof_document.url if app.address_proof_document else None,
                }
            )

        return Response(
            {
                'totals': {
                    'users': total_users,
                    'customers': total_customers,
                    'collaborators': total_collaborators,
                    'staff': total_staff,
                    'new_users_week': new_users_week,
                    'new_collaborators_week': new_applications_week,
                    'pending_collaborators': total_pending,
                    'rejected_collaborators': total_rejected,
                },
                'users': users_payload,
                'collaborators': collaborator_payload,
                'recent_applications': [
                    item for item in collaborator_payload if item['status'] == CollaboratorApplication.Status.PENDING
                ][:10],
            }
        )


class CollaboratorDecisionView(APIView):
    permission_classes = [permissions.IsAdminUser]

    def post(self, request, pk):
        decision = request.data.get('action')
        if decision not in {'approve', 'reject'}:
            return Response({'detail': 'Accion invalida.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            application = CollaboratorApplication.objects.select_related('user', 'user__profile').get(pk=pk)
        except CollaboratorApplication.DoesNotExist:
            return Response({'detail': 'Solicitud no encontrada.'}, status=status.HTTP_404_NOT_FOUND)

        if decision == 'approve':
            application.status = CollaboratorApplication.Status.APPROVED
            application.save(update_fields=['status'])
            profile = getattr(application.user, 'profile', None)
            if profile:
                profile.role = 'collaborator'
                profile.save(update_fields=['role'])
        else:
            # On rejection, downgrade user role and remove the application so the
            # business (and its unique `place_id`) can be registered again.
            profile = getattr(application.user, 'profile', None)
            if profile and profile.role != 'customer':
                profile.role = 'customer'
                profile.save(update_fields=['role'])

            # Remove uploaded documents from storage (best-effort) and delete
            # the application. Related objects (Bathroom, AccessCode) will be
            # cascade-deleted by the ORM.
            try:
                if getattr(application, 'ine_document', None):
                    try:
                        application.ine_document.delete(save=False)
                    except Exception:
                        pass
                if getattr(application, 'address_proof_document', None):
                    try:
                        application.address_proof_document.delete(save=False)
                    except Exception:
                        pass
            except Exception:
                # guard against any attribute/access errors
                pass

            try:
                application.delete()
                status_val = 'deleted'
            except Exception:
                # if delete fails for any reason, mark as rejected as a fallback
                try:
                    application.status = CollaboratorApplication.Status.REJECTED
                    application.save(update_fields=['status'])
                    status_val = application.status
                except Exception:
                    status_val = 'error'

        return Response({'success': True, 'status': status_val})


def user_payload(user: User) -> dict:
    profile = getattr(user, 'profile', None)
    role_base = getattr(profile, 'role', None) or 'customer'
    role_effective = 'admin' if (user.is_staff or user.is_superuser) else role_base
    return {
        'id': user.id,
        'first_name': user.first_name,
        'last_name': user.last_name,
        'email': user.email,
        'phone_number': getattr(profile, 'phone_number', None),
        'role': role_base,
        'role_effective': role_effective,
        'is_staff': user.is_staff,
        'is_superuser': user.is_superuser,
    }


class PublicPlacesView(APIView):
    """Public endpoint to list approved collaborator places.
    Optional query params: lat, lng, radius_km (defaults to 5km).
    Returns compact list for map markers and cards.
    """
    permission_classes = []

    def get(self, request):
        # Only include applications that have an active bathroom
        qs = CollaboratorApplication.objects.select_related('user').filter(
            status=getattr(CollaboratorApplication.Status, 'APPROVED', 'approved'),
            bathroom__is_active=True,
        ).order_by('-created_at')

        lat_q = request.query_params.get('lat')
        lng_q = request.query_params.get('lng')
        radius_q = request.query_params.get('radius_km')

        results = []
        to_float = lambda v: float(v) if v is not None else None
        center_lat = to_float(lat_q)
        center_lng = to_float(lng_q)
        radius_km = to_float(radius_q) if radius_q else 5.0

        def haversine_km(lat1, lon1, lat2, lon2):
            from math import radians, sin, cos, sqrt, atan2
            r = 6371.0
            dlat = radians(lat2 - lat1)
            dlon = radians(lon2 - lon1)
            a = sin(dlat / 2) ** 2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon / 2) ** 2
            c = 2 * atan2(sqrt(a), sqrt(1 - a))
            return r * c

        for app in qs[:200]:
            lat = float(app.latitude)
            lng = float(app.longitude)
            distance_km = None
            if center_lat is not None and center_lng is not None:
                distance_km = haversine_km(center_lat, center_lng, lat, lng)
                if radius_km is not None and distance_km > radius_km:
                    continue
            results.append({
                'id': app.id,
                'business_name': app.business_name,
                'address': app.address,
                'lat': lat,
                'lng': lng,
                'rating': float(app.rating) if app.rating is not None else None,
                'review_count': app.review_count,
                'website': app.website,
                'business_phone': app.business_phone,
                'place_id': app.place_id,
                'photo_url': app.photo_url,
                'distance_km': round(distance_km, 3) if distance_km is not None else None,
            })

        return Response({'places': results})


class PublicPlaceDetailView(APIView):
    """Return a single approved collaborator place by id.
    Mirrors the fields returned in PublicPlacesView for consistency.
    """
    permission_classes = []

    def get(self, request, pk: int):
        try:
            app = CollaboratorApplication.objects.select_related('user').get(pk=pk, status=getattr(CollaboratorApplication.Status, 'APPROVED', 'approved'))
        except CollaboratorApplication.DoesNotExist:
            return Response({'detail': 'Lugar no encontrado.'}, status=status.HTTP_404_NOT_FOUND)

        lat = float(app.latitude)
        lng = float(app.longitude)
        payload = {
            'id': app.id,
            'business_name': app.business_name,
            'address': app.address,
            'lat': lat,
            'lng': lng,
            'rating': float(app.rating) if app.rating is not None else None,
            'review_count': app.review_count,
            'website': app.website,
            'business_phone': app.business_phone,
            'place_id': app.place_id,
            'photo_url': app.photo_url,
        }
        return Response({'place': payload})


class CollaboratorApplyView(APIView):
    """Allow an authenticated user to submit their business for collaborator review.
    This does NOT create a new user; it links the application to the current user.
    """
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def post(self, request):
        serializer = CollaboratorBusinessSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        application = serializer.save()
        return Response(
            {
                'message': 'Solicitud enviada. Te notificaremos cuando sea revisada.',
                'application_id': application.id,
                'status': application.status,
            },
            status=status.HTTP_201_CREATED
        )


class PartnerApplicationsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        apps = (
            CollaboratorApplication.objects.filter(user=request.user)
            .order_by('-created_at')
        )
        payload = []
        for app in apps:
            payload.append({
                'id': app.id,
                'business_name': app.business_name,
                'address': app.address,
                'lat': float(app.latitude),
                'lng': float(app.longitude),
                'status': app.status,
                'place_id': app.place_id,
                # consider a bathroom present only if it's active
                'has_bathroom': hasattr(app, 'bathroom') and getattr(getattr(app, 'bathroom', None), 'is_active', False),
            })
        return Response({'applications': payload})


class PartnerCreateBathroomView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, application_id: int):
        try:
            app = CollaboratorApplication.objects.get(id=application_id, user=request.user)
        except CollaboratorApplication.DoesNotExist:
            return Response({'detail': 'Solicitud no encontrada.'}, status=status.HTTP_404_NOT_FOUND)

        if app.status != CollaboratorApplication.Status.APPROVED:
            return Response({'detail': 'El negocio debe estar verificado antes de registrar un baño.'}, status=status.HTTP_400_BAD_REQUEST)
        # If an active bathroom exists, block creation
        if hasattr(app, 'bathroom') and getattr(app.bathroom, 'is_active', False):
            return Response({'detail': 'Este negocio ya tiene un baño registrado.'}, status=status.HTTP_400_BAD_REQUEST)

        # If a bathroom record exists but is inactive (for example previously rejected),
        # remove it so the partner can register again. This avoids OneToOne conflicts.
        if hasattr(app, 'bathroom') and not getattr(app.bathroom, 'is_active', False):
            try:
                app.bathroom.delete()
            except Exception:
                pass

        bathroom = Bathroom.objects.create(application=app, is_active=True)
        return Response({'bathroom': BathroomSerializer(bathroom).data}, status=status.HTTP_201_CREATED)


class IssueAccessCodeView(APIView):
    """Issue a temporary access code for a collaborator's application.
    Body: { application_id: int, ttl_minutes?: int, guest?: true }
    - If authenticated: only owner or staff may issue codes.
    - If unauthenticated: guest issuance allowed when `guest` is truthy (used for end-users requesting a code to show the business).
    """
    permission_classes = []

    def post(self, request):
        app_id = request.data.get('application_id')
        ttl = int(request.data.get('ttl_minutes') or 10)
        guest = bool(request.data.get('guest') or False)
        if not app_id:
            return Response({'detail': 'application_id is required.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            app = CollaboratorApplication.objects.get(pk=app_id)
        except CollaboratorApplication.DoesNotExist:
            return Response({'detail': 'Solicitud no encontrada.'}, status=status.HTTP_404_NOT_FOUND)

        # Authenticated users: must be owner or staff
        if request.user and request.user.is_authenticated:
            if not (request.user.is_staff or app.user_id == request.user.id):
                return Response({'detail': 'No autorizado.'}, status=status.HTTP_403_FORBIDDEN)
            creator = request.user
        else:
            # Unauthenticated: only allow when explicitly requested as guest issuance
            if not guest:
                return Response({'detail': 'Autenticacion requerida.'}, status=status.HTTP_401_UNAUTHORIZED)
            creator = None

        from django.utils import timezone
        import random
        import uuid
        import hashlib
        import hmac
        code = str(random.randint(100000, 999999))
        token = uuid.uuid4().hex
        expires_at = timezone.now() + timezone.timedelta(minutes=ttl)

        # Allow optional user id (from authenticated user or client) to be associated with the code
        supplied_user_id = request.data.get('user_id') or None
        user_id_val = None
        try:
            if request.user and request.user.is_authenticated:
                user_id_val = request.user.id
            elif supplied_user_id is not None:
                user_id_val = int(supplied_user_id)
        except Exception:
            user_id_val = None

        # Hash the token before storing. Use HMAC with secret.
        secret = getattr(settings, 'ACCESS_TOKEN_SECRET', None) or getattr(settings, 'SECRET_KEY')
        token_hash = hmac.new(key=secret.encode('utf-8'), msg=token.encode('utf-8'), digestmod=hashlib.sha256).hexdigest()

        # Simple rate-limiting / cooldown to avoid abuse: per-IP per-application
        ip = request.META.get('HTTP_X_FORWARDED_FOR', request.META.get('REMOTE_ADDR', 'unknown')).split(',')[0].strip()
        cooldown_ttl = 30 if request.user and request.user.is_authenticated else 60
        cache_key = f'issue_cd:{ip}:{app.id}'
        if cache.get(cache_key):
            return Response({'detail': 'Demasiadas solicitudes. Intenta nuevamente en unos segundos.'}, status=status.HTTP_429_TOO_MANY_REQUESTS)
        cache.set(cache_key, '1', timeout=cooldown_ttl)

        ac = AccessCode.objects.create(
            application=app,
            code=code,
            token_hash=token_hash,
            user_id=user_id_val,
            created_by=creator,
            expires_at=expires_at,
        )

        # Provide a structured payload that the frontend can directly embed in a QR
        issued_at = timezone.now().isoformat()
        payload_obj = {
            'application_id': app.id,
            'user_id': user_id_val,
            'token': token,
            'code': ac.code,
            'issued_at': issued_at,
            'expires_at': ac.expires_at.isoformat() if ac.expires_at else None,
        }
        # Also include a compact `text` for older clients (stringified JSON)
        import json
        # Return plaintext token to the caller (frontend) so it can be embedded in the QR.
        return Response({
            'code': ac.code,
            'token': token,
            'expires_at': ac.expires_at,
            'application_id': app.id,
            'text': json.dumps(payload_obj),
            'payload': payload_obj,
        }, status=status.HTTP_201_CREATED)


class VerifyAccessCodeView(APIView):
    """Verify a code for a given application. Marks it used when valid.
    Body: { application_id: int, code: str }
    """
    permission_classes = []

    def post(self, request):
        app_id = request.data.get('application_id')
        code = (request.data.get('code') or '').strip()
        token = (request.data.get('token') or '').strip()
        user_id_supplied = request.data.get('user_id')
        if not app_id or (not code and not token):
            return Response({'detail': 'application_id and (code or token) are required.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            app = CollaboratorApplication.objects.get(pk=app_id, status=getattr(CollaboratorApplication.Status, 'APPROVED', 'approved'))
        except CollaboratorApplication.DoesNotExist:
            return Response({'detail': 'Lugar no encontrado.'}, status=status.HTTP_404_NOT_FOUND)

        from django.utils import timezone
        now = timezone.now()
        # find by token first (preferred), otherwise by code
        ac = None
        try:
            # Prefer token verification using token_hash
            # Use a transaction and row lock to prevent race conditions marking the same code used
            with transaction.atomic():
                if token:
                    import hashlib, hmac as _hmac
                    token_h = _hmac.new(key=secret.encode('utf-8'), msg=token.encode('utf-8'), digestmod=hashlib.sha256).hexdigest()
                    ac = AccessCode.objects.select_for_update().filter(application=app, token_hash=token_h).order_by('-created_at').first()
                # Fallback: code matching (less secure)
                if not ac and code:
                    ac = AccessCode.objects.select_for_update().filter(application=app, code=code).order_by('-created_at').first()
        except Exception:
            ac = None

        if not ac:
            return Response({'ok': False, 'detail': 'Codigo invalido o ya usado.'}, status=status.HTTP_400_BAD_REQUEST)

        if ac.used:
            return Response({'ok': False, 'detail': 'Codigo ya usado.'}, status=status.HTTP_400_BAD_REQUEST)

        if ac.expires_at and ac.expires_at < now:
            return Response({'ok': False, 'detail': 'Codigo expirado.'}, status=status.HTTP_400_BAD_REQUEST)
        # If the code is tied to a specific user, ensure provided user_id (from QR) matches
        try:
            if ac.user_id is not None and user_id_supplied is not None:
                if str(ac.user_id) != str(user_id_supplied):
                    return Response({'ok': False, 'detail': 'Usuario no coincide con el pase.'}, status=status.HTTP_400_BAD_REQUEST)
        except Exception:
            pass

        # Mark used and record who validated it (if authenticated)
        with transaction.atomic():
            # refresh/lock the row again to be safe
            ac = AccessCode.objects.select_for_update().get(pk=ac.pk)
            if ac.used:
                return Response({'ok': False, 'detail': 'Codigo ya usado.'}, status=status.HTTP_400_BAD_REQUEST)
            ac.used = True
            if request.user and request.user.is_authenticated:
                ac.used_by = request.user
            ac.used_at = now
            ac.save(update_fields=['used', 'used_by', 'used_at'])

        return Response({'ok': True, 'place': {
            'id': app.id,
            'business_name': app.business_name,
            'address': app.address,
        }})

