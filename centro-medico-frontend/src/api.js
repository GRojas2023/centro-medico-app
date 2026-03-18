const API_URL = process.env.REACT_APP_API_URL || "http://127.0.0.1:8000";

// Helper para obtener headers con token
const getHeaders = (contentType = "application/json") => {
    const token = localStorage.getItem("token");
    const headers = {};
    if (contentType) headers["Content-Type"] = contentType;
    if (token) headers["Authorization"] = `Bearer ${token}`;
    return headers;
};

// --- AUTH ---
export const loginUser = async (email, password) => {
    const details = { username: email, password: password };
    const formBody = Object.keys(details)
        .map((key) => encodeURIComponent(key) + "=" + encodeURIComponent(details[key]))
        .join("&");

    const response = await fetch(`${API_URL}/token`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: formBody,
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Error al iniciar sesión");
    }

    return response.json(); // { access_token, token_type }
};

export const registerUser = async (patientData) => {
    // patientData debe incluir { email, password, role }
    const response = await fetch(`${API_URL}/users/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patientData),
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Error al registrarse");
    }

    return response.json();
};

export const fetchCurrentUser = async () => {
    const response = await fetch(`${API_URL}/users/me/`, {
        headers: getHeaders(),
    });
    if (!response.ok) throw new Error("Sesión inválida");
    return response.json();
};

export const updateMedicProfile = async (profileData) => {
    const response = await fetch(`${API_URL}/users/me/medic-profile`, {
        method: "PATCH",
        headers: getHeaders(),
        body: JSON.stringify(profileData),
    });
    if (!response.ok) throw new Error("Error actualizando mi perfil médico");
    return response.json();
};

export const getMyAppointments = async () => {
    const response = await fetch(`${API_URL}/appointments/me`, {
        headers: getHeaders(),
    });
    if (!response.ok) throw new Error("Error obteniendo mis turnos");
    return response.json();
};

export const updateAppointmentStatus = async (id, status) => {
    const response = await fetch(`${API_URL}/appointments/${id}/status`, {
        method: "PATCH",
        headers: getHeaders(),
        body: JSON.stringify({ status }),
    });
    if (!response.ok) throw new Error("Error actualizando turno");
    return response.json();
};

// --- ADMIN ---
export const uploadImage = async (file) => {
    const formData = new FormData();
    formData.append("file", file);

    const token = localStorage.getItem("token"); // Manually get token for FormData
    const response = await fetch(`${API_URL}/users/upload/image`, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${token}`
            // Content-Type is auto-set by browser for FormData
        },
        body: formData,
    });

    if (!response.ok) throw new Error("Error subiendo imagen");
    return response.json(); // { url: ... }
};

export const adminUpdateMedicProfile = async (medicId, profileData) => {
    const response = await fetch(`${API_URL}/users/medic/${medicId}/profile`, {
        method: "PATCH",
        headers: getHeaders(),
        body: JSON.stringify(profileData),
    });
    if (!response.ok) throw new Error("Error actualizando perfil médico");
    return response.json();
};

export const adminUpdatePharmacyProfile = async (pharmacyId, profileData) => {
    const response = await fetch(`${API_URL}/users/pharmacy/${pharmacyId}/profile`, {
        method: "PATCH",
        headers: getHeaders(),
        body: JSON.stringify(profileData),
    });
    if (!response.ok) throw new Error("Error actualizando perfil de farmacia");
    return response.json();
};


export const adminGetUsers = async (role) => {
    let url = `${API_URL}/users/`;
    if (role) url += `?role=${role}`;
    const response = await fetch(url, { headers: getHeaders() });
    return response.json();
};

export const adminCreateUser = async (userData) => {
    const response = await fetch(`${API_URL}/users/`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(userData),
    });
    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || "Error creando usuario");
    }
    return response.json();
};

export const adminDeleteUser = async (id) => {
    const response = await fetch(`${API_URL}/users/${id}`, {
        method: "DELETE",
        headers: getHeaders(),
    });
    if (!response.ok) throw new Error("Error eliminando usuario");
    return response.json();
};

// --- FEED ---
export const getFeed = async () => {
    const response = await fetch(`${API_URL}/feed/`, {
        headers: getHeaders(),
    });
    if (!response.ok) throw new Error("Error cargando el feed");
    return response.json();
};

export const adminCreatePost = async (postData) => {
    const response = await fetch(`${API_URL}/feed/`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(postData),
    });
    if (!response.ok) {
        throw new Error("Error creando publicación");
    }
    return response.json();
};


// --- PHARMACIES ---
export const getPharmaciesOnDuty = async (locationId = 1) => {
    // Por defecto location 1 (Salta)
    const response = await fetch(`${API_URL}/pharmacies/duty?location_id=${locationId}`, {
        headers: getHeaders(),
    });
    if (!response.ok) throw new Error("Error cargando farmacias");
    return response.json();
};

// --- AI ---
export const getAIRecommendation = async (prompt) => {
    const response = await fetch(`${API_URL}/ai/recommend`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ prompt }),
    });
    if (!response.ok) throw new Error("Error consultando a la IA");
    return response.json();
};

// --- APPOINTMENTS ---
export const getMedics = async () => {
    const response = await fetch(`${API_URL}/appointments/medics`, {
        headers: getHeaders(),
    });
    if (!response.ok) throw new Error("Error obteniendo médicos");
    return response.json();
};

export const createAppointment = async (medic_id, datetime, symptoms, patient_data = null) => {
    const body = {
        medic_id,
        datetime,
        symptoms
    };
    if (patient_data) body.patient_data = patient_data;

    const response = await fetch(`${API_URL}/appointments/`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || "Error creando el turno");
    }
    return response.json();
};

export const lookupPatientByDni = async (dni) => {
    const response = await fetch(`${API_URL}/users/patient-lookup?dni=${dni}`, {
        headers: getHeaders(),
    });
    if (response.status === 404) return null;
    if (!response.ok) throw new Error("Error buscando paciente");
    return response.json();
};

export const getMedicAppointments = async (medic_id) => {
    const response = await fetch(`${API_URL}/appointments/medic/${medic_id}/slots`, {
        headers: getHeaders(),
    });
    if (!response.ok) throw new Error("Error obteniendo turnos del médico");
    return response.json();
};

