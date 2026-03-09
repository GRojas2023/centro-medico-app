import React, { useState, useEffect } from 'react';
import { fetchCurrentUser } from './api';
import AuthModal from './components/AuthModal';
import Feed from './components/Feed';
import PharmacyList from './components/PharmacyList';
import AIChat from './components/AIChat';
import AppointmentsContainer from './components/AppointmentsContainer';
import AdminDashboard from './components/AdminDashboard';
import MedicDashboard from './components/MedicDashboard';
import PatientAppointments from './components/PatientAppointments';
import LandingPage from './components/LandingPage';
import { LayoutGrid, Pill, MessageSquareMore, LogOut, User as UserIcon, Calendar, Stethoscope } from 'lucide-react';

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(!!token); // Initial loading if token exists
  const [activeTab, setActiveTab] = useState('medics');
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [initialSearch, setInitialSearch] = useState('');

  const handleLandingSearch = (term) => {
    setInitialSearch(term);
    setIsAuthOpen(true);
  };

  useEffect(() => {
    if (token) {
      loadUser();
    } else {
      setLoading(false);
    }
  }, [token]);

  const loadUser = async () => {
    setLoading(true);
    try {
      const userData = await fetchCurrentUser();
      setUser(userData);
    } catch {
      handleLogout();
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    setLoading(false);
  };

  // --- RENDERING HELPERS ---

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8 bg-gray-50 h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
        <p className="text-gray-500">Cargando perfil...</p>
      </div>
    );
  }

  // 1. Full Screen Layouts (Admin)
  if (user?.role === 'admin') {
    return <AdminDashboard />;
  }

  // 2. Standard Layout (Medics / Patients / Landing)
  const renderMainContent = () => {
    if (!token) {
      // Landing Page
      return <LandingPage onLoginClick={() => setIsAuthOpen(true)} onSearch={handleLandingSearch} />;
    }

    if (user?.role === 'medic') {
      return <MedicDashboard user={user} />;
    }

    // Patient View
    switch (activeTab) {
      case 'medics': return <AppointmentsContainer initialSearch={initialSearch} />;
      case 'pharmacies': return <PharmacyList />;
      case 'appointments': return <PatientAppointments />;
      default: return <AppointmentsContainer initialSearch={initialSearch} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900">
      {/* Header (Only for Medics/Patients) */}
      {token && (
        <header className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
          <div className="container mx-auto px-4 h-16 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-cyan-400 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">M</span>
              </div>
              <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-500 to-blue-600">
                MedDirect
              </h1>
            </div>

            <div className="flex items-center space-x-4">
              {user && (
                <div className="flex items-center space-x-2 text-sm text-gray-600 bg-gray-100 px-3 py-1.5 rounded-full">
                  <UserIcon size={16} />
                  <span className="font-medium hidden sm:inline">{user.email}</span>
                </div>
              )}

              <button
                onClick={handleLogout}
                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
                title="Cerrar sesión"
              >
                <LogOut size={20} />
              </button>
            </div>
          </div>
        </header>
      )}

      {/* Main Container */}
      <main className="container mx-auto px-4 py-8">
        {/* Navigation Tabs (Only for Patients when logged in) */}
        {token && !loading && (!user || (user.role !== 'admin' && user.role !== 'medic')) && (
          <div className="min-h-[4rem] mb-8 flex justify-center">
            <div className="bg-white p-1.5 rounded-2xl shadow-sm border border-gray-200 flex flex-col md:flex-row space-y-1 md:space-y-0 md:space-x-1 w-full max-w-lg">
              <button
                onClick={() => setActiveTab('medics')}
                className={`flex-1 flex items-center justify-center space-x-2 py-2.5 px-4 rounded-xl text-sm font-semibold transition-all ${activeTab === 'medics' ? 'bg-cyan-100 text-cyan-700 shadow-sm' : 'text-gray-500 hover:bg-gray-50'}`}
              >
                <Stethoscope size={18} />
                <span>Médicos</span>
              </button>
              <button
                onClick={() => setActiveTab('pharmacies')}
                className={`flex-1 flex items-center justify-center space-x-2 py-2.5 px-4 rounded-xl text-sm font-semibold transition-all ${activeTab === 'pharmacies' ? 'bg-green-100 text-green-700 shadow-sm' : 'text-gray-500 hover:bg-gray-50'}`}
              >
                <Pill size={18} />
                <span>Farmacias</span>
              </button>
              <button
                onClick={() => setActiveTab('appointments')}
                className={`flex-1 flex items-center justify-center space-x-2 py-2.5 px-4 rounded-xl text-sm font-semibold transition-all ${activeTab === 'appointments' ? 'bg-blue-100 text-blue-700 shadow-sm' : 'text-gray-500 hover:bg-gray-50'}`}
              >
                <Calendar size={18} />
                <span>Turnos</span>
              </button>
            </div>
          </div>
        )}

        {renderMainContent()}
      </main>

      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onLoginSuccess={(token) => {
          setToken(token);
          setIsAuthOpen(false);
        }}
      />
    </div>
  );
}
