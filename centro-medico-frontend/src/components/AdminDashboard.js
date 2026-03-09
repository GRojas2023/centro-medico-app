import React, { useState, useEffect } from 'react';
import { adminGetUsers, adminCreateUser, adminDeleteUser, adminCreatePost, getFeed, adminUpdateMedicProfile, adminUpdatePharmacyProfile, uploadImage } from '../api';
import { User, Trash2, UserPlus, ShieldAlert, Pill, FileText, Megaphone, Send, Edit, Save, X, Calendar, Clock, Upload } from 'lucide-react';

export default function AdminDashboard() {
    const [activeTab, setActiveTab] = useState('medics'); // 'medics' | 'pharmacies' | 'feed'
    const [loading, setLoading] = useState(false);
    const [showForm, setShowForm] = useState(false);

    // Data State
    const [medics, setMedics] = useState([]);
    const [pharmacies, setPharmacies] = useState([]);
    const [feedPosts, setFeedPosts] = useState([]);

    // Forms State
    const [newUser, setNewUser] = useState({ email: '', password: '' });
    const [newPost, setNewPost] = useState({ content: '', category: 'Aviso', image_url: '' });

    // Edit Medic State
    const [editingMedic, setEditingMedic] = useState(null);
    const [editFormData, setEditFormData] = useState({});
    const [editTab, setEditTab] = useState('general'); // 'general' | 'agenda' | 'blocked'

    // Edit Pharmacy State
    const [editingPharmacy, setEditingPharmacy] = useState(null);
    const [pharmacyFormData, setPharmacyFormData] = useState({});

    useEffect(() => {
        loadData();
    }, [activeTab]);

    const loadData = async () => {
        setLoading(true);
        try {
            if (activeTab === 'medics') {
                const data = await adminGetUsers('medic');
                setMedics(data);
            } else if (activeTab === 'pharmacies') {
                const data = await adminGetUsers('pharmacy');
                setPharmacies(data);
            } else if (activeTab === 'feed') {
                const data = await getFeed();
                setFeedPosts(data);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteUser = async (id) => {
        if (!window.confirm("¿Seguro que deseas eliminar este usuario?")) return;
        try {
            await adminDeleteUser(id);
            loadData();
        } catch (err) {
            alert("Error eliminando usuario");
        }
    };

    const handleCreateUser = async (e, role) => {
        e.preventDefault();
        try {
            await adminCreateUser({ ...newUser, role: role, location_id: 1 });
            setShowForm(false);
            setNewUser({ email: '', password: '' });
            loadData();
            alert(`${role === 'medic' ? 'Médico' : 'Farmacia'} creado con éxito`);
        } catch (err) {
            alert(err.message);
        }
    };

    const handleCreatePost = async (e) => {
        e.preventDefault();
        try {
            await adminCreatePost(newPost);
            setShowForm(false);
            setNewPost({ content: '', category: 'Aviso', image_url: '' });
            loadData();
            alert("Novedad publicada con éxito");
        } catch (err) {
            alert(err.message);
        }
    };

    const openEditMedic = (medic) => {
        setEditingMedic(medic);
        const shifts = medic.medic_profile?.shifts && medic.medic_profile.shifts.length > 0
            ? medic.medic_profile.shifts
            : [];

        setEditFormData({
            specialty: medic.medic_profile?.specialty || '',
            license_number: medic.medic_profile?.license_number || '',
            bio: medic.medic_profile?.bio || '',
            address: medic.medic_profile?.address || '',
            start_time: medic.medic_profile?.start_time || '09:00',
            end_time: medic.medic_profile?.end_time || '17:00',
            slot_duration: medic.medic_profile?.slot_duration || 30,
            schedule_days: medic.medic_profile?.schedule_days || 'Mon,Tue,Wed,Thu,Fri',
            blocked_dates: medic.medic_profile?.blocked_dates || '',
            profile_image_url: medic.medic_profile?.profile_image_url || '',
            shifts: shifts.map((s, i) => ({ ...s, _uiId: Date.now() + i }))
        });
        setEditTab('general');
    };

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            const { url } = await uploadImage(file);
            setEditFormData(prev => ({ ...prev, profile_image_url: url }));
        } catch (err) {
            alert("Error subiendo imagen: " + err.message);
        }
    };

    const handleSaveMedic = async () => {
        try {
            // Strip UI-only IDs from shifts before sending
            const dataToSend = { ...editFormData };
            if (dataToSend.shifts) {
                // Remove _uiId to avoid backend validation errors
                dataToSend.shifts = dataToSend.shifts.map(({ _uiId, ...rest }) => rest);
            }

            await adminUpdateMedicProfile(editingMedic.id, dataToSend);
            setEditingMedic(null);
            loadData();
            alert("Perfil actualizado correctamente");
        } catch (err) {
            alert("Error actualizando perfil: " + err.message);
        }
    };

    const toggleDay = (day) => {
        let days = editFormData.schedule_days.split(',').filter(d => d);
        if (days.includes(day)) {
            days = days.filter(d => d !== day);
        } else {
            days.push(day);
        }
        setEditFormData({ ...editFormData, schedule_days: days.join(',') });
    };

    const openEditPharmacy = (pharmacy) => {
        setEditingPharmacy(pharmacy);
        setPharmacyFormData({
            address: pharmacy.pharmacy_profile?.address || '',
            phone: pharmacy.pharmacy_profile?.phone || '',
            is_on_duty: pharmacy.pharmacy_profile?.is_on_duty || false
        });
    };

    const handleSavePharmacy = async () => {
        try {
            await adminUpdatePharmacyProfile(editingPharmacy.id, pharmacyFormData);
            setEditingPharmacy(null);
            loadData();
            alert("Farmacia actualizada correctamente");
        } catch (err) {
            alert("Error actualizando farmacia: " + err.message);
        }
    };

    // --- RENDER HELPERS ---
    const SidebarItem = ({ id, icon: Icon, label, active }) => (
        <button
            onClick={() => { setActiveTab(id); setShowForm(false); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 font-medium ${active ? 'bg-gradient-to-r from-[#13ecec]/20 to-[#13ecec]/5 text-[#102222] shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900 group'}`}
        >
            <Icon size={20} className={`${active ? 'text-[#102222]' : 'text-slate-400 group-hover:text-cyan-500'} transition-colors`} />
            <span className="text-sm tracking-tight">{label}</span>
            {active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[#13ecec]" />}
        </button>
    );

    return (
        <div className="flex h-screen overflow-hidden bg-[#f6f8f8] font-sans">
            {/* Sidebar Navigation */}
            <aside className="w-64 bg-white border-r border-slate-200 flex flex-col hidden md:flex">
                <div className="p-6 flex items-center gap-3">
                    <div className="bg-[#13ecec] p-2 rounded-lg">
                        <User className="text-[#102222]" size={24} />
                    </div>
                    <h1 className="text-xl font-extrabold tracking-tight text-slate-900 leading-none">MedDirect</h1>
                </div>

                <nav className="flex-1 px-4 py-4 space-y-6 overflow-y-auto">
                    <div>
                        <p className="px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Principal</p>
                        <div className="space-y-1">
                            <SidebarItem id="dashboard" icon={FileText} label="Resumen General" active={activeTab === 'dashboard'} />
                        </div>
                    </div>

                    <div>
                        <p className="px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Gestión</p>
                        <div className="space-y-1">
                            <SidebarItem id="medics" icon={User} label="Médicos" active={activeTab === 'medics'} />
                            <SidebarItem id="pharmacies" icon={Pill} label="Farmacias" active={activeTab === 'pharmacies'} />
                        </div>
                    </div>

                    <div>
                        <p className="px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Comunicación</p>
                        <div className="space-y-1">
                            <SidebarItem id="feed" icon={Megaphone} label="Novedades" active={activeTab === 'feed'} />
                        </div>
                    </div>
                </nav>

                <div className="p-4 border-t border-slate-200">
                    <button onClick={() => { localStorage.removeItem('token'); window.location.reload(); }} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-red-500 hover:bg-red-50 transition-colors">
                        <span className="material-symbols-outlined text-sm font-medium">Cerrar Sesión</span>
                    </button>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
                {/* Top Header */}
                <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0">
                    <div className="flex items-center gap-4">
                        <h2 className="text-xl font-bold text-gray-800 capitalize">{activeTab === 'dashboard' ? 'Resumen General' : activeTab}</h2>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="text-right hidden sm:block">
                            <p className="text-sm font-bold text-slate-900 leading-none">Admin Global</p>
                            <p className="text-xs text-slate-500 mt-0.5 leading-none">admin@meddirect.com</p>
                        </div>
                        <div className="h-10 w-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 font-bold border-2 border-[#13ecec]">AD</div>
                    </div>
                </header>

                {/* Scrollable Content Area */}
                <div className="flex-1 overflow-y-auto p-8 space-y-8">

                    {/* Dashboard KPI Cards (Only on Dashboard Tab) */}
                    {activeTab === 'dashboard' && (
                        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="p-2 bg-[#13ecec]/20 rounded-lg text-[#102222]">
                                        <User size={20} />
                                    </div>
                                    <span className="text-xs font-bold text-emerald-500 flex items-center gap-1">+5.2%</span>
                                </div>
                                <p className="text-sm font-medium text-slate-500">Total Usuarios</p>
                                <h3 className="text-2xl font-extrabold text-slate-900 mt-1 tracking-tight">12,450</h3>
                            </div>
                            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                                        <Pill size={20} />
                                    </div>
                                </div>
                                <p className="text-sm font-medium text-slate-500">Farmacias Activas</p>
                                <h3 className="text-2xl font-extrabold text-slate-900 mt-1 tracking-tight">842</h3>
                            </div>
                        </section>
                    )}

                    {/* CONTENT SECTIONS */}

                    {/* Action Bar for Lists */}
                    {(activeTab === 'medics' || activeTab === 'pharmacies' || activeTab === 'feed') && (
                        <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                            <h3 className="text-lg font-bold text-slate-700">
                                {activeTab === 'medics' ? 'Listado de Médicos' : activeTab === 'pharmacies' ? 'Listado de Farmacias' : 'Feed de Novedades'}
                            </h3>
                            <button onClick={() => setShowForm(!showForm)} className="bg-[#13ecec] hover:bg-[#0fd9d9] text-[#102222] px-4 py-2 rounded-lg flex items-center gap-2 font-bold shadow-sm transition-all text-sm">
                                {showForm ? 'Cancelar' : (activeTab === 'medics' ? <><UserPlus size={18} /> Nuevo Médico</> : activeTab === 'pharmacies' ? <><UserPlus size={18} /> Nueva Farmacia</> : <><FileText size={18} /> Publicar</>)}
                            </button>
                        </div>
                    )}

                    {/* Creation Forms */}
                    {showForm && (
                        <div className="bg-white p-6 rounded-xl shadow-lg border border-blue-100 animate-fade-in-down">
                            {activeTab === 'feed' ? (
                                <form onSubmit={handleCreatePost} className="space-y-4">
                                    <input type="text" placeholder="Contenido de prueba" className="w-full border p-2 rounded" value={newPost.content} onChange={e => setNewPost({ ...newPost, content: e.target.value })} required />
                                    <button type="submit" className="bg-purple-600 text-white px-4 py-2 rounded">Publicar</button>
                                </form>
                            ) : (
                                <form onSubmit={(e) => handleCreateUser(e, activeTab === 'medics' ? 'medic' : 'pharmacy')} className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <input type="email" placeholder="Email" className="border p-2 rounded" value={newUser.email} onChange={e => setNewUser({ ...newUser, email: e.target.value })} required />
                                        <input type="password" placeholder="Password" className="border p-2 rounded" value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })} required />
                                    </div>
                                    <button type="submit" className="bg-emerald-600 text-white px-4 py-2 rounded">Crear Usuario</button>
                                </form>
                            )}
                        </div>
                    )}

                    {/* Tables / Lists */}
                    {(activeTab === 'medics' || activeTab === 'pharmacies' || activeTab === 'feed') && (
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                            {loading ? <div className="p-8 text-center text-gray-500">Cargando...</div> : (
                                <table className="w-full text-left">
                                    <thead className="bg-slate-50 text-slate-500 uppercase text-[11px] font-bold">
                                        <tr><th className="px-6 py-3">Info</th><th className="px-6 py-3 text-right">Acciones</th></tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {(activeTab === 'medics' ? medics : activeTab === 'pharmacies' ? pharmacies : feedPosts).map(item => (
                                            <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                                                <td className="px-6 py-4">
                                                    {activeTab === 'feed' ? item.content : (
                                                        <div className="flex items-center gap-3">
                                                            <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-xs uppercase">
                                                                {item.email.substring(0, 2)}
                                                            </div>
                                                            <div>
                                                                <div className="text-sm font-bold text-slate-900">{item.email}</div>
                                                                <div className="text-[10px] text-slate-400 capitalize">{item.role}</div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-right flex justify-end gap-2">
                                                    {activeTab === 'medics' && (
                                                        <button onClick={() => openEditMedic(item)} className="p-1 text-blue-600 hover:bg-blue-50 rounded" title="Editar Agenda">
                                                            <Edit size={18} />
                                                        </button>
                                                    )}
                                                    {activeTab === 'pharmacies' && (
                                                        <button onClick={() => openEditPharmacy(item)} className="p-1 text-green-600 hover:bg-green-50 rounded" title="Editar Farmacia">
                                                            <Edit size={18} />
                                                        </button>
                                                    )}
                                                    <button onClick={() => handleDeleteUser(item.id)} className="p-1 text-red-400 hover:bg-red-50 rounded"><Trash2 size={18} /></button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    )}
                </div>
            </main>

            {/* KEEP EXISTING MODALS (Medic & Pharmacy Edit) */}
            {/* EDIT MEDIC MODAL */}
            {editingMedic && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white z-10">
                            <h2 className="text-xl font-bold text-gray-800">Editar Perfil: {editingMedic.email}</h2>
                            <button onClick={() => setEditingMedic(null)} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
                        </div>

                        <div className="p-6">
                            <div className="flex gap-4 mb-6 border-b border-gray-200">
                                <button onClick={() => setEditTab('general')} className={`pb-2 px-1 font-medium text-sm ${editTab === 'general' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}>General</button>
                                <button onClick={() => setEditTab('agenda')} className={`pb-2 px-1 font-medium text-sm ${editTab === 'agenda' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}>Agenda</button>
                                <button onClick={() => setEditTab('blocked')} className={`pb-2 px-1 font-medium text-sm ${editTab === 'blocked' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}>Bloqueos</button>
                            </div>

                            {editTab === 'general' && (
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Foto de Perfil</label>
                                        <div className="flex items-center gap-4">
                                            {editFormData.profile_image_url && (
                                                <img src={editFormData.profile_image_url} alt="Profile" className="w-16 h-16 rounded-full object-cover border border-gray-200" />
                                            )}
                                            <label className="cursor-pointer bg-gray-50 hover:bg-gray-100 px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium text-gray-700 transition-colors border border-gray-200">
                                                <Upload size={16} /> {editFormData.profile_image_url ? 'Cambiar Imagen' : 'Subir Imagen'}
                                                <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                                            </label>
                                        </div>
                                    </div>
                                    <div><label className="block text-sm font-medium text-gray-700">Especialidad</label><input type="text" className="w-full border p-2 rounded" value={editFormData.specialty} onChange={e => setEditFormData({ ...editFormData, specialty: e.target.value })} /></div>
                                    <div><label className="block text-sm font-medium text-gray-700">Matrícula</label><input type="text" className="w-full border p-2 rounded" value={editFormData.license_number} onChange={e => setEditFormData({ ...editFormData, license_number: e.target.value })} /></div>
                                    <div><label className="block text-sm font-medium text-gray-700">Dirección</label><input type="text" className="w-full border p-2 rounded" value={editFormData.address} onChange={e => setEditFormData({ ...editFormData, address: e.target.value })} /></div>
                                    <div><label className="block text-sm font-medium text-gray-700">Biografía</label><textarea className="w-full border p-2 rounded h-20" value={editFormData.bio} onChange={e => setEditFormData({ ...editFormData, bio: e.target.value })} /></div>
                                </div>
                            )}

                            {editTab === 'agenda' && (
                                <div className="space-y-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Días de Atención (Global)</label>
                                        <div className="flex gap-2 flex-wrap">
                                            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                                                <button key={day} onClick={() => toggleDay(day)} className={`px-3 py-1 rounded-full text-sm border ${editFormData.schedule_days.includes(day) ? 'bg-blue-100 border-blue-200 text-blue-700' : 'bg-gray-50 border-gray-200 text-gray-600'}`}>
                                                    {{ 'Mon': 'Lun', 'Tue': 'Mar', 'Wed': 'Mié', 'Thu': 'Jue', 'Fri': 'Vie', 'Sat': 'Sáb', 'Sun': 'Dom' }[day]}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Shifts Section */}
                                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                                        <div className="flex justify-between items-center mb-4">
                                            <label className="block text-sm font-medium text-gray-700">Rangos de Horario</label>
                                            <button
                                                onClick={() => setEditFormData({ ...editFormData, shifts: [...(editFormData.shifts || []), { start_time: "09:00", end_time: "13:00", day_of_week: null, _uiId: Date.now() }] })}
                                                className="text-xs flex items-center gap-1 bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200"
                                            >
                                                <UserPlus size={14} /> Agregar Rango
                                            </button>
                                        </div>

                                        <div className="space-y-3">
                                            {(editFormData.shifts || []).map((shift) => (
                                                <div key={shift._uiId} className="flex gap-2 items-center animate-fade-in">
                                                    <div className="flex-1">
                                                        <input
                                                            type="time"
                                                            className="w-full border p-2 rounded text-sm"
                                                            value={shift.start_time}
                                                            onChange={e => {
                                                                const newShifts = editFormData.shifts.map(s => s._uiId === shift._uiId ? { ...s, start_time: e.target.value } : s);
                                                                setEditFormData({ ...editFormData, shifts: newShifts });
                                                            }}
                                                        />
                                                    </div>
                                                    <span className="text-gray-400 font-bold">-</span>
                                                    <div className="flex-1">
                                                        <input
                                                            type="time"
                                                            className="w-full border p-2 rounded text-sm"
                                                            value={shift.end_time}
                                                            onChange={e => {
                                                                const newShifts = editFormData.shifts.map(s => s._uiId === shift._uiId ? { ...s, end_time: e.target.value } : s);
                                                                setEditFormData({ ...editFormData, shifts: newShifts });
                                                            }}
                                                        />
                                                    </div>
                                                    <button
                                                        onClick={() => {
                                                            const newShifts = editFormData.shifts.filter(s => s._uiId !== shift._uiId);
                                                            setEditFormData({ ...editFormData, shifts: newShifts });
                                                        }}
                                                        className="text-red-400 hover:text-red-600 p-2"
                                                        title="Eliminar rango"
                                                    >
                                                        <X size={16} />
                                                    </button>
                                                </div>
                                            ))}
                                            {(!editFormData.shifts || editFormData.shifts.length === 0) && (
                                                <p className="text-xs text-center text-gray-400 italic">No hay rangos definidos. Se usará el horario por defecto (09:00 - 17:00)</p>
                                            )}
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Duración Turno (min)</label>
                                        <select className="w-full border p-2 rounded" value={editFormData.slot_duration} onChange={e => setEditFormData({ ...editFormData, slot_duration: parseInt(e.target.value) })}>
                                            <option value="10">10 minutos</option>
                                            <option value="15">15 minutos</option>
                                            <option value="20">20 minutos</option>
                                            <option value="30">30 minutos</option>
                                            <option value="45">45 minutos</option>
                                            <option value="60">60 minutos</option>
                                        </select>
                                    </div>
                                </div>
                            )}

                            {editTab === 'blocked' && (
                                <div className="space-y-4">
                                    <p className="text-sm text-gray-500">Ingresa las fechas (YYYY-MM-DD) separadas por coma para bloquearlas.</p>
                                    <textarea className="w-full border p-2 rounded h-24 font-mono text-sm" value={editFormData.blocked_dates} onChange={e => setEditFormData({ ...editFormData, blocked_dates: e.target.value })} placeholder="2023-12-25,2024-01-01" />
                                </div>
                            )}
                        </div>
                        <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                            <button onClick={() => setEditingMedic(null)} className="px-4 py-2 text-gray-600 font-medium hover:bg-gray-200 rounded-lg">Cancelar</button>
                            <button onClick={handleSaveMedic} className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 flex items-center gap-2"><Save size={18} /> Guardar Cambios</button>
                        </div>
                    </div>
                </div>
            )}

            {/* EDIT PHARMACY MODAL */}
            {editingPharmacy && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-white rounded-t-xl">
                            <h2 className="text-xl font-bold text-gray-800">Editar Farmacia</h2>
                            <button onClick={() => setEditingPharmacy(null)} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
                        </div>

                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                <input type="text" className="w-full border p-2 rounded bg-gray-100" value={editingPharmacy.email} disabled />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
                                <input type="text" className="w-full border p-2 rounded" value={pharmacyFormData.address} onChange={e => setPharmacyFormData({ ...pharmacyFormData, address: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                                <input type="text" className="w-full border p-2 rounded" value={pharmacyFormData.phone} onChange={e => setPharmacyFormData({ ...pharmacyFormData, phone: e.target.value })} />
                            </div>
                            <div className="flex items-center gap-3 pt-2">
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" className="sr-only peer" checked={pharmacyFormData.is_on_duty} onChange={e => setPharmacyFormData({ ...pharmacyFormData, is_on_duty: e.target.checked })} />
                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                                    <span className="ml-3 text-sm font-medium text-gray-900">¿De Turno?</span>
                                </label>
                            </div>
                        </div>

                        <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 rounded-b-xl">
                            <button onClick={() => setEditingPharmacy(null)} className="px-4 py-2 text-gray-600 font-medium hover:bg-gray-200 rounded-lg">Cancelar</button>
                            <button onClick={handleSavePharmacy} className="px-6 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 flex items-center gap-2"><Save size={18} /> Guardar Cambios</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
