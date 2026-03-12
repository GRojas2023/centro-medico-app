import reflex as rx
app = rx.App()
print(f"App dir: {dir(app)}")
try:
    print(f"Has api? {'api' in dir(app)}")
    if hasattr(app, 'api'):
        print(f"API Type: {type(app.api)}")
except Exception as e:
    print(f"Error checking api: {e}")
