import json
import sys
import urllib.request
import urllib.parse
import http.cookiejar

BASE = 'http://127.0.0.1:8000'

cj = http.cookiejar.CookieJar()
opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))

def req(method, path, data=None, headers=None):
    url = BASE + path
    if data is not None and not isinstance(data, (bytes, bytearray)):
        data = json.dumps(data).encode('utf-8')
    req = urllib.request.Request(url, data=data, method=method)
    req.add_header('Accept', 'application/json')
    if data is not None:
        req.add_header('Content-Type', 'application/json')
        # Add CSRF header from cookie if present
        for c in cj:
            if c.name == 'csrftoken':
                req.add_header('X-CSRFToken', c.value)
                break
    if headers:
        for k, v in headers.items():
            req.add_header(k, v)
    try:
        with opener.open(req, timeout=10) as resp:
            body = resp.read().decode('utf-8')
            try:
                data = json.loads(body)
            except Exception:
                data = body
            return resp.getcode(), data
    except urllib.error.HTTPError as e:
        body = e.read().decode('utf-8')
        try:
            data = json.loads(body)
        except Exception:
            data = body
        return e.getcode(), data

# 1) CSRF
code, data = req('GET', '/api/auth/csrf/')
print('CSRF', code, data)

# 2) Try login (should fail initially)
email = 'copilot_test@local.test'
password = 'Aaa11122'
code, data = req('POST', '/api/auth/login/', { 'email': email, 'password': password })
print('LOGIN (before register)', code, data)

# 3) Register user
payload = {
    'first_name': 'Test', 'last_name': 'User', 'phone_number': '5551234567',
    'email': email, 'password': password, 'password_confirmation': password
}
code, data = req('POST', '/api/auth/register/', payload)
print('REGISTER', code, data)

# 4) Login again
code, data = req('POST', '/api/auth/login/', { 'email': email, 'password': password })
print('LOGIN', code, data)

# 5) Me
code, data = req('GET', '/api/auth/me/')
print('ME', code, data)
