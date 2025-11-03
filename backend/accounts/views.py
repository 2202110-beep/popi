from datetime import timedelta

from django.contrib.auth import authenticate, login
from django.contrib.auth.models import User
from django.utils import timezone
from rest_framework import permissions, status
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.middleware.csrf import get_token
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import CollaboratorApplication, UserProfile, Bathroom
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
            application.status = CollaboratorApplication.Status.REJECTED
            application.save(update_fields=['status'])
            profile = getattr(application.user, 'profile', None)
            if profile and profile.role != 'customer':
                profile.role = 'customer'
                profile.save(update_fields=['role'])

        return Response({'success': True, 'status': application.status})


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
        qs = CollaboratorApplication.objects.select_related('user').filter(
            status=getattr(CollaboratorApplication.Status, 'APPROVED', 'approved'),
            bathroom__isnull=False,
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
                'has_bathroom': hasattr(app, 'bathroom'),
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

        if hasattr(app, 'bathroom'):
            return Response({'detail': 'Este negocio ya tiene un baño registrado.'}, status=status.HTTP_400_BAD_REQUEST)

        bathroom = Bathroom.objects.create(application=app, is_active=True)
        return Response({'bathroom': BathroomSerializer(bathroom).data}, status=status.HTTP_201_CREATED)

