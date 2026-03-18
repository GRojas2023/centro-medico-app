import React, { useState } from 'react';
import { loginUser, registerUser } from '../api';
import { X, Eye, EyeOff } from 'lucide-react';

export default function AuthModal({ isOpen, onClose, onLoginSuccess }) {
    const [isLogin, setIsLogin] = useState(true);

    // Auth state
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    // UI state
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    const resetForm = () => {
        setEmail('');
        setPassword('');
        setError('');
    };

    const toggleMode = () => {
        setIsLogin(!isLogin);
        resetForm();
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            if (isLogin) {
                // Login: llama a POST /token en el backend
                const data = await loginUser(email, password);
                const token = data.access_token;
                localStorage.setItem('token', token);
                onLoginSuccess(token);
                onClose();
            } else {
                // Registro: crea usuario como paciente en POST /users/
                await registerUser({ email, password, role: 'patient' });
                // Luego login automático
                const data = await loginUser(email, password);
                const token = data.access_token;
                localStorage.setItem('token', token);
                onLoginSuccess(token);
                onClose();
            }
        } catch (err) {
            setError(err.message || 'Ocurrió un error. Intentá de nuevo.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 relative max-h-[90vh] overflow-y-auto">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                >
                    <X size={24} />
                </button>

                <h2 className="text-2xl font-bold text-center mb-6 text-blue-900">
                    {isLogin ? 'Bienvenido a SaltaSalud' : 'Crear Cuenta'}
                </h2>

                {error && (
                    <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Correo electrónico</label>
                        <input
                            id="auth-email"
                            name="email"
                            type="email"
                            required
                            autoComplete="email"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="correo@ejemplo.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
                        <div className="relative">
                            <input
                                id="auth-password"
                                name="password"
                                type={showPassword ? 'text' : 'password'}
                                required
                                minLength={6}
                                autoComplete={isLogin ? 'current-password' : 'new-password'}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none pr-10"
                                placeholder="••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                            </button>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg transition-colors disabled:opacity-50 mt-6"
                    >
                        {loading
                            ? (isLogin ? 'Iniciando...' : 'Registrando...')
                            : (isLogin ? 'Iniciar Sesión' : 'Registrarse')
                        }
                    </button>
                </form>

                <div className="mt-6 text-center">
                    <button
                        type="button"
                        onClick={toggleMode}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                        {isLogin
                            ? '¿Eres nuevo paciente? Crear cuenta'
                            : '¿Ya tienes cuenta? Iniciar sesión'
                        }
                    </button>
                </div>
            </div>
        </div>
    );
}
