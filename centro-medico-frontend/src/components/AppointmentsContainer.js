import React, { useState } from 'react';
import MedicDirectory from './MedicDirectory';
import MedicProfileView from './MedicProfileView';

export default function AppointmentsContainer({ initialSearch }) {
    const [view, setView] = useState('directory'); // 'directory' | 'profile'
    const [selectedMedic, setSelectedMedic] = useState(null);

    const handleSelectMedic = (medic) => {
        setSelectedMedic(medic);
        setView('profile');
    };

    const handleBack = () => {
        setSelectedMedic(null);
        setView('directory');
    };

    return (
        <div className="container mx-auto">
            {view === 'directory' && (
                <MedicDirectory onSelectMedic={handleSelectMedic} initialSearch={initialSearch} />
            )}

            {view === 'profile' && selectedMedic && (
                <MedicProfileView
                    medic={selectedMedic}
                    onBack={handleBack}
                />
            )}
        </div>
    );
}
