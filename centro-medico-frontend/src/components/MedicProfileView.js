import React, { useState, useEffect } from 'react';
import { getMedicAppointments, createAppointment, lookupPatientByDni, fetchCurrentUser } from '../api';
import { Calendar, Clock, MapPin, ChevronLeft, CheckCircle, AlertCircle, User, Info } from 'lucide-react';

export default function MedicProfileView({ medic, onBack }) {
    const [occupiedSlots, setOccupiedSlots] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [selectedSlot, setSelectedSlot] = useState(null);
    const [symptoms, setSymptoms] = useState('');
    const [booking, setBooking] = useState(false);
    const [success, setSuccess] = useState(null);
    const [error, setError] = useState(null);

    // Patient Form State
    const [patientData, setPatientData] = useState({
        dni: '',
        first_name: '',
        last_name: '',
        birth_date: '',
        phone: '',
        insurance: ''
    });
    const [loadingPatient, setLoadingPatient] = useState(false);

    // Pre-fill if current user has profile
    useEffect(() => {
        fetchCurrentUser().then(user => {
            if (user.patient_profile) {
                setPatientData({
                    dni: user.patient_profile.dni,
                    first_name: user.patient_profile.first_name,
                    last_name: user.patient_profile.last_name,
                    birth_date: user.patient_profile.birth_date,
                    phone: user.patient_profile.phone || '',
                    insurance: user.patient_profile.insurance || ''
                });
            }
        }).catch(err => console.error(err));
    }, []);

    const handleDniBlur = async () => {
        if (!patientData.dni || patientData.dni.length < 5) return;
        setLoadingPatient(true);
        try {
            const profile = await lookupPatientByDni(patientData.dni);
            if (profile) {
                setPatientData(prev => ({
                    ...prev,
                    first_name: profile.first_name,
                    last_name: profile.last_name,
                    birth_date: profile.birth_date,
                    phone: profile.phone || prev.phone,
                    insurance: profile.insurance || prev.insurance
                }));
                setError(null);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoadingPatient(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setPatientData(prev => ({ ...prev, [name]: value }));
    };

    // Calendar State
    const [currentMonth, setCurrentMonth] = useState(new Date());

    // Profile configs with defaults
    const profile = medic.medic_profile || {};
    const startTime = profile.start_time || "09:00";
    const endTime = profile.end_time || "17:00";
    const duration = profile.slot_duration || 30;
    const workingDays = (profile.schedule_days || "Mon,Tue,Wed,Thu,Fri").split(',');
    const blockedDates = (profile.blocked_dates || "").split(',').filter(d => d);
    const address = profile.address || "Consultorio Central";

    // Helper: Generate dynamic slots for a given date string (YYYY-MM-DD)
    const getSlotsForDate = (dateStr) => {
        const slots = [];
        const [y, m, d] = dateStr.split('-').map(Number);
        const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date(y, m - 1, d).getDay()];

        const shifts = profile.shifts && profile.shifts.length > 0
            ? profile.shifts
            : [{ start_time: startTime, end_time: endTime, day_of_week: null }];

        // Sort shifts by start time
        shifts.sort((a, b) => a.start_time.localeCompare(b.start_time));

        shifts.forEach(shift => {
            if (shift.day_of_week && shift.day_of_week !== dayName) return;

            // Simple check: don't generate slots for non-working days if using profile.days
            // But here we rely on shifts or default. Ideally we also check workingDays array.
            if (workingDays.length > 0 && !workingDays.includes(dayName)) return;

            let [currH, currM] = shift.start_time.split(':').map(Number);
            const [endH, endM] = shift.end_time.split(':').map(Number);
            const endTotalM = endH * 60 + endM;
            let currTotalM = currH * 60 + currM;

            while (currTotalM + duration <= endTotalM) {
                const h = Math.floor(currTotalM / 60);
                const min = currTotalM % 60;
                const timeStr = `${h.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
                slots.push(timeStr);
                currTotalM += duration;
            }
        });

        return [...new Set(slots)].sort();
    };

    // Calculate slots for current selected date to render
    const timeSlots = getSlotsForDate(selectedDate);

    // Initial Load & Auto-Select Date Logic
    useEffect(() => {
        loadAvailability();
    }, [medic.id]);

    useEffect(() => {
        // Only run if we have availability loaded and it's the first run (or date is invalid)
        if (loading) return;

        const checkDate = new Date(); // Start from today
        let attempts = 0;
        let foundDate = null;

        while (attempts < 60) {
            const dateStr = checkDate.toISOString().split('T')[0];
            const [y, m, d] = dateStr.split('-').map(Number);
            const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date(y, m - 1, d).getDay()];

            // Check basic constraints
            const isBlocked = blockedDates.includes(dateStr);
            const isWorkingDay = workingDays.includes(dayName);

            if (!isBlocked && isWorkingDay) {
                // Check if there are available slots
                const daySlots = getSlotsForDate(dateStr);
                const hasAvailableSlot = daySlots.some(time => {
                    const targetIso = `${dateStr}T${time}:00`;
                    // Check if not occupied AND not in the past (if today)
                    const isOccupied = occupiedSlots.some(r => r.datetime.startsWith(targetIso) && r.status !== 'Cancelado');

                    // Simple past check for today's slots
                    let isPastTime = false;
                    const now = new Date();
                    if (dateStr === now.toISOString().split('T')[0]) {
                        const [h, min] = time.split(':').map(Number);
                        const slotDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, min);
                        if (slotDate < now) isPastTime = true;
                    }

                    return !isOccupied && !isPastTime;
                });

                if (hasAvailableSlot) {
                    foundDate = dateStr;
                    break;
                }
            }
            checkDate.setDate(checkDate.getDate() + 1);
            attempts++;
        }

        if (foundDate && foundDate !== selectedDate) {
            setSelectedDate(foundDate);
            // Also update calendar view to that month
            const fd = new Date(foundDate);
            // Adjust currentMonth state if needed, tricky because currentMonth is Date object 
            // set to 1st of month usually in calendar logic, let's update it to ensure visibility
            setCurrentMonth(new Date(fd.getFullYear(), fd.getMonth(), 1));
        }
    }, [loading, medic.id, occupiedSlots.length]); // Dependencies to trigger once loaded

    const loadAvailability = async () => {
        try {
            const data = await getMedicAppointments(medic.id);
            setOccupiedSlots(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const isSlotOccupied = (time) => {
        const targetIso = `${selectedDate}T${time}:00`;
        return occupiedSlots.some(r => r.datetime.startsWith(targetIso) && r.status !== 'Cancelado');
    };

    // --- CALENDAR LOGIC ---
    const getDaysInMonth = (date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const days = new Date(year, month + 1, 0).getDate();
        const firstDay = new Date(year, month, 1).getDay(); // 0 = Sun
        return { days, firstDay };
    };

    const { days, firstDay } = getDaysInMonth(currentMonth);
    const daysArray = [...Array(days).keys()].map(i => i + 1);
    const emptySlots = Array(firstDay).fill(null);

    const handlePrevMonth = () => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
    };

    const handleNextMonth = () => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
    };

    const handleDateClick = (day) => {
        const dateStr = `${currentMonth.getFullYear()}-${(currentMonth.getMonth() + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;

        // Validate click
        const dateObj = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
        const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dateObj.getDay()];

        if (!workingDays.includes(dayName)) return; // Can't select non-working
        if (blockedDates.includes(dateStr)) return; // Can't select blocked

        setSelectedDate(dateStr);
        setSelectedSlot(null);
    };

    // Validation for current selected date view
    const checkDateStatus = (day) => {
        const dateStr = `${currentMonth.getFullYear()}-${(currentMonth.getMonth() + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
        const dateObj = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
        const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dateObj.getDay()];

        const isSelected = selectedDate === dateStr;
        const isBlocked = blockedDates.includes(dateStr);
        const isWorkingDay = workingDays.includes(dayName);
        const isPast = new Date() > new Date(dateObj.getTime() + 86400000); // Simple past check

        return { dateStr, isSelected, isBlocked, isWorkingDay, isPast };
    };

    const currentDayStatus = (() => {
        const [y, m, d] = selectedDate.split('-').map(Number);
        // Check against profile arrays
        // Re-using logic implicitly via UI state but explicitly here for bottom alert
        const sDate = new Date(y, m - 1, d);
        const sDayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][sDate.getDay()];
        const isDayAvailable = workingDays.includes(sDayName);
        const isDateBlocked = blockedDates.includes(selectedDate);
        return { isAllowed: isDayAvailable && !isDateBlocked, isDateBlocked };
    })();

    // -----------------------

    const handleBooking = async () => {
        if (!selectedSlot) return;

        // Form Validation
        if (!patientData.dni || !patientData.first_name || !patientData.last_name || !patientData.birth_date) {
            setError("Por favor completa todos los datos del paciente (DNI, Nombre, Apellido, Fecha Nac.)");
            return;
        }

        setBooking(true);
        setError(null);
        try {
            // Include patientData in the call
            await createAppointment(medic.id, `${selectedDate}T${selectedSlot}:00`, symptoms, patientData);
            setSuccess(true);
            loadAvailability();
        } catch (err) {
            setError(err.message);
        } finally {
            setBooking(false);
        }
    };

    if (success) {
        return (
            <div className="max-w-2xl mx-auto bg-white p-8 rounded-xl shadow-lg text-center animate-fade-in">
                <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle size={32} />
                </div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">¡Turno Confirmado!</h2>
                <p className="text-gray-600 mb-6">Tu cita ha sido agendada exitosamente.</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left mb-8">
                    {/* Cita */}
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                        <h3 className="font-bold text-blue-800 mb-2 text-sm uppercase tracking-wide">Detalles del Turno</h3>
                        <p className="text-gray-700 text-sm"><strong className="font-medium">Fecha:</strong> {selectedDate}</p>
                        <p className="text-gray-700 text-sm"><strong className="font-medium">Hora:</strong> {selectedSlot} hs</p>
                        <p className="text-gray-700 text-sm"><strong className="font-medium">Lugar:</strong> {address}</p>
                    </div>

                    {/* Médico */}
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                        <h3 className="font-bold text-gray-800 mb-2 text-sm uppercase tracking-wide">Profesional</h3>
                        <p className="text-gray-700 text-sm"><strong className="font-medium">Dr/a:</strong> {medic.email.split('@')[0]}</p>
                        <p className="text-gray-700 text-sm"><strong className="font-medium">Especialidad:</strong> {profile.specialty || "General"}</p>
                        <p className="text-gray-700 text-sm"><strong className="font-medium">Matrícula:</strong> {profile.license_number || "N/A"}</p>
                    </div>

                    {/* Paciente */}
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 md:col-span-2">
                        <h3 className="font-bold text-gray-800 mb-2 text-sm uppercase tracking-wide">Datos del Paciente</h3>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                            <p className="text-gray-700"><strong className="font-medium">Nombre:</strong> {patientData.first_name} {patientData.last_name}</p>
                            <p className="text-gray-700"><strong className="font-medium">DNI:</strong> {patientData.dni}</p>
                            <p className="text-gray-700"><strong className="font-medium">Fecha Nac:</strong> {patientData.birth_date}</p>
                            <p className="text-gray-700"><strong className="font-medium">Teléfono:</strong> {patientData.phone || "-"}</p>
                            <p className="text-gray-700"><strong className="font-medium">Obra Social:</strong> {patientData.insurance || "-"}</p>
                        </div>
                    </div>
                </div>

                <button onClick={onBack} className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 font-semibold shadow-md transition-all">
                    Volver al Directorio
                </button>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto animate-fade-in">
            <button onClick={onBack} className="flex items-center text-gray-500 hover:text-blue-600 mb-4 transition-colors">
                <ChevronLeft size={20} />
                Volver
            </button>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-6">
                <div className="p-6 md:p-8 flex flex-col md:flex-row gap-6 items-center md:items-start">
                    <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 shrink-0 overflow-hidden border border-blue-100">
                        {profile.profile_image_url ? (
                            <img src={profile.profile_image_url} alt="Doctor Profile" className="w-full h-full object-cover" />
                        ) : (
                            <User size={48} />
                        )}
                    </div>
                    <div className="text-center md:text-left flex-1">
                        <h2 className="text-2xl font-bold text-gray-900">Dr/a. {medic.email.split('@')[0]}</h2>
                        <p className="text-blue-600 font-medium text-lg mb-2">{profile.specialty || "Medicina General"}</p>
                        <div className="flex flex-col md:flex-row gap-3 text-gray-500 mb-4 justify-center md:justify-start">
                            <div className="flex items-center gap-2">
                                <MapPin size={16} />
                                <span>{address}</span>
                            </div>
                            <div className="hidden md:block text-gray-300">|</div>
                            <div className="flex items-center gap-2">
                                <Info size={16} />
                                <span>Mat. {profile.license_number || "N/A"}</span>
                            </div>
                        </div>
                        <p className="text-gray-600 max-w-xl text-sm">
                            {profile.bio || "Especialista comprometido con la salud. Atención personalizada."}
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Custom Calendar Column */}
                <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-bold text-gray-800 flex items-center gap-2">
                            <Calendar size={20} className="text-blue-600" />
                            Selecciona Fecha
                        </h3>
                        <div className="flex items-center gap-4 bg-gray-50 rounded-lg p-1">
                            <button onClick={handlePrevMonth} className="p-1 hover:bg-gray-200 rounded-md"><ChevronLeft size={20} /></button>
                            <span className="font-semibold text-gray-700 w-32 text-center">
                                {currentMonth.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
                            </span>
                            <button onClick={handleNextMonth} className="p-1 hover:bg-gray-200 rounded-md rotate-180"><ChevronLeft size={20} /></button>
                        </div>
                    </div>

                    {/* Calendar Grid */}
                    <div className="grid grid-cols-7 gap-2 mb-4 text-center">
                        {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(d => (
                            <div key={d} className="text-xs font-bold text-gray-400 uppercase tracking-wider">{d}</div>
                        ))}

                        {emptySlots.map((_, i) => <div key={`empty-${i}`} />)}

                        {daysArray.map(day => {
                            const { isSelected, isBlocked, isWorkingDay, isPast } = checkDateStatus(day);

                            let baseClass = "h-12 rounded-lg flex items-center justify-center text-sm font-medium transition-all relative ";

                            if (isPast) {
                                baseClass += "text-gray-300 bg-gray-50 cursor-not-allowed";
                            } else if (isBlocked) {
                                baseClass += "bg-red-50 text-red-500 border border-red-100 cursor-not-allowed"; // Blocked style
                            } else if (!isWorkingDay) {
                                baseClass += "bg-gray-50 text-gray-300 cursor-not-allowed"; // Non-working day style
                            } else if (isSelected) {
                                baseClass += "bg-blue-600 text-white shadow-md transform scale-105 z-10"; // Selected
                            } else {
                                baseClass += "bg-white border border-gray-200 text-gray-700 hover:border-blue-400 hover:text-blue-600 cursor-pointer hover:bg-blue-50"; // Available
                            }

                            return (
                                <button
                                    key={day}
                                    onClick={() => !isPast && isWorkingDay && handleDateClick(day)}
                                    className={baseClass}
                                    disabled={isPast || !isWorkingDay}
                                    title={isBlocked ? "Fecha bloqueada" : !isWorkingDay ? "No laboral" : ""}
                                >
                                    {day}
                                    {isBlocked && <div className="absolute top-1 right-1 w-1.5 h-1.5 bg-red-500 rounded-full"></div>}
                                </button>
                            );
                        })}
                    </div>

                    <div className="flex gap-4 text-xs text-gray-500 justify-center mt-6 py-4 border-t border-gray-100">
                        <div className="flex items-center gap-1"><div className="w-3 h-3 bg-white border border-gray-300 rounded"></div> Disp.</div>
                        <div className="flex items-center gap-1"><div className="w-3 h-3 bg-blue-600 rounded"></div> Selec.</div>
                        <div className="flex items-center gap-1"><div className="w-3 h-3 bg-red-50 border border-red-200 rounded"></div> Bloqueado</div>
                        <div className="flex items-center gap-1"><div className="w-3 h-3 bg-gray-100 rounded"></div> No Laboral</div>
                    </div>
                </div>

                {/* Slots & Confirm Column */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-fit">
                    <h3 className="font-bold text-gray-800 mb-4">Horarios Disponibles</h3>

                    {!(currentDayStatus.isAllowed || currentDayStatus.isDateBlocked) ? (
                        <div className="text-center py-12 px-4 text-gray-500 bg-gray-50 rounded-lg border border-gray-100 border-dashed">
                            <AlertCircle className="mx-auto mb-2 text-red-400" size={32} />
                            <p className="font-medium text-gray-900">Fecha no disponible</p>
                            <p className="text-sm mt-1">El profesional no atiende este día de la semana.</p>
                        </div>
                    ) : (
                        <>
                            <div className="text-sm text-gray-500 mb-3">Para el {selectedDate}:</div>
                            <div className="grid grid-cols-3 gap-2 mb-6 max-h-60 overflow-y-auto pr-1">
                                {timeSlots.map(time => {
                                    const occupied = isSlotOccupied(time) || currentDayStatus.isDateBlocked;
                                    const isSelected = selectedSlot === time;
                                    return (
                                        <button
                                            key={time}
                                            disabled={occupied}
                                            onClick={() => setSelectedSlot(time)}
                                            className={`
                                                py-2 px-1 rounded-md text-sm font-medium border transition-all
                                                ${occupied
                                                    ? 'bg-gray-100 text-gray-300 border-transparent cursor-not-allowed decoration-slice'
                                                    : isSelected
                                                        ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                                                        : 'bg-white text-gray-700 border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                                                }
                                            `}
                                        >
                                            {time}
                                        </button>
                                    )
                                })}
                            </div>

                            <h4 className="font-bold text-gray-800 mb-3 border-t pt-4">Confirmar</h4>
                            {!selectedSlot ? (
                                <div className="text-gray-400 text-xs italic">Selecciona un horario arriba.</div>
                            ) : (
                                <div className="animate-fade-in text-left">
                                    <div className="space-y-3 mb-4">
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-700 mb-1">DNI *</label>
                                            <div className="relative">
                                                <input
                                                    type="text"
                                                    name="dni"
                                                    value={patientData.dni}
                                                    onChange={handleInputChange}
                                                    onBlur={handleDniBlur}
                                                    className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500"
                                                    placeholder="Ingrese DNI"
                                                />
                                                {loadingPatient && <div className="absolute right-2 top-2.5 animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>}
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-xs font-semibold text-gray-700 mb-1">Nombre *</label>
                                                <input
                                                    type="text"
                                                    name="first_name"
                                                    value={patientData.first_name}
                                                    onChange={handleInputChange}
                                                    className="w-full p-2 border border-gray-300 rounded-md text-sm"
                                                    placeholder="Nombres"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-semibold text-gray-700 mb-1">Apellido *</label>
                                                <input
                                                    type="text"
                                                    name="last_name"
                                                    value={patientData.last_name}
                                                    onChange={handleInputChange}
                                                    className="w-full p-2 border border-gray-300 rounded-md text-sm"
                                                    placeholder="Apellidos"
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-xs font-semibold text-gray-700 mb-1">Fecha Nac. *</label>
                                                <input
                                                    type="date"
                                                    name="birth_date"
                                                    value={patientData.birth_date}
                                                    onChange={handleInputChange}
                                                    className="w-full p-2 border border-gray-300 rounded-md text-sm"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-semibold text-gray-700 mb-1">Teléfono</label>
                                                <input
                                                    type="tel"
                                                    name="phone"
                                                    value={patientData.phone}
                                                    onChange={handleInputChange}
                                                    className="w-full p-2 border border-gray-300 rounded-md text-sm"
                                                    placeholder="Ej: 387-4001234"
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-semibold text-gray-700 mb-1">Obra Social</label>
                                            <input
                                                type="text"
                                                name="insurance"
                                                value={patientData.insurance}
                                                onChange={handleInputChange}
                                                className="w-full p-2 border border-gray-300 rounded-md text-sm"
                                                placeholder="Opcional"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs font-semibold text-gray-700 mb-1">Motivo de consulta</label>
                                            <textarea
                                                className="w-full p-2 border border-gray-300 rounded-md text-sm h-16 resize-none"
                                                placeholder="Breve descripción..."
                                                value={symptoms}
                                                onChange={(e) => setSymptoms(e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    {error && (
                                        <div className="flex items-start gap-2 text-red-600 text-xs mb-4 bg-red-50 p-2 rounded">
                                            <AlertCircle size={14} className="mt-0.5" />
                                            {error}
                                        </div>
                                    )}
                                    <button
                                        onClick={handleBooking}
                                        disabled={booking}
                                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg shadow-lg hover:shadow-xl transition-all disabled:opacity-70 flex justify-center items-center gap-2"
                                    >
                                        {booking && <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>}
                                        {booking ? 'Confimando...' : 'Confirmar Reserva'}
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
