import React, { useState, useEffect, useMemo } from 'react';
import { getMedics } from '../api';
import {
    Search, MapPin, Stethoscope, User, Star, CheckCircle, ExternalLink,
    Clock, CalendarDays, ShieldCheck, Heart, Brain, Eye, Bone, Baby,
    List, Map, ChevronRight
} from 'lucide-react';
import './MedicDirectory.css';

const SPECIALTIES = [
    { key: 'cardiologia', label: 'Cardiología' },
    { key: 'pediatria', label: 'Pediatría' },
    { key: 'dermatologia', label: 'Dermatología' },
    { key: 'neurologia', label: 'Neurología' },
    { key: 'oftalmologia', label: 'Oftalmología' },
    { key: 'traumatologia', label: 'Traumatología' },
    { key: 'medicina general', label: 'Medicina General' },
];

const INSURANCES = [
    'OSDE', 'Swiss Medical', 'Galeno', 'Medifé'
];

const NEXT_SLOTS = [
    'Lunes 09:00', 'Lunes 14:00', 'Martes 10:30', 'Martes 16:00',
    'Miércoles 08:00', 'Miércoles 15:30', 'Jueves 11:00', 'Viernes 09:30',
];

export default function MedicDirectory({ onSelectMedic, initialSearch }) {
    const [medics, setMedics] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState(initialSearch || '');
    const [error, setError] = useState(null);

    // Filters
    const [selectedSpecialties, setSelectedSpecialties] = useState([]);
    const [availFilter, setAvailFilter] = useState('all'); // 'all' | 'today' | 'week' | 'month'
    const [minRating, setMinRating] = useState(null); // null | 4.0 | 4.5
    const [sortBy, setSortBy] = useState('rating');

    useEffect(() => { loadMedics(); }, []);
    useEffect(() => { if (initialSearch) setSearchTerm(initialSearch); }, [initialSearch]);

    const loadMedics = async () => {
        try {
            const data = await getMedics();
            setMedics(data);
        } catch (err) {
            setError('No se pudieron cargar los médicos.');
        } finally {
            setLoading(false);
        }
    };

    // Toggle specialty filter
    const toggleSpecialty = (key) => {
        setSelectedSpecialties(prev =>
            prev.includes(key) ? prev.filter(s => s !== key) : [...prev, key]
        );
    };

    const clearFilters = () => {
        setSelectedSpecialties([]);
        setAvailFilter('all');
        setMinRating(null);
        setSearchTerm('');
    };

    // Helpers
    const getMedicRating = (id) => (4.0 + (id % 10) / 10).toFixed(1);
    const getReviews = (id) => 40 + (id * 17) % 200;
    const getExperience = (id) => 3 + (id % 18);
    const getNextSlot = (id) => NEXT_SLOTS[id % NEXT_SLOTS.length];
    const formatName = (email) => {
        const raw = email.split('@')[0];
        return raw.charAt(0).toUpperCase() + raw.slice(1);
    };
    const getScheduleDays = (medic) => {
        const days = medic.medic_profile?.schedule_days || 'Lun-Vie';
        return days.replace(/Mon/g, 'Lun').replace(/Tue/g, 'Mar').replace(/Wed/g, 'Mié')
            .replace(/Thu/g, 'Jue').replace(/Fri/g, 'Vie').replace(/,/g, ', ');
    };

    const filteredMedics = useMemo(() => {
        let list = medics.filter(medic => {
            const name = medic.email.split('@')[0].toLowerCase();
            const specialty = medic.medic_profile?.specialty?.toLowerCase() || '';
            const term = searchTerm.toLowerCase();

            const matchesSearch = name.includes(term) || specialty.includes(term);
            const matchesSpecialty = selectedSpecialties.length === 0 ||
                selectedSpecialties.some(s => specialty.includes(s));
            const rating = parseFloat(getMedicRating(medic.id));
            const matchesRating = !minRating || rating >= minRating;

            return matchesSearch && matchesSpecialty && matchesRating;
        });

        // sort
        if (sortBy === 'rating') {
            list.sort((a, b) => parseFloat(getMedicRating(b.id)) - parseFloat(getMedicRating(a.id)));
        } else if (sortBy === 'experience') {
            list.sort((a, b) => getExperience(b.id) - getExperience(a.id));
        }

        return list;
    }, [medics, searchTerm, selectedSpecialties, minRating, sortBy]);

    // -- LOADING --
    if (loading) {
        return (
            <div className="meddir">
                <div className="meddir__layout">
                    <aside className="meddir__sidebar" />
                    <div className="meddir__main">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="meddir__skeleton-card">
                                <div className="meddir__skeleton-photo" />
                                <div className="meddir__skeleton-body">
                                    <div className="meddir__skeleton-line meddir__skeleton-line--lg" />
                                    <div className="meddir__skeleton-line meddir__skeleton-line--md" />
                                    <div className="meddir__skeleton-line meddir__skeleton-line--sm" />
                                    <div className="meddir__skeleton-line meddir__skeleton-line--btn" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="meddir">
                <div className="meddir__empty" style={{ paddingTop: '6rem' }}>
                    <div className="meddir__empty-icon"><Stethoscope size={32} /></div>
                    <h3>{error}</h3>
                    <p>Intentá recargar la página.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="meddir">
            <div className="meddir__layout">

                {/* ============ SIDEBAR FILTERS ============ */}
                <aside className="meddir__sidebar">
                    <div className="meddir__sidebar-inner">
                        <div className="meddir__sidebar-header">
                            <h2 className="meddir__sidebar-title">Filtros</h2>
                            <button className="meddir__sidebar-clear" onClick={clearFilters}>Limpiar</button>
                        </div>

                        {/* Specialty */}
                        <div className="meddir__filter-section">
                            <p className="meddir__filter-label">
                                <Stethoscope size={16} className="meddir__filter-icon" />
                                Especialidad
                            </p>
                            <div className="meddir__filter-options">
                                {SPECIALTIES.map(sp => (
                                    <label key={sp.key} className="meddir__check-item">
                                        <input
                                            type="checkbox"
                                            checked={selectedSpecialties.includes(sp.key)}
                                            onChange={() => toggleSpecialty(sp.key)}
                                        />
                                        <span>{sp.label}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Availability */}
                        <div className="meddir__filter-section">
                            <p className="meddir__filter-label">
                                <CalendarDays size={16} className="meddir__filter-icon" />
                                Disponibilidad
                            </p>
                            <div className="meddir__filter-options">
                                {[
                                    { key: 'today', label: 'Hoy' },
                                    { key: 'week', label: 'Esta semana' },
                                    { key: 'month', label: 'Este mes' },
                                ].map(opt => (
                                    <button
                                        key={opt.key}
                                        className={`meddir__avail-btn ${availFilter === opt.key ? 'meddir__avail-btn--active' : ''}`}
                                        onClick={() => setAvailFilter(availFilter === opt.key ? 'all' : opt.key)}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Rating */}
                        <div className="meddir__filter-section">
                            <p className="meddir__filter-label">
                                <Star size={16} className="meddir__filter-icon" />
                                Rating mínimo
                            </p>
                            <div className="meddir__filter-options">
                                {[4.5, 4.0].map(r => (
                                    <label key={r} className="meddir__check-item">
                                        <input
                                            type="radio"
                                            name="rating"
                                            checked={minRating === r}
                                            onChange={() => setMinRating(minRating === r ? null : r)}
                                        />
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                            {r}+ <Star size={13} fill="#facc15" color="#facc15" />
                                        </span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Insurance */}
                        <div className="meddir__filter-section" style={{ borderBottom: 'none' }}>
                            <p className="meddir__filter-label">
                                <ShieldCheck size={16} className="meddir__filter-icon" />
                                Obra Social
                            </p>
                            <div className="meddir__filter-options">
                                {INSURANCES.map(ins => (
                                    <label key={ins} className="meddir__check-item">
                                        <input type="checkbox" />
                                        <span>{ins}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>
                </aside>

                {/* ============ MAIN RESULTS ============ */}
                <section className="meddir__main">

                    {/* Header */}
                    <div className="meddir__header">
                        <div>
                            <nav className="meddir__breadcrumb">
                                <span>Inicio</span>
                                <ChevronRight size={12} />
                                <span>Búsqueda</span>
                                <ChevronRight size={12} />
                                <span className="meddir__breadcrumb-current">Especialistas</span>
                            </nav>
                            <h2 className="meddir__header-title">
                                {filteredMedics.length} especialista{filteredMedics.length !== 1 ? 's' : ''} encontrado{filteredMedics.length !== 1 ? 's' : ''}
                            </h2>
                            <p className="meddir__header-sub">Médicos disponibles en Salta Capital, Argentina</p>
                        </div>

                        <div className="meddir__view-toggle">
                            <button className="meddir__view-btn meddir__view-btn--active">
                                <List size={16} /> Lista
                            </button>
                            <button className="meddir__view-btn">
                                <Map size={16} /> Mapa
                            </button>
                        </div>
                    </div>

                    {/* Sort bar */}
                    <div className="meddir__sort-bar">
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                            <span className="meddir__sort-label">Ordenar por:</span>
                            <select
                                className="meddir__sort-select"
                                value={sortBy}
                                onChange={e => setSortBy(e.target.value)}
                            >
                                <option value="rating">Mejor valorados</option>
                                <option value="experience">Más experiencia</option>
                            </select>
                        </div>
                    </div>

                    {/* Search (mobile-friendly, above cards) */}
                    <div style={{ marginBottom: '1.25rem' }}>
                        <div style={{ position: 'relative' }}>
                            <Search size={18} style={{
                                position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)',
                                color: searchTerm ? '#0bbfbf' : '#94a3b8', transition: 'color .2s'
                            }} />
                            <input
                                type="text"
                                placeholder="Buscar por nombre, especialidad..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                style={{
                                    width: '100%', padding: '0.7rem 1rem 0.7rem 2.75rem',
                                    border: '1px solid #e2e8f0', borderRadius: '0.75rem',
                                    fontSize: '0.9rem', fontFamily: 'inherit', outline: 'none',
                                    background: '#fff', transition: 'border-color .2s',
                                }}
                                onFocus={e => e.target.style.borderColor = '#13ecec'}
                                onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                            />
                        </div>
                    </div>

                    {/* Doctor Cards */}
                    <div className="meddir__cards">
                        {filteredMedics.map(medic => {
                            const rating = getMedicRating(medic.id);
                            const reviews = getReviews(medic.id);
                            const experience = getExperience(medic.id);
                            const nextSlot = getNextSlot(medic.id);
                            const displayName = formatName(medic.email);
                            const isOnline = medic.id % 3 !== 0;
                            const specialty = medic.medic_profile?.specialty || 'Medicina General';

                            return (
                                <div key={medic.id} className="meddir__card">
                                    <div className="meddir__card-inner">
                                        {/* Photo */}
                                        <div className="meddir__card-photo-wrap">
                                            {medic.medic_profile?.profile_image_url ? (
                                                <img
                                                    className="meddir__card-photo"
                                                    src={medic.medic_profile.profile_image_url}
                                                    alt={`Dr. ${displayName}`}
                                                />
                                            ) : (
                                                <div className="meddir__card-avatar">
                                                    <User size={56} strokeWidth={1.2} />
                                                </div>
                                            )}
                                            <div className={`meddir__card-status ${isOnline ? 'meddir__card-status--online' : 'meddir__card-status--offline'}`} />
                                        </div>

                                        {/* Content */}
                                        <div className="meddir__card-content">
                                            <div className="meddir__card-top">
                                                <div>
                                                    <div className="meddir__card-name-row">
                                                        <h3 className="meddir__card-name">Dr. {displayName}</h3>
                                                        <CheckCircle size={16} className="meddir__card-verified" />
                                                    </div>
                                                    <p className="meddir__card-specialty">{specialty}</p>
                                                    <div className="meddir__card-badges">
                                                        <span className="meddir__badge meddir__badge--primary">{experience} Años Exp.</span>
                                                        {isOnline && (
                                                            <span className="meddir__badge meddir__badge--green">Disponible hoy</span>
                                                        )}
                                                        <span className="meddir__badge meddir__badge--neutral">
                                                            <Clock size={10} style={{ marginRight: 3, verticalAlign: 'middle' }} />
                                                            Próximo: {nextSlot}
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="meddir__card-right">
                                                    <div className="meddir__card-rating">
                                                        <span className="meddir__card-rating-val">{rating}</span>
                                                        <Star size={16} />
                                                        <span className="meddir__card-reviews">({reviews} reseñas)</span>
                                                    </div>
                                                    <p className="meddir__card-meta">Respuesta rápida</p>
                                                </div>
                                            </div>

                                            <div className="meddir__card-footer">
                                                <div className="meddir__card-location">
                                                    <MapPin size={16} />
                                                    <span>{medic.medic_profile?.address || 'Salta Capital, Argentina'}</span>
                                                    <ExternalLink size={11} />
                                                </div>

                                                <button
                                                    className="meddir__card-cta"
                                                    onClick={(e) => { e.stopPropagation(); onSelectMedic(medic); }}
                                                >
                                                    Reservar Cita
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}

                        {/* Empty */}
                        {filteredMedics.length === 0 && (
                            <div className="meddir__empty">
                                <div className="meddir__empty-icon"><Search size={32} strokeWidth={1.5} /></div>
                                <h3>No encontramos resultados</h3>
                                <p>Probá buscando por otra especialidad o nombre.</p>
                            </div>
                        )}
                    </div>
                </section>
            </div>
        </div>
    );
}
