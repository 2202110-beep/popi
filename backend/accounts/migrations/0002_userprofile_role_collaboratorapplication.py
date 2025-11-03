from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='userprofile',
            name='role',
            field=models.CharField(choices=[('customer', 'Customer'), ('collaborator', 'Collaborator')], default='customer', max_length=20),
        ),
        migrations.CreateModel(
            name='CollaboratorApplication',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('business_name', models.CharField(max_length=255)),
                ('address', models.TextField()),
                ('latitude', models.DecimalField(decimal_places=6, max_digits=9)),
                ('longitude', models.DecimalField(decimal_places=6, max_digits=9)),
                ('business_phone', models.CharField(blank=True, max_length=30)),
                ('website', models.URLField(blank=True)),
                ('schedule', models.TextField(blank=True)),
                ('rating', models.DecimalField(blank=True, decimal_places=2, max_digits=3, null=True)),
                ('review_count', models.PositiveIntegerField(default=0)),
                ('photo_url', models.URLField(blank=True)),
                ('place_types', models.TextField(blank=True)),
                ('place_id', models.CharField(max_length=128, unique=True)),
                ('address_proof_text', models.CharField(max_length=255)),
                ('ine_document', models.FileField(upload_to='collaborators/ine/')),
                ('address_proof_document', models.FileField(upload_to='collaborators/address_proof/')),
                ('coverage_valid', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('user', models.OneToOneField(on_delete=models.deletion.CASCADE, related_name='collaborator_application', to=settings.AUTH_USER_MODEL)),
            ],
            options={'ordering': ['-created_at']},
        ),
    ]

