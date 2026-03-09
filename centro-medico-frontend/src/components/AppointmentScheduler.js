import React, { useState, useEffect } from 'react';
import { getMedics, createAppointment, getMedicAppointments } from '../api';
import { Calendar, User, Clock, CheckCircle, ChevronRight, ChevronLeft, MapPin, Search } from 'lucide-react';

export default function AppointmentScheduler({ onSuccess }) {
    const [step, setStep] = useState(1);
    const [medics, setMedics] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    // Selections
    const [selectedSpecialty, setSelectedSpecialty] = useState(null);
    const [selectedMedic, setSelectedMedic] = useState(null);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [selectedTime, setSelectedTime] = useState(null);
    const [symptoms, setSymptoms] = useState('');

    // Cached Data
    const [medicAppointments, setMedicAppointments] = useState([]);
    const [availableSlots, setAvailableSlots] = useState([]);

    useEffect(() => {
        loadMedics();
    }, []);

    const loadMedics = async () => {
        try {
            const data = await getMedics();
            setMedics(data);
        } catch (err) {
            setError("No se pudieron cargar los médicos.");
        } finally {
            setLoading(false);
        }
    };

    // When a medic is selected, load existing appointments
    useEffect(() => {
        if (selectedMedic) {
            loadMedicAppointments(selectedMedic.id);
        }
    }, [selectedMedic]);

    // When date or appointments change, calculate slots
    useEffect(() => {
        if (selectedMedic && selectedDate) {
            generateSlots();
        }
    }, [selectedDate, medicAppointments, selectedMedic]);

    const loadMedicAppointments = async (medicId) => {
        try {
            const apps = await getMedicAppointments(medicId); // Returns array of reservations
            setMedicAppointments(apps);
        } catch (err) {
            console.error("Error loading appointments:", err);
            // Non-critical, just means we can't block taken slots visually
        }
    };

    // Generic Helper: Get Slots for a Specific Date
    const getSlotsForDate = (dateStr, medic, appointments = []) => {
        if (!medic || !medic.medic_profile) return [];
        const profile = medic.medic_profile;
        const start = profile.start_time || "09:00";
        const end = profile.end_time || "17:00";
        const duration = profile.slot_duration || 30;
        const scheduleDays = (profile.schedule_days || "Mon,Tue,Wed,Thu,Fri").split(',');
        const blockedDates = (profile.blocked_dates || "").split(',');

        // 1. Check Blocked Dates
        if (blockedDates.includes(dateStr)) return [];

        // 2. Check Day of Week
        const dateObj = new Date(`${dateStr}T00:00:00`);
        const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' }); // Mon, Tue...
        if (!scheduleDays.includes(dayName)) return [];

        // 3. Generate Slots
        const slots = [];
        let current = new Date(`${dateStr}T${start}`);
        const endTime = new Date(`${dateStr}T${end}`);
        const now = new Date(); // To block past slots if today

        while (current < endTime) {
            const timeString = current.toTimeString().slice(0, 5);
            const slotDateTime = new Date(`${dateStr}T${timeString}`);

            // Check if passed (only for today)
            let isPassed = false;
            if (dateStr === now.toISOString().split('T')[0]) {
                if (current <= now) isPassed = true;
            }

            // Check if taken
            const isTaken = appointments.some(app => {
                const appDate = new Date(app.datetime);
                return appDate.toISOString().split('T')[0] === dateStr &&
                    appDate.toTimeString().slice(0, 5) === timeString &&
                    app.status !== 'Cancelado';
            });

            slots.push({
                time: timeString,
                taken: isTaken || isPassed,
                available: !isTaken && !isPassed
            });
            current.setMinutes(current.getMinutes() + duration);
        }

        return slots;
    };

    const generateSlots = () => {
        if (!selectedMedic || !selectedDate) return;
        const slots = getSlotsForDate(selectedDate, selectedMedic, medicAppointments);
        setAvailableSlots(slots);
    };

    // Auto-Select First Available Date Logic
    const findNextAvailableDate = () => {
        if (!selectedMedic) return new Date().toISOString().split('T')[0];

        let attempts = 0;
        let checkDate = new Date();

        // Search next 60 days
        while (attempts < 60) {
            const dateStr = checkDate.toISOString().split('T')[0];
            const slots = getSlotsForDate(dateStr, selectedMedic, medicAppointments);

            // If any slot is available, return this date
            if (slots.some(s => s.available)) {
                return dateStr;
            }

            // Next day
            checkDate.setDate(checkDate.getDate() + 1);
            attempts++;
        }
        return new Date().toISOString().split('T')[0]; // Fallback to today
    };

    // Trigger auto-selection when entering Step 3
    useEffect(() => {
        if (step === 3 && selectedMedic && medicAppointments.length >= 0) {
            const nextDate = findNextAvailableDate();
            if (nextDate !== selectedDate) {
                setSelectedDate(nextDate);
            } else {
                // Even if it's the same (e.g. today), we need to generate slots
                generateSlots();
            }
        }
    }, [step, selectedMedic, medicAppointments]);

    const handleConfirm = async () => {
        setSubmitting(true);
        setError(null);
        try {
            await createAppointment(
                selectedMedic.id,
                `${selectedDate}T${selectedTime}:00`, // Format expected by backend
                symptoms
            );
            setSuccess("¡Turno confirmado con éxito!");
            setStep(5); // Success Step
            if (onSuccess) onSuccess();
        } catch (err) {
            setError(err.message);
            setSubmitting(false);
        }
    };

    // --- RENDER HELPERS ---

    // Get unique specialties
    const specialties = [...new Set(medics.map(m => m.medic_profile?.specialty || 'General'))];

    // Filter medics by specialty
    const filteredMedics = selectedSpecialty
        ? medics.filter(m => (m.medic_profile?.specialty || 'General') === selectedSpecialty)
        : [];

    if (loading) return <div className="p-10 text-center text-gray-500">Cargando asistente de reservas...</div>;

    return (
        <div className="max-w-4xl mx-auto bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100 font-sans min-h-[600px] flex flex-col">
            {/* Header / Progress */}
            <div className="bg-slate-50 p-6 border-b border-slate-200">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-slate-800">Reserva tu Turno</h2>
                    <span className="text-sm font-medium text-slate-500">Paso {step} de 4</span>
                </div>
                {/* Progress Bar */}
                <div className="w-full bg-slate-200 rounded-full h-2">
                    <div
                        className="bg-cyan-500 h-2 rounded-full transition-all duration-500 ease-in-out"
                        style={{ width: `${(step / 4) * 100}%` }}
                    ></div>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 p-8 overflow-y-auto">
                {error && (
                    <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-6 flex items-center gap-3">
                        <span className="font-bold">Error:</span> {error}
                    </div>
                )}

                {/* STEP 1: Specialty */}
                {step === 1 && (
                    <div className="space-y-6 animate-fade-in-right">
                        <h3 className="text-xl font-semibold text-slate-700">Selecciona una Especialidad</h3>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            {specialties.map(spec => (
                                <button
                                    key={spec}
                                    onClick={() => { setSelectedSpecialty(spec); setStep(2); }}
                                    className="p-6 rounded-2xl border border-slate-200 hover:border-cyan-500 hover:bg-cyan-50 transition-all text-center group"
                                >
                                    <div className="w-12 h-12 mx-auto bg-slate-100 rounded-full flex items-center justify-center mb-3 group-hover:bg-cyan-200 group-hover:text-cyan-700 transition-colors">
                                        <CheckCircle size={24} className="text-slate-400 group-hover:text-cyan-700" />
                                    </div>
                                    <span className="font-semibold text-slate-700 group-hover:text-cyan-800">{spec}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* STEP 2: Medic */}
                {step === 2 && (
                    <div className="space-y-6 animate-fade-in-right">
                        <div className="flex items-center gap-2 mb-4">
                            <button onClick={() => setStep(1)} className="text-slate-400 hover:text-slate-600">
                                <ChevronLeft />
                            </button>
                            <h3 className="text-xl font-semibold text-slate-700">Especialistas en {selectedSpecialty}</h3>
                        </div>

                        <div className="grid gap-4">
                            {filteredMedics.map(medic => (
                                <div
                                    key={medic.id}
                                    onClick={() => { setSelectedMedic(medic); setStep(3); }}
                                    className="p-4 rounded-2xl border border-slate-200 hover:border-cyan-500 hover:shadow-md cursor-pointer transition-all flex items-center gap-4 bg-white"
                                >
                                    <div className="w-16 h-16 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-inner">
                                        {medic.email.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="font-bold text-lg text-slate-800">{medic.email.split('@')[0]}</h4> // Assuming naming convention
                                        <p className="text-slate-500 text-sm flex items-center gap-1">
                                            <MapPin size={14} /> Consultorio Central
                                        </p>
                                        <p className="text-xs text-cyan-600 mt-1 font-medium bg-cyan-50 inline-block px-2 py-1 rounded-md">
                                            {medic.medic_profile?.license_number ? `MN: ${medic.medic_profile.license_number}` : 'Profesional Verificado'}
                                        </p>
                                    </div>
                                    <ChevronRight className="text-slate-300" />
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* STEP 3 & 4: Unified Booking UI */}
                {(step === 3 || step === 4) && (
                    <div className="animate-fade-in-right">
                        <div className="flex items-center gap-2 mb-6 text-sm font-medium text-slate-500">
                            <button onClick={() => setStep(2)} className="hover:text-cyan-600 flex items-center">
                                <ChevronLeft size={16} /> Volver
                            </button>
                            <span className="text-slate-300">/</span>
                            <span className="text-slate-800 font-semibold">Confirmar Cita</span>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                            {/* Left Column: Scheduler */}
                            <div className="lg:col-span-8 space-y-8">
                                {/* Physician Header Card */}
                                <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col sm:flex-row gap-6 items-center relative overflow-hidden">
                                    <div className="absolute top-0 left-0 w-1 h-full bg-cyan-500"></div>
                                    <div className="relative">
                                        <div className="h-24 w-24 rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center text-white text-3xl font-bold shadow-md">
                                            {selectedMedic.email.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="absolute -bottom-2 -right-2 bg-cyan-500 text-white p-1 rounded-full border-4 border-white shadow-sm">
                                            <CheckCircle size={16} />
                                        </div>
                                    </div>
                                    <div className="flex-1 text-center sm:text-left">
                                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-1">
                                            <h1 className="text-2xl font-bold text-slate-900">Dr/a. {selectedMedic.email.split('@')[0]}</h1>
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-cyan-50 text-cyan-700 w-fit mx-auto sm:mx-0 border border-cyan-100">
                                                {selectedMedic.medic_profile?.specialty || 'General'}
                                            </span>
                                        </div>
                                        <p className="text-slate-500 flex items-center justify-center sm:justify-start gap-1 text-sm mb-3">
                                            <MapPin size={14} /> Only at {selectedMedic.medic_profile?.address || 'Consultorio Central'}
                                        </p>
                                        <div className="flex items-center justify-center sm:justify-start gap-4 text-sm">
                                            <div className="flex items-center text-amber-500 font-bold bg-amber-50 px-2 py-1 rounded-md">
                                                ★ 4.9 <span className="text-slate-400 font-normal ml-1">(120 reseñas)</span>
                                            </div>
                                            <div className="text-slate-400">|</div>
                                            <div className="text-slate-500">MN: {selectedMedic.medic_profile?.license_number || 'N/A'}</div>
                                        </div>
                                    </div>
                                </div>

                                {/* Step 1: Calendar */}
                                <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                                    <div className="flex items-center gap-3 mb-6">
                                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-cyan-100 text-cyan-700 font-bold text-sm">1</span>
                                        <h2 className="text-xl font-bold text-slate-800">Selecciona Fecha</h2>
                                    </div>

                                    {/* Simple Date Input for now, matching the previous logic but styled better */}
                                    <div className="max-w-md mx-auto">
                                        <label className="block text-sm font-medium text-slate-700 mb-2">Fecha del Turno</label>
                                        <div className="relative">
                                            <input
                                                type="date"
                                                value={selectedDate}
                                                onChange={(e) => { setSelectedDate(e.target.value); setSelectedTime(null); }}
                                                min={new Date().toISOString().split('T')[0]}
                                                className="w-full p-4 pl-12 rounded-xl border border-slate-200 focus:ring-2 focus:ring-cyan-500 outline-none text-lg text-slate-700 font-medium shadow-sm transition-all hover:border-cyan-300"
                                            />
                                            <Calendar className="absolute left-4 top-1/2 transform -translate-y-1/2 text-cyan-500" size={20} />
                                        </div>
                                        <p className="text-xs text-slate-400 mt-2 text-center">
                                            * Mostrando la primera fecha disponible automáticamente.
                                        </p>
                                    </div>
                                </div>

                                {/* Step 2: Time Slots */}
                                <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                                    <div className="flex items-center gap-3 mb-6">
                                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-cyan-100 text-cyan-700 font-bold text-sm">2</span>
                                        <h2 className="text-xl font-bold text-slate-800">Selecciona Hora</h2>
                                    </div>

                                    {availableSlots.length === 0 ? (
                                        <div className="text-center py-8 text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                            No hay horarios disponibles para esta fecha.
                                        </div>
                                    ) : (
                                        <div className="space-y-6">
                                            {/* Morning Slots */}
                                            {availableSlots.some(s => parseInt(s.time.split(':')[0]) < 12) && (
                                                <div>
                                                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                                                        <span className="w-2 h-2 rounded-full bg-amber-400"></span> Mañana
                                                    </h3>
                                                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                                                        {availableSlots.filter(s => parseInt(s.time.split(':')[0]) < 12).map((slot, idx) => (
                                                            <button
                                                                key={idx}
                                                                disabled={slot.taken}
                                                                onClick={() => setSelectedTime(slot.time)}
                                                                className={`
                                                                    py-2 px-1 rounded-lg text-sm font-bold transition-all relative overflow-hidden group
                                                                    ${slot.taken
                                                                        ? 'bg-slate-50 text-slate-300 cursor-not-allowed border border-slate-100'
                                                                        : selectedTime === slot.time
                                                                            ? 'bg-cyan-600 text-white shadow-md shadow-cyan-200 transform scale-105 ring-2 ring-cyan-200'
                                                                            : 'bg-white border-2 border-slate-100 text-slate-600 hover:border-cyan-400 hover:text-cyan-700'
                                                                    }
                                                                `}
                                                            >
                                                                {slot.time}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Afternoon Slots */}
                                            {availableSlots.some(s => parseInt(s.time.split(':')[0]) >= 12) && (
                                                <div>
                                                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                                                        <span className="w-2 h-2 rounded-full bg-indigo-400"></span> Tarde
                                                    </h3>
                                                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                                                        {availableSlots.filter(s => parseInt(s.time.split(':')[0]) >= 12).map((slot, idx) => (
                                                            <button
                                                                key={idx}
                                                                disabled={slot.taken}
                                                                onClick={() => setSelectedTime(slot.time)}
                                                                className={`
                                                                    py-2 px-1 rounded-lg text-sm font-bold transition-all relative overflow-hidden group
                                                                    ${slot.taken
                                                                        ? 'bg-slate-50 text-slate-300 cursor-not-allowed border border-slate-100'
                                                                        : selectedTime === slot.time
                                                                            ? 'bg-cyan-600 text-white shadow-md shadow-cyan-200 transform scale-105 ring-2 ring-cyan-200'
                                                                            : 'bg-white border-2 border-slate-100 text-slate-600 hover:border-cyan-400 hover:text-cyan-700'
                                                                    }
                                                                `}
                                                            >
                                                                {slot.time}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Symptoms Input integrated here step 3 */}
                                <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                                    <div className="flex items-center gap-3 mb-4">
                                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-cyan-100 text-cyan-700 font-bold text-sm">3</span>
                                        <h2 className="text-xl font-bold text-slate-800">Motivo de Consulta</h2>
                                    </div>
                                    <textarea
                                        className="w-full p-4 rounded-xl border border-slate-200 focus:ring-2 focus:ring-cyan-500 outline-none resize-none h-24 text-sm"
                                        placeholder="Describe brevemente tus síntomas o el motivo del turno (Opcional)..."
                                        value={symptoms}
                                        onChange={(e) => setSymptoms(e.target.value)}
                                    ></textarea>
                                </div>

                            </div>

                            {/* Right Column: Summary Sidebar */}
                            <div className="lg:col-span-4 lg:sticky lg:top-6 space-y-6">
                                <div className="bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
                                    <div className="bg-slate-50 p-6 border-b border-slate-100">
                                        <h3 className="text-lg font-bold text-slate-800">Resumen de Turno</h3>
                                        <p className="text-sm text-cyan-600 font-medium">Revisa los detalles</p>
                                    </div>
                                    <div className="p-6 space-y-6">
                                        <div className="flex items-start gap-4">
                                            <div className="p-2.5 rounded-xl bg-cyan-50 text-cyan-600 shrink-0">
                                                <User size={20} />
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold text-slate-400 uppercase tracking-tight mb-0.5">Profesional</p>
                                                <p className="font-bold text-slate-800 text-sm">{selectedMedic.email.split('@')[0]}</p>
                                                <p className="text-xs text-slate-500">{selectedMedic.medic_profile?.specialty}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-4">
                                            <div className="p-2.5 rounded-xl bg-cyan-50 text-cyan-600 shrink-0">
                                                <Calendar size={20} />
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold text-slate-400 uppercase tracking-tight mb-0.5">Fecha</p>
                                                <p className="font-bold text-slate-800 text-sm">
                                                    {new Date(selectedDate).toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-4">
                                            <div className="p-2.5 rounded-xl bg-cyan-50 text-cyan-600 shrink-0">
                                                <Clock size={20} />
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold text-slate-400 uppercase tracking-tight mb-0.5">Hora</p>
                                                <p className="font-bold text-slate-800 text-sm">
                                                    {selectedTime ? `${selectedTime} hs` : <span className="text-slate-400 italic">--:--</span>}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="pt-6 border-t border-dashed border-slate-200">
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="text-slate-500 text-sm">Consulta Médica</span>
                                                <span className="font-bold text-slate-800 text-sm">$ Free</span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-slate-500 text-sm">Servicio</span>
                                                <span className="font-bold text-slate-800 text-sm">$ 0.00</span>
                                            </div>
                                            <div className="flex justify-between items-center mt-4 pt-4 border-t border-slate-100">
                                                <span className="text-lg font-bold text-slate-900">Total</span>
                                                <span className="text-2xl font-extrabold text-slate-900">$0.00</span>
                                            </div>
                                        </div>

                                        <button
                                            onClick={handleConfirm}
                                            disabled={!selectedTime || submitting}
                                            className="w-full bg-cyan-600 hover:bg-cyan-500 text-white py-4 rounded-xl font-bold text-lg shadow-lg shadow-cyan-200 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                                        >
                                            {submitting ? 'Confirmando...' : 'Confirmar Turno'}
                                        </button>

                                        <div className="flex items-center justify-center gap-2 text-xs text-slate-400 font-medium">
                                            <CheckCircle size={12} className="text-green-500" />
                                            Reserva segura encriptada
                                        </div>
                                    </div>
                                </div>

                                <div className="p-4 rounded-2xl border border-dashed border-slate-200 flex items-center gap-4 bg-slate-50/50">
                                    <div className="h-10 w-10 rounded-full bg-white flex items-center justify-center text-cyan-600 shadow-sm">
                                        <User size={20} />
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-slate-900">¿Necesitas ayuda?</p>
                                        <p className="text-[10px] text-slate-500">Contacta a soporte 24/7</p>
                                    </div>
                                    <button className="ml-auto text-cyan-600 font-bold text-xs hover:underline uppercase tracking-wider">Ayuda</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* SUCCESS STEP */}
                {step === 5 && (
                    <div className="text-center py-10 animate-fade-in-up">
                        <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 text-green-600 animate-bounce">
                            <CheckCircle size={48} />
                        </div>
                        <h2 className="text-3xl font-bold text-slate-800 mb-4">¡Reserva Exitosa!</h2>
                        <p className="text-slate-500 max-w-md mx-auto mb-8">
                            Hemos enviado la confirmación a tu correo. Puedes ver el estado de tu turno en "Mis Turnos".
                        </p>
                        <button
                            onClick={() => {
                                setStep(1);
                                setSelectedMedic(null);
                                setSelectedTime(null);
                                setSuccess(null);
                                if (onSuccess) onSuccess();
                            }}
                            className="bg-slate-800 text-white px-8 py-3 rounded-full font-bold hover:bg-slate-900 transition-colors"
                        >
                            Volver al Inicio
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
