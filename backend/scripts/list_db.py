#!/usr/bin/env python
import os
import sys
import json

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'popi_backend.settings')

try:
    import django
    django.setup()
except Exception as e:
    print('Django setup failed:', e, file=sys.stderr)
    sys.exit(1)

from django.conf import settings
from django.db import connection

print('DATABASE CONFIG:')
print(json.dumps(settings.DATABASES.get('default', {}), default=str, indent=2))

intros = connection.introspection
try:
    tables = intros.table_names()
except Exception:
    with connection.cursor() as c:
        try:
            c.execute("SELECT table_name FROM information_schema.tables WHERE table_schema='public';")
            tables = [r[0] for r in c.fetchall()]
        except Exception:
            c.execute("SELECT name FROM sqlite_master WHERE type='table';")
            tables = [r[0] for r in c.fetchall()]

print('\nFound %d tables' % len(tables))

# Show all tables (limited)
for i, t in enumerate(tables[:200], 1):
    print(f"{i:03d}: {t}")

# For a few key tables, show columns and up to 5 rows
sample_tables = [
    'accounts_collaboratorapplication',
    'accounts_userprofile',
    'accounts_bathroom',
    'accounts_accesscode',
    'auth_user',
    'django_migrations',
    'django_session',
]

present = [t for t in sample_tables if t in tables]

if not present:
    print('\nNo target tables found among sample list. Showing first 5 tables with samples:')
    present = tables[:5]

with connection.cursor() as c:
    for t in present:
        print(f"\n--- TABLE: {t} ---")
        try:
            c.execute(f'SELECT * FROM "{t}" LIMIT 5')
            rows = c.fetchall()
            cols = [d[0] for d in c.description] if c.description else []
            print('COLUMNS:', cols)
            if rows:
                for r in rows:
                    out = {}
                    for col, val in zip(cols, r):
                        try:
                            out[col] = None if val is None else str(val)
                        except Exception:
                            out[col] = repr(val)
                    print(json.dumps(out, ensure_ascii=False))
            else:
                print('(no rows)')
        except Exception as e:
            print('  Could not query table', t, 'error:', e)

print('\nDone.')
