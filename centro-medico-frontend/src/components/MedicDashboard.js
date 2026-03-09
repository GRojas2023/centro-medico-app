import React, { useState, useEffect } from 'react';
import { getMyAppointments, updateAppointmentStatus, updateMedicProfile } from '../api';
import { Calendar, CheckCircle, XCircle, Clock, User, Home, Users, Settings, LogOut, Bell, Search, Menu, Filter, ChevronRight, Star, DollarSign, Activity, Save } from 'lucide-react';

export default function MedicDashboard({ user }) {
    const [appointments, setAppointments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard', 'patients', 'profile', 'reviews'
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // State for Profile Editing
    const [profileData, setProfileData] = useState({
        specialty: '',
        bio: '',
        address: '',
        license_number: '',
        schedule_days: [],
        slot_duration: 30,
        shifts: [] // {start_time, end_time}
    });

    useEffect(() => {
        loadAppointments();
        if (user?.medic_profile) {
            // Parse shifts if they exist, otherwise default
            const shifts = user.medic_profile.shifts || [];
            setProfileData({
                specialty: user.medic_profile.specialty || '',
                bio: user.medic_profile.bio || '',
                address: user.medic_profile.address || '',
                license_number: user.medic_profile.license_number || '',
                schedule_days: user.medic_profile.schedule_days ? user.medic_profile.schedule_days.split(',') : [],
                slot_duration: user.medic_profile.slot_duration || 30,
                shifts: shifts.length > 0 ? shifts : [{ start_time: "09:00", end_time: "17:00", _uiId: Date.now() }]
            });
        }
    }, [user]);

    const loadAppointments = async () => {
        try {
            const data = await getMyAppointments();
            data.sort((a, b) => new Date(b.datetime) - new Date(a.datetime));
            setAppointments(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleStatusChange = async (id, newStatus) => {
        if (!window.confirm(`¿Cambiar estado a ${newStatus}?`)) return;
        try {
            await updateAppointmentStatus(id, newStatus);
            loadAppointments();
        } catch (err) {
            alert("Error actualizando turno");
        }
    };

    const handleSaveProfile = async () => {
        try {
            // Convert array back to CVS for simple fields if needed by backend, 
            // but our backend likely expects specific format. 
            // We will send the object as is and let backend handle it or adjust here.
            // Assuming backend accepts these fields directly for now based on Admin implementation.
            await updateMedicProfile({
                ...profileData,
                schedule_days: profileData.schedule_days.join(',')
            });
            alert("Perfil actualizado correctamente");
        } catch (error) {
            console.error("Error updating profile", error);
            alert("Error al guardar el perfil");
        }
    };

    const toggleDay = (day) => {
        const currentDays = profileData.schedule_days;
        if (currentDays.includes(day)) {
            setProfileData({ ...profileData, schedule_days: currentDays.filter(d => d !== day) });
        } else {
            setProfileData({ ...profileData, schedule_days: [...currentDays, day] });
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'Pendiente': return 'bg-amber-100 text-amber-700 border-amber-200';
            case 'Confirmado': return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'Realizado': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
            case 'Cancelado': return 'bg-rose-100 text-rose-700 border-rose-200';
            default: return 'bg-slate-100 text-slate-700 border-slate-200';
        }
    };

    const stats = [
        { label: 'Turnos Hoy', value: appointments.filter(a => a.status === 'Confirmado').length, icon: Calendar, color: 'bg-blue-500', trend: '+2 hoy' },
        { label: 'Pacientes Totales', value: new Set(appointments.map(a => a.patient_id)).size, icon: Users, color: 'bg-emerald-500', trend: '+5 mes' },
        { label: 'Calificación', value: '4.9', icon: Star, color: 'bg-amber-500', trend: 'Excelencia' },
        { label: 'Ingresos Mes', value: '$0', icon: DollarSign, color: 'bg-violet-500', trend: 'Simulado' },
    ];

    const filteredAppointments = appointments.filter(appt =>
        appt.patient?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        appt.status.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleLogout = () => {
        localStorage.removeItem('token');
        window.location.reload();
    };

    return (
        <div className="flex h-screen bg-slate-50 font-sans overflow-hidden">
            {/* Sidebar */}
            <aside className={`${sidebarOpen ? 'w-72' : 'w-20'} bg-white border-r border-slate-200 flex flex-col transition-all duration-300 z-20`}>
                <div className="h-20 flex items-center px-6 border-b border-slate-100">
                    <div className="w-10 h-10 bg-cyan-400 rounded-xl flex items-center justify-center shadow-lg shadow-cyan-100 mr-3 shrink-0">
                        <span className="text-white font-bold text-xl">M</span>
                    </div>
                    {sidebarOpen && <span className="font-bold text-xl bg-clip-text text-transparent bg-gradient-to-r from-slate-800 to-slate-600">MedDirect</span>}
                </div>

                <nav className="flex-1 py-6 space-y-1 px-3 overflow-y-auto">
                    <p className={`px-3 text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ${!sidebarOpen && 'text-center'}`}>{sidebarOpen ? 'Principal' : '...'}</p>
                    <button onClick={() => setActiveTab('dashboard')} className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all ${activeTab === 'dashboard' ? 'bg-gradient-to-r from-cyan-400/20 to-cyan-400/5 text-cyan-800 shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900 group'}`}>
                        <Home size={20} className={activeTab === 'dashboard' ? 'text-cyan-600' : 'text-slate-400 group-hover:text-cyan-500 transition-colors'} />
                        {sidebarOpen && <span>Mi Agenda</span>}
                        {sidebarOpen && activeTab === 'dashboard' && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-cyan-400" />}
                    </button>
                    <button onClick={() => setActiveTab('patients')} className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all ${activeTab === 'patients' ? 'bg-gradient-to-r from-cyan-400/20 to-cyan-400/5 text-cyan-800 shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900 group'}`}>
                        <Users size={20} className={activeTab === 'patients' ? 'text-cyan-600' : 'text-slate-400 group-hover:text-cyan-500 transition-colors'} />
                        {sidebarOpen && <span>Pacientes</span>}
                        {sidebarOpen && activeTab === 'patients' && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-cyan-400" />}
                    </button>

                    <p className={`mt-8 px-3 text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ${!sidebarOpen && 'text-center'}`}>{sidebarOpen ? 'Configuración' : '...'}</p>
                    <button onClick={() => setActiveTab('profile')} className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all ${activeTab === 'profile' ? 'bg-gradient-to-r from-cyan-400/20 to-cyan-400/5 text-cyan-800 shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900 group'}`}>
                        <Settings size={20} className={activeTab === 'profile' ? 'text-cyan-600' : 'text-slate-400 group-hover:text-cyan-500 transition-colors'} />
                        {sidebarOpen && <span>Mi Perfil</span>}
                        {sidebarOpen && activeTab === 'profile' && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-cyan-400" />}
                    </button>
                </nav>

                <div className="p-4 border-t border-slate-100">
                    <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-rose-600 hover:bg-rose-50 transition-all">
                        <LogOut size={20} />
                        {sidebarOpen && <span>Cerrar Sesión</span>}
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
                {/* Top Header */}
                <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-200 px-8 flex items-center justify-between z-10 sticky top-0">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                            <Menu size={20} />
                        </button>
                        <h2 className="text-xl font-bold text-slate-800">
                            {activeTab === 'dashboard' && 'Panel Médico'}
                            {activeTab === 'patients' && 'Mis Pacientes'}
                            {activeTab === 'profile' && 'Configuración de Perfil'}
                        </h2>
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="hidden md:flex items-center gap-3 bg-slate-50 px-4 py-2 rounded-full border border-slate-200 focus-within:border-cyan-400 focus-within:ring-2 focus-within:ring-cyan-100 transition-all">
                            <Search size={18} className="text-slate-400" />
                            <input
                                type="text"
                                placeholder="Buscar..."
                                className="bg-transparent border-none text-sm text-slate-600 placeholder:text-slate-400 focus:outline-none w-48"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="text-right hidden sm:block">
                                <p className="text-sm font-bold text-slate-800">{user.email}</p>
                                <p className="text-xs text-slate-500 font-medium">{user.medic_profile?.specialty || 'Médico'}</p>
                            </div>
                            <div className="w-10 h-10 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-full flex items-center justify-center text-white font-bold shadow-md shadow-cyan-200">
                                {user.email.substring(0, 2).toUpperCase()}
                            </div>
                        </div>
                    </div>
                </header>

                {/* Dashboard Content */}
                <div className="flex-1 overflow-y-auto p-8">

                    {activeTab === 'dashboard' && (
                        <div className="space-y-8 animate-fade-in">
                            {/* KPI Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                {stats.map((stat, idx) => (
                                    <div key={idx} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow group">
                                        <div className="flex justify-between items-start mb-4">
                                            <div className={`p-3 rounded-xl ${stat.color} bg-opacity-10 text-${stat.color.split('-')[1]}-600`}>
                                                <stat.icon size={24} />
                                            </div>
                                            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-50 text-slate-500 border border-slate-100">{stat.trend}</span>
                                        </div>
                                        <div>
                                            <h3 className="text-slate-500 text-sm font-medium mb-1">{stat.label}</h3>
                                            <p className="text-2xl font-bold text-slate-800">{stat.value}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Appointments Table */}
                            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                                <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                        <Activity size={20} className="text-cyan-500" />
                                        Agenda de Turnos
                                    </h3>
                                    <div className="flex gap-2">
                                        <button className="px-4 py-2 bg-slate-50 text-slate-600 text-sm font-medium rounded-lg border border-slate-200 hover:bg-slate-100 flex items-center gap-2">
                                            <Filter size={16} />
                                            Filtrar
                                        </button>
                                    </div>
                                </div>

                                {loading ? <div className="p-12 text-center text-gray-500">Cargando agenda...</div> : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left">
                                            <thead className="bg-slate-50/50 text-slate-500 uppercase text-[11px] font-bold tracking-wider">
                                                <tr>
                                                    <th className="px-6 py-4">Paciente</th>
                                                    <th className="px-6 py-4">Horario</th>
                                                    <th className="px-6 py-4">Motivo / Síntomas</th>
                                                    <th className="px-6 py-4">Estado</th>
                                                    <th className="px-6 py-4 text-right">Acciones</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {filteredAppointments.length > 0 ? filteredAppointments.map(appt => (
                                                    <tr key={appt.id} className="hover:bg-slate-50/80 transition-colors group">
                                                        <td className="px-6 py-4">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-sm">
                                                                    <User size={18} />
                                                                </div>
                                                                <div>
                                                                    <div className="text-sm font-bold text-slate-800">{appt.patient?.email || 'Desconocido'}</div>
                                                                    <div className="text-[11px] text-slate-400 font-medium">ID: #{appt.patient_id?.toString().padStart(4, '0')}</div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="flex flex-col">
                                                                <span className="text-sm font-bold text-slate-700">{new Date(appt.datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                                <span className="text-xs text-slate-400 font-medium">{new Date(appt.datetime).toLocaleDateString()}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <p className="text-sm text-slate-600 max-w-xs truncate">{appt.symptoms || "Control General"}</p>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${getStatusColor(appt.status)}`}>
                                                                {appt.status}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 text-right">
                                                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                {appt.status === 'Confirmado' && (
                                                                    <>
                                                                        <button
                                                                            onClick={() => handleStatusChange(appt.id, 'Realizado')}
                                                                            className="p-2 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition-colors"
                                                                            title="Finalizar Turno"
                                                                        >
                                                                            <CheckCircle size={18} />
                                                                        </button>
                                                                        <button
                                                                            onClick={() => handleStatusChange(appt.id, 'Cancelado')}
                                                                            className="p-2 bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-100 transition-colors"
                                                                            title="Cancelar Turno"
                                                                        >
                                                                            <XCircle size={18} />
                                                                        </button>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )) : (
                                                    <tr>
                                                        <td colSpan="5" className="p-12 text-center">
                                                            <div className="flex flex-col items-center justify-center text-slate-400">
                                                                <Calendar size={48} className="mb-4 opacity-20" />
                                                                <p className="text-sm font-medium">No hay turnos programados.</p>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'patients' && (
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center">
                            <div className="flex flex-col items-center justify-center text-slate-400">
                                <Users size={64} className="mb-6 opacity-20" />
                                <h3 className="text-lg font-bold text-slate-700 mb-2">Directorio de Pacientes</h3>
                                <p className="text-slate-500 max-w-md mx-auto">Próximamente podrás ver el historial clínico y detalles de todos tus pacientes aquí.</p>
                            </div>
                        </div>
                    )}

                    {activeTab === 'profile' && (
                        <div className="max-w-3xl mx-auto bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-fade-in">
                            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                                <h3 className="text-lg font-bold text-slate-800">Mi Perfil Profesional</h3>
                                <button onClick={handleSaveProfile} className="px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 flex items-center gap-2 transition-all">
                                    <Save size={18} />
                                    Guardar Cambios
                                </button>
                            </div>
                            <div className="p-8 space-y-8">
                                {/* Basic Info */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="col-span-2">
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Biografía Profesional</label>
                                        <textarea
                                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-cyan-100 focus:border-cyan-400 transition-all outline-none"
                                            rows="3"
                                            value={profileData.bio}
                                            onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
                                            placeholder="Describa su experiencia..."
                                        ></textarea>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Especialidad</label>
                                        <input
                                            type="text"
                                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-cyan-100 focus:border-cyan-400 transition-all outline-none"
                                            value={profileData.specialty}
                                            onChange={(e) => setProfileData({ ...profileData, specialty: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Matrícula</label>
                                        <input
                                            type="text"
                                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-cyan-100 focus:border-cyan-400 transition-all outline-none"
                                            value={profileData.license_number}
                                            onChange={(e) => setProfileData({ ...profileData, license_number: e.target.value })}
                                        />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Dirección del Consultorio</label>
                                        <input
                                            type="text"
                                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-cyan-100 focus:border-cyan-400 transition-all outline-none"
                                            value={profileData.address}
                                            onChange={(e) => setProfileData({ ...profileData, address: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="border-t border-slate-100 pt-8">
                                    <h4 className="text-base font-bold text-slate-800 mb-6 flex items-center gap-2">
                                        <Clock size={20} className="text-cyan-500" />
                                        Configuración de Agenda
                                    </h4>

                                    <div className="mb-6">
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-3">Días de Atención</label>
                                        <div className="flex flex-wrap gap-2">
                                            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                                                <button
                                                    key={day}
                                                    onClick={() => toggleDay(day)}
                                                    className={`px-4 py-2 rounded-lg text-sm font-bold border transition-all ${profileData.schedule_days.includes(day) ? 'bg-cyan-100 border-cyan-200 text-cyan-700' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'}`}
                                                >
                                                    {{ 'Mon': 'Lun', 'Tue': 'Mar', 'Wed': 'Mié', 'Thu': 'Jue', 'Fri': 'Vie', 'Sat': 'Sáb', 'Sun': 'Dom' }[day]}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-3">Duración del Turno</label>
                                        <select
                                            className="w-full md:w-1/2 p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-cyan-400"
                                            value={profileData.slot_duration}
                                            onChange={(e) => setProfileData({ ...profileData, slot_duration: parseInt(e.target.value) })}
                                        >
                                            <option value="15">15 Minutos</option>
                                            <option value="20">20 Minutos</option>
                                            <option value="30">30 Minutos</option>
                                            <option value="45">45 Minutos</option>
                                            <option value="60">60 Minutos</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                </div>
            </main>
        </div>
    );
}
