# Centro Médico con FastAPI y React

## Cómo iniciar el Proyecto

### 1. Iniciar el Backend (FastAPI)
Abre una terminal en la carpeta raíz del proyecto y ejecuta:

```powershell
# Activar entorno virtual (si no está activo)
.\.venv\Scripts\Activate.ps1

# Iniciar servidor
python -m uvicorn app.main:app --reload
```
El backend estará disponible en `http://127.0.0.1:8000`.
Documentación API: `http://127.0.0.1:8000/docs`

### 2. Iniciar el Frontend (React)
Abre **otra terminal nueva**, navega a la carpeta del frontend y ejecuta:

```powershell
cd centro-medico-frontend
npm start
```
El frontend se abrirá automáticamente en `http://localhost:3000`.

### Usuarios de Prueba (Seed Data)
- **Admin**: `admin@saltasalud.com` / `admin123`
- **Médico**: `dr.lopez@saltasalud.com` / `medico123`
- **Paciente**: `juan.perez@gmail.com` / `paciente123`
