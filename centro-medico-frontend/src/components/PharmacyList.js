import React, { useEffect, useState } from 'react';
import { getPharmaciesOnDuty } from '../api';
import { MapPin, Phone, Clock } from 'lucide-react';

export default function PharmacyList() {
    const [pharmacies, setPharmacies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Hardcode location 1 (Salta) for demo, ideally from user context
    const locationId = 1;

    useEffect(() => {
        loadPharmacies();
    }, []);

    const loadPharmacies = async () => {
        try {
            setLoading(true);
            const data = await getPharmaciesOnDuty(locationId);
            setPharmacies(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="p-8 text-center text-gray-500">Buscando farmacias...</div>;

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {pharmacies.map((pharmacy) => (
                <div key={pharmacy.id} className="bg-white p-5 rounded-xl shadow-sm border border-green-100 hover:border-green-300 transition-colors relative overflow-hidden">
                    <div className="absolute top-0 right-0 bg-green-500 text-white text-xs px-3 py-1 rounded-bl-lg font-bold">
                        DE TURNO
                    </div>

                    <h3 className="font-bold text-lg text-gray-800 mb-3 flex items-center">
                        <span className="bg-green-100 p-2 rounded-full mr-3 text-green-600">💊</span>
                        Farmacia #{pharmacy.id}
                    </h3>

                    <div className="space-y-2 text-sm text-gray-600">
                        <div className="flex items-start">
                            <MapPin size={16} className="mr-2 mt-1 flex-shrink-0 text-gray-400" />
                            <span>{pharmacy.address}</span>
                        </div>

                        {pharmacy.phone && (
                            <div className="flex items-center">
                                <Phone size={16} className="mr-2 text-gray-400" />
                                <span>{pharmacy.phone}</span>
                            </div>
                        )}
                        <div className="flex items-center text-green-600 font-medium">
                            <Clock size={16} className="mr-2" />
                            <span>Abierto 24hs hoy</span>
                        </div>
                    </div>
                </div>
            ))}

            {pharmacies.length === 0 && !error && (
                <div className="col-span-full text-center py-10 bg-gray-50 rounded-lg">
                    <p className="text-gray-500">No hay farmacias registradas de turno hoy en esta zona.</p>
                </div>
            )}
        </div>
    );
}
