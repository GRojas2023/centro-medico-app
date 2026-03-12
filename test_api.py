import requests

# Configuración
BASE_URL = "http://127.0.0.1:8000"
USERNAME = "admin@saltasalud.com"
PASSWORD = "admin123"

def test_api():
    print(f"--- Probando API en {BASE_URL} ---")

    # 1. Login
    print("\n1. Intentando Login...")
    login_url = f"{BASE_URL}/auth/login"
    payload = {
        "username": USERNAME,
        "password": PASSWORD
    }
    try:
        response = requests.post(login_url, data=payload)
        response.raise_for_status()
        token_data = response.json()
        token = token_data["access_token"]
        print(f"✅ Login Exitoso! Token obtenido.")
    except Exception as e:
        print(f"❌ Error en Login: {e}")
        return

    # 2. Probar Endpoint Protegido (Farmacias)
    print("\n2. Consultando Farmacias de Turno (Salta)...")
    pharmacy_url = f"{BASE_URL}/pharmacies/duty"
    headers = {"Authorization": f"Bearer {token}"}
    params = {"location_id": 1}

    try:
        response = requests.get(pharmacy_url, headers=headers, params=params)
        response.raise_for_status()
        pharmacies = response.json()
        print(f"✅ Consulta Exitosa! Se encontraron {len(pharmacies)} farmacias de turno.")
        for p in pharmacies:
            print(f"   💊 Farmacia: {p.get('address')} - Tel: {p.get('phone')}")
    except Exception as e:
        print(f"❌ Error consultando farmacias: {e}")

    # 3. Probar Endpoint Feed
    print("\n3. Consultando el Feed...")
    feed_url = f"{BASE_URL}/feed/"
    try:
        response = requests.get(feed_url, headers=headers)
        response.raise_for_status()
        posts = response.json()
        print(f"✅ Feed Exitoso! Se encontraron {len(posts)} publicaciones.")
        if posts:
            print(f"   📢 Último post: {posts[0].get('content')}")
    except Exception as e:
        print(f"❌ Error consultando feed: {e}")

if __name__ == "__main__":
    test_api()
