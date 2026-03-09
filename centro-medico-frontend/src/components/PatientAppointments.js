import React, { useState, useEffect } from 'react';
import { getMyAppointments, updateAppointmentStatus } from '../api';
import { Calendar, Clock, MapPin, User, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

export default function PatientAppointments() {
    const [appointments, setAppointments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        loadAppointments();
    }, []);

    const loadAppointments = async () => {
        try {
            const data = await getMyAppointments();
            setAppointments(data);
        } catch (err) {
            setError("No se pudieron cargar tus turnos.");
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = async (id) => {
        if (!window.confirm("¿Estás seguro de cancelar este turno?")) return;
        try {
            await updateAppointmentStatus(id, "Cancelado");
            loadAppointments();
        } catch (err) {
            alert("Error al cancelar el turno");
        }
    };

    if (loading) return <div className="p-8 text-center text-gray-500">Cargando tus turnos...</div>;
    if (error) return <div className="p-8 text-center text-red-500">{error}</div>;

    return (
        <div className="max-w-4xl mx-auto px-4 py-8">
            <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                <Calendar className="text-cyan-600" /> Mis Turnos
            </h2>

            {appointments.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-2xl shadow-sm border border-slate-100">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
                        <Calendar size={32} />
                    </div>
                    <h3 className="text-lg font-medium text-slate-700">No tienes turnos programados</h3>
                    <p className="text-slate-500 mt-1">Reserva una cita desde la sección de Médicos.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {appointments.map((app) => (
                        <div key={app.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-all hover:shadow-md">
                            <div className="flex items-start gap-4">
                                <div className={`p-3 rounded-xl shrink-0 ${app.status === 'Confirmado' ? 'bg-green-50 text-green-600' :
                                        app.status === 'Cancelado' ? 'bg-red-50 text-red-600' :
                                            'bg-amber-50 text-amber-600'
                                    }`}>
                                    {app.status === 'Confirmado' ? <CheckCircle size={24} /> :
                                        app.status === 'Cancelado' ? <XCircle size={24} /> :
                                            <AlertCircle size={24} />}
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-800 text-lg">
                                        Dr. {app.medic_email?.split('@')[0] || 'Médico'}
                                    </h3>
                                    <p className="text-slate-500 text-sm flex items-center gap-1 mb-1">
                                        <User size={14} /> {app.medic_specialty || "Especialista"}
                                    </p>
                                    <div className="flex flex-wrap gap-3 mt-2 text-sm font-medium">
                                        <span className="flex items-center gap-1 text-slate-700 bg-slate-50 px-2 py-1 rounded-md">
                                            <Calendar size={14} className="text-cyan-600" />
                                            {new Date(app.appointment_time).toLocaleDateString()}
                                        </span>
                                        <span className="flex items-center gap-1 text-slate-700 bg-slate-50 px-2 py-1 rounded-md">
                                            <Clock size={14} className="text-cyan-600" />
                                            {new Date(app.appointment_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col items-end gap-2 w-full md:w-auto">
                                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${app.status === 'Confirmado' ? 'bg-green-100 text-green-700' :
                                        app.status === 'Cancelado' ? 'bg-red-100 text-red-700' :
                                            'bg-amber-100 text-amber-700'
                                    }`}>
                                    {app.status}
                                </span>

                                {app.status !== 'Cancelado' && (
                                    <button
                                        onClick={() => handleCancel(app.id)}
                                        className="text-red-500 hover:text-red-700 text-sm font-medium hover:underline mt-2"
                                    >
                                        Cancelar Turno
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
