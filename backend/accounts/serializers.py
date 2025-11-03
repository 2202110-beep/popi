from django.contrib.auth.models import User
from django.db import transaction
from rest_framework import serializers

from .models import UserProfile, CollaboratorApplication, Bathroom


class RegisterSerializer(serializers.Serializer):
    first_name = serializers.CharField(max_length=150)
    last_name = serializers.CharField(max_length=150)
    phone_number = serializers.CharField(max_length=20)
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=8)
    password_confirmation = serializers.CharField(write_only=True, min_length=8)

    def validate_email(self, value):
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError('Este correo ya esta registrado.')
        return value

    def validate_phone_number(self, value):
        if not value.isdigit():
            raise serializers.ValidationError('El numero telefonico debe contener solo digitos.')
        if UserProfile.objects.filter(phone_number=value).exists():
            raise serializers.ValidationError('Este numero telefonico ya esta registrado.')
        return value

    def validate(self, attrs):
        if attrs['password'] != attrs['password_confirmation']:
            raise serializers.ValidationError({'password_confirmation': 'Las contrasenas no coinciden.'})
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        password = validated_data.pop('password')
        validated_data.pop('password_confirmation')
        phone_number = validated_data.pop('phone_number')
        email = validated_data['email']

        user = User.objects.create_user(
            username=email,
            email=email,
            first_name=validated_data['first_name'],
            last_name=validated_data['last_name'],
            password=password
        )
        UserProfile.objects.create(user=user, phone_number=phone_number, role='customer')
        return user


class CollaboratorApplicationSerializer(serializers.Serializer):
    # personal data
    first_name = serializers.CharField(max_length=150)
    last_name = serializers.CharField(max_length=150)
    phone_number = serializers.CharField(max_length=20)
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=8)
    password_confirmation = serializers.CharField(write_only=True, min_length=8)

    # business data
    business_name = serializers.CharField(max_length=255)
    address = serializers.CharField()
    proof_address = serializers.CharField(write_only=True)
    latitude = serializers.DecimalField(max_digits=9, decimal_places=6)
    longitude = serializers.DecimalField(max_digits=9, decimal_places=6)
    business_phone = serializers.CharField(max_length=30, required=False, allow_blank=True)
    website = serializers.URLField(required=False, allow_blank=True)
    schedule = serializers.CharField(required=False, allow_blank=True)
    rating = serializers.DecimalField(max_digits=3, decimal_places=2, required=False, allow_null=True)
    review_count = serializers.IntegerField(required=False, min_value=0, default=0)
    photo_url = serializers.URLField(required=False, allow_blank=True)
    place_types = serializers.CharField(required=False, allow_blank=True)
    place_id = serializers.CharField(max_length=128)
    ine_document = serializers.FileField()
    address_proof_document = serializers.FileField()

    def validate_phone_number(self, value):
        if not value.isdigit():
            raise serializers.ValidationError('El numero telefonico debe contener solo digitos.')
        if UserProfile.objects.filter(phone_number=value).exists():
            raise serializers.ValidationError('Este numero telefonico ya esta registrado.')
        return value

    def validate_email(self, value):
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError('Este correo ya esta registrado.')
        return value

    def validate(self, attrs):
        if attrs['password'] != attrs['password_confirmation']:
            raise serializers.ValidationError({'password_confirmation': 'Las contrasenas no coinciden.'})

        address_text = attrs['address'].strip().lower()
        proof_text = attrs['proof_address'].strip().lower()
        if address_text != proof_text:
            raise serializers.ValidationError({'proof_address': 'La direccion del comprobante debe coincidir con la seleccionada.'})

        # Coverage validation: simple example, ensure within ~30km radius of Guadalajara center (lat 20.6597, lon -103.3496)
        center_lat = 20.6597
        center_lon = -103.3496
        lat = float(attrs['latitude'])
        lon = float(attrs['longitude'])

        from math import radians, sin, cos, sqrt, atan2

        r = 6371
        dlat = radians(lat - center_lat)
        dlon = radians(lon - center_lon)
        a = sin(dlat / 2) ** 2 + cos(radians(center_lat)) * cos(radians(lat)) * sin(dlon / 2) ** 2
        c = 2 * atan2(sqrt(a), sqrt(1 - a))
        distance = r * c
        if distance > 30:
            raise serializers.ValidationError({'latitude': 'Fuera del area de cobertura (30km de Guadalajara).'})
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        password = validated_data.pop('password')
        validated_data.pop('password_confirmation')
        proof_address = validated_data.pop('proof_address')
        ine_document = validated_data.pop('ine_document')
        address_proof_document = validated_data.pop('address_proof_document')
        business_name = validated_data.pop('business_name')
        address = validated_data.pop('address')
        latitude = validated_data.pop('latitude')
        longitude = validated_data.pop('longitude')
        business_phone = validated_data.pop('business_phone', '')
        website = validated_data.pop('website', '')
        schedule = validated_data.pop('schedule', '')
        rating = validated_data.pop('rating', None)
        review_count = validated_data.pop('review_count', 0)
        photo_url = validated_data.pop('photo_url', '')
        place_types = validated_data.pop('place_types', '')
        place_id = validated_data.pop('place_id')

        email = validated_data['email']

        user = User.objects.create_user(
            username=email,
            email=email,
            first_name=validated_data['first_name'],
            last_name=validated_data['last_name'],
            password=password
        )
        profile = UserProfile.objects.create(
            user=user,
            phone_number=validated_data['phone_number'],
            role='customer'
        )

        CollaboratorApplication.objects.create(
            user=user,
            business_name=business_name,
            address=address,
            latitude=latitude,
            longitude=longitude,
            business_phone=business_phone,
            website=website,
            schedule=schedule,
            rating=rating,
            review_count=review_count or 0,
            photo_url=photo_url,
            place_types=place_types,
            place_id=place_id,
            address_proof_text=proof_address,
            ine_document=ine_document,
            address_proof_document=address_proof_document,
            coverage_valid=True,
            status=CollaboratorApplication.Status.PENDING,
        )
        return profile.user


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)


class CollaboratorBusinessSerializer(serializers.Serializer):
    """Serializer for authenticated users to submit a collaborator application
    without creating a new user. Contains only business fields and files.
    """
    # business data
    business_name = serializers.CharField(max_length=255)
    address = serializers.CharField()
    address_proof_text = serializers.CharField(required=False, allow_blank=True, write_only=True)
    latitude = serializers.DecimalField(max_digits=9, decimal_places=6)
    longitude = serializers.DecimalField(max_digits=9, decimal_places=6)
    business_phone = serializers.CharField(max_length=30, required=False, allow_blank=True)
    website = serializers.URLField(required=False, allow_blank=True)
    schedule = serializers.CharField(required=False, allow_blank=True)
    rating = serializers.DecimalField(max_digits=3, decimal_places=2, required=False, allow_null=True)
    review_count = serializers.IntegerField(required=False, min_value=0, default=0)
    photo_url = serializers.URLField(required=False, allow_blank=True)
    place_types = serializers.CharField(required=False, allow_blank=True)
    place_id = serializers.CharField(max_length=128)
    ine_document = serializers.FileField()
    address_proof_document = serializers.FileField()

    def validate(self, attrs):
        # Use address as proof_address if not provided
        if not attrs.get('address_proof_text'):
            attrs['address_proof_text'] = attrs['address']

        # Ensure place_id unique across applications
        if CollaboratorApplication.objects.filter(place_id=attrs['place_id']).exists():
            raise serializers.ValidationError({
                'place_id': 'Este negocio ya fue registrado. Si eres el dueño y no puedes acceder, contacta a soporte.'
            })

        # Coverage validation ~50km from Guadalajara center (expanded for flexibility)
        center_lat = 20.6597
        center_lon = -103.3496
        lat = float(attrs['latitude'])
        lon = float(attrs['longitude'])
        from math import radians, sin, cos, sqrt, atan2
        r = 6371
        dlat = radians(lat - center_lat)
        dlon = radians(lon - center_lon)
        a = sin(dlat / 2) ** 2 + cos(radians(center_lat)) * cos(radians(lat)) * sin(dlon / 2) ** 2
        c = 2 * atan2(sqrt(a), sqrt(1 - a))
        distance = r * c
        if distance > 50:
            raise serializers.ValidationError({
                'address': f'El negocio esta a {distance:.1f}km de Guadalajara. Actualmente solo cubrimos hasta 50km.'
            })
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        user = self.context['request'].user
        address_proof_text = validated_data.pop('address_proof_text')
        ine_document = validated_data.pop('ine_document')
        address_proof_document = validated_data.pop('address_proof_document')

        application = CollaboratorApplication.objects.create(
            user=user,
            address_proof_text=address_proof_text,
            ine_document=ine_document,
            address_proof_document=address_proof_document,
            coverage_valid=True,
            status=CollaboratorApplication.Status.PENDING,
            **validated_data,
        )
        return application


class BathroomSerializer(serializers.ModelSerializer):
    class Meta:
        model = Bathroom
        fields = ['id', 'is_active', 'created_at']
        read_only_fields = ['id', 'created_at']

