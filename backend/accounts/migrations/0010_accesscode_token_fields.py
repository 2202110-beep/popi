"""Add token and user/usage fields to AccessCode

Revision ID: 0010_accesscode_token_fields
Revises: 0009_accesscode
Create Date: 2025-12-01 00:00
"""
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0009_accesscode'),
    ]

    operations = [
        migrations.AddField(
            model_name='accesscode',
            name='token',
            field=models.CharField(max_length=64, null=True, blank=True, db_index=True, unique=True),
        ),
        migrations.AddField(
            model_name='accesscode',
            name='user_id',
            field=models.BigIntegerField(null=True, blank=True),
        ),
        migrations.AddField(
            model_name='accesscode',
            name='used_by',
            field=models.ForeignKey(null=True, blank=True, on_delete=models.SET_NULL, related_name='used_access_codes', to='auth.user'),
        ),
        migrations.AddField(
            model_name='accesscode',
            name='used_at',
            field=models.DateTimeField(null=True, blank=True),
        ),
    ]
