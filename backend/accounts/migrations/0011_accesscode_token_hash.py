"""Add token_hash to AccessCode to avoid storing plaintext token.

Revision ID: 0011_accesscode_token_hash
Revises: 0010_accesscode_token_fields
Create Date: 2025-12-01 00:05
"""
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0010_accesscode_token_fields'),
    ]

    operations = [
        migrations.AddField(
            model_name='accesscode',
            name='token_hash',
            field=models.CharField(max_length=128, null=True, blank=True, db_index=True),
        ),
    ]
