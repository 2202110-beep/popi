from django.conf import settings
from django.db import models


class UserProfile(models.Model):
    ROLE_CHOICES = [
        ('customer', 'Customer'),
        ('collaborator', 'Collaborator'),
    ]

    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='profile')
    phone_number = models.CharField(max_length=20, unique=True)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='customer')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.get_full_name()} ({self.phone_number})"


class CollaboratorApplication(models.Model):
    class Status(models.TextChoices):
        PENDING = 'pending', 'Pendiente'
        APPROVED = 'approved', 'Aprobada'
        REJECTED = 'rejected', 'Rechazada'

    # Allow multiple business applications per user
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='collaborator_applications')
    business_name = models.CharField(max_length=255)
    address = models.TextField()
    latitude = models.DecimalField(max_digits=9, decimal_places=6)
    longitude = models.DecimalField(max_digits=9, decimal_places=6)
    business_phone = models.CharField(max_length=30, blank=True)
    # Some providers (Google Photos) can produce very long URLs; use TextField
    website = models.TextField(blank=True)
    schedule = models.TextField(blank=True)
    rating = models.DecimalField(max_digits=3, decimal_places=2, null=True, blank=True)
    review_count = models.PositiveIntegerField(default=0)
    photo_url = models.TextField(blank=True)
    place_types = models.TextField(blank=True)
    place_id = models.CharField(max_length=128, unique=True)
    address_proof_text = models.TextField(blank=True)
    ine_document = models.FileField(upload_to='collaborators/ine/')
    address_proof_document = models.FileField(upload_to='collaborators/address_proof/')
    coverage_valid = models.BooleanField(default=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.business_name} ({self.place_id})"


class Bathroom(models.Model):
    """Represents a single bathroom associated with a verified business application.
    Each business can have only one bathroom.
    """
    application = models.OneToOneField(CollaboratorApplication, on_delete=models.CASCADE, related_name='bathroom')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Bathroom for {self.application.business_name}"
