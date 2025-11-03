# Generated manually to fix address_proof_text field

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0005_alter_collaboratorapplication_address_proof_text'),
    ]

    operations = [
        migrations.RunSQL(
            sql='ALTER TABLE accounts_collaboratorapplication ALTER COLUMN address_proof_text TYPE text;',
            reverse_sql='ALTER TABLE accounts_collaboratorapplication ALTER COLUMN address_proof_text TYPE varchar(200);',
        ),
    ]
