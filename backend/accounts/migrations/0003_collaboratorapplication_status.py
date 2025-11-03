from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0002_userprofile_role_collaboratorapplication'),
    ]

    operations = [
        migrations.AddField(
            model_name='collaboratorapplication',
            name='status',
            field=models.CharField(
                choices=[
                    ('pending', 'Pendiente'),
                    ('approved', 'Aprobada'),
                    ('rejected', 'Rechazada'),
                ],
                default='pending',
                max_length=20,
            ),
        ),
    ]


