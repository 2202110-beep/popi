"""Remove plaintext token field from AccessCode.

Revision ID: 0012_remove_token_field
Revises: 0011_accesscode_token_hash
Create Date: 2025-12-01 00:20
"""
from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0011_accesscode_token_hash'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='accesscode',
            name='token',
        ),
    ]
