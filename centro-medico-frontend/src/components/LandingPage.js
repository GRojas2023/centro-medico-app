import { useState, useEffect } from 'react';
import { getMedics } from '../api';
import { User } from 'lucide-react';
import './LandingPage.css';

// Stitch doctor images
import doc1 from '../assets/stitch-doctor-1.jpg';
import doc2 from '../assets/stitch-doctor-2.jpg';
import doc3 from '../assets/stitch-doctor-3.jpg';
import doc4 from '../assets/stitch-doctor-4.jpg';
import familyImg from '../assets/stitch-family.jpg';

// Placeholder hero bg (reuse an existing asset or Stitch image)
import heroBg from '../assets/banner-option-3.jpg';

const POPULAR_TAGS = ['Dermatología', 'Ginecología', 'Pediatría', 'Psicología'];

const HOW_STEPS = [
    { icon: 'search_check', title: '1. Busca a tu médico', desc: 'Filtra por especialidad, ciudad, seguro médico o por el nombre del profesional que ya conocés.' },
    { icon: 'verified_user', title: '2. Elegí el mejor', desc: 'Consultá perfiles detallados, opiniones de otros pacientes y disponibilidad real en tiempo real.' },
    { icon: 'event_available', title: '3. Reservá en segundos', desc: 'Confirmá tu cita al instante para vos o cualquier miembro de tu familia sin llamadas telefónicas.' },
];

const STATIC_DOCTORS = [
    { name: 'Dra. Elena Ramos', specialty: 'Cardiología', location: 'Salta, Hospital Central', rating: '4.9', img: doc1 },
    { name: 'Dr. Carlos Ortiz', specialty: 'Pediatría', location: 'Salta, Clínica Salud', rating: '4.8', img: doc2 },
    { name: 'Dra. Sofía Méndez', specialty: 'Dermatología', location: 'Salta, Dermacare', rating: '5.0', img: doc3 },
    { name: 'Dr. Juan Pérez', specialty: 'Medicina General', location: 'Salta, Medisur', rating: '4.7', img: doc4 },
];

export default function LandingPage({ onLoginClick, onSearch }) {
    const [searchTerm, setSearchTerm] = useState('');
    const [locationTerm, setLocationTerm] = useState('');
    const [medics, setMedics] = useState([]);

    useEffect(() => {
        getMedics().then(setMedics).catch(() => { });
    }, []);

    const handleSearch = () => { if (onSearch) onSearch(searchTerm); };

    // Build doctor cards: use real medics if available, otherwise fall back to static
    const displayDoctors = medics.length >= 4
        ? medics.slice(0, 4).map((m, i) => ({
            name: `Dr. ${m.email.split('@')[0].charAt(0).toUpperCase()}${m.email.split('@')[0].slice(1)}`,
            specialty: m.medic_profile?.specialty || STATIC_DOCTORS[i]?.specialty || 'Medicina General',
            location: m.medic_profile?.address || STATIC_DOCTORS[i]?.location || 'Salta, Argentina',
            rating: (4.5 + (m.id % 5) / 10).toFixed(1),
            img: m.medic_profile?.profile_image_url || STATIC_DOCTORS[i]?.img || null,
            medic: m,
        }))
        : STATIC_DOCTORS.map(d => ({ ...d, medic: null }));

    return (
        <div className="lp">
            {/* ===== HEADER ===== */}
            <header className="lp__header">
                <div className="lp__header-inner">
                    <div className="lp__logo">
                        <span className="material-symbols-outlined lp__logo-icon notranslate" translate="no">medical_services</span>
                        <h2 className="lp__logo-text">MedDirect</h2>
                    </div>

                    <nav className="lp__nav">
                        <a href="#especialidades" onClick={e => { e.preventDefault(); onSearch && onSearch(''); }}>Especialidades</a>
                        <a href="#como-funciona">Cómo funciona</a>
                        <a href="#profesionales">Para Profesionales</a>
                    </nav>

                    <div className="lp__header-actions">
                        <button className="lp__btn-ghost" onClick={onLoginClick}>
                            <span className="material-symbols-outlined notranslate" translate="no" style={{ fontSize: 20 }}>person</span>
                            Iniciar sesión
                        </button>
                        <button className="lp__btn-primary" onClick={() => onSearch && onSearch('')}>
                            <span className="material-symbols-outlined notranslate" translate="no" style={{ fontSize: 20 }}>calendar_month</span>
                            Pedir Cita
                        </button>
                    </div>
                </div>
            </header>

            <main>
                {/* ===== HERO ===== */}
                <section className="lp__hero">
                    <div className="lp__hero-bg">
                        <div className="lp__hero-gradient" />
                        <img className="lp__hero-img" src={heroBg} alt="" />
                    </div>

                    <div className="lp__hero-content">
                        <div>
                            <h1>Tu salud, en las <span>mejores manos</span></h1>
                            <p className="lp__hero-sub">
                                Encontrá y reservá cita con los mejores especialistas verificados de Salta. Para vos y toda tu familia.
                            </p>
                        </div>

                        {/* Search Box */}
                        <div className="lp__search-box">
                            <div className="lp__search-field">
                                <span className="material-symbols-outlined notranslate" translate="no">search</span>
                                <input
                                    type="text"
                                    placeholder="Especialidad, médico o clínica..."
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleSearch()}
                                />
                            </div>
                            <div className="lp__search-field">
                                <span className="material-symbols-outlined notranslate" translate="no">location_on</span>
                                <input
                                    type="text"
                                    placeholder="Ciudad o código postal"
                                    value={locationTerm}
                                    onChange={e => setLocationTerm(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleSearch()}
                                />
                            </div>
                            <button className="lp__search-btn" onClick={handleSearch}>Buscar</button>
                        </div>

                        <div className="lp__popular">
                            <span className="lp__popular-label">Populares:</span>
                            {POPULAR_TAGS.map(tag => (
                                <a key={tag} onClick={() => onSearch && onSearch(tag)}>{tag}</a>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ===== FEATURED DOCTORS ===== */}
                <section className="lp__featured" id="especialidades">
                    <div className="lp__featured-header">
                        <div>
                            <h2>Médicos Destacados</h2>
                            <p>Los especialistas mejor valorados de esta semana</p>
                        </div>
                        <button className="lp__featured-link" onClick={() => onSearch && onSearch('')}>
                            Ver todos los especialistas
                            <span className="material-symbols-outlined notranslate" translate="no" style={{ fontSize: 18 }}>arrow_forward</span>
                        </button>
                    </div>

                    <div className="lp__doctors-grid">
                        {displayDoctors.map((doc, i) => (
                            <div key={i} className="lp__doc-card">
                                <div className="lp__doc-card-img-wrap">
                                    {doc.img ? (
                                        <img className="lp__doc-card-img" src={doc.img} alt={doc.name} />
                                    ) : (
                                        <div className="lp__doc-card-avatar"><User size={64} strokeWidth={1.2} /></div>
                                    )}
                                    <div className="lp__doc-card-rating">
                                        <span className="material-symbols-outlined star notranslate" translate="no">star</span>
                                        {doc.rating}
                                    </div>
                                </div>
                                <div className="lp__doc-card-info">
                                    <div className="lp__doc-card-name-row">
                                        <h3 className="lp__doc-card-name">{doc.name}</h3>
                                        <span className="material-symbols-outlined lp__doc-card-verified notranslate" translate="no">verified</span>
                                    </div>
                                    <p className="lp__doc-card-specialty">{doc.specialty}</p>
                                    <p className="lp__doc-card-location">
                                        <span className="material-symbols-outlined notranslate" translate="no">location_on</span>
                                        {doc.location}
                                    </p>
                                </div>
                                <button
                                    className="lp__doc-card-btn"
                                    onClick={() => doc.medic ? onSearch && onSearch(doc.medic.email.split('@')[0]) : onSearch && onSearch(doc.specialty)}
                                >
                                    Reservar Cita
                                </button>
                            </div>
                        ))}
                    </div>
                </section>

                {/* ===== FAMILY BANNER ===== */}
                <section className="lp__family">
                    <div className="lp__family-inner">
                        <div className="lp__family-text">
                            <span className="lp__family-badge">Novedad</span>
                            <h2>Gestioná la salud de toda tu familia</h2>
                            <p>
                                Desde tu perfil de usuario podés añadir a tus hijos, pareja o padres como beneficiarios. Reservá citas para ellos y mantené todo su historial organizado en un solo lugar.
                            </p>
                            <div className="lp__family-actions">
                                <button className="lp__btn-primary-lg" onClick={() => onSearch && onSearch('')}>Empezar ahora</button>
                                <button className="lp__btn-outline">Más información</button>
                            </div>
                        </div>
                        <div className="lp__family-img-wrap">
                            <img className="lp__family-img" src={familyImg} alt="Familia feliz" />
                        </div>
                    </div>
                </section>

                {/* ===== HOW IT WORKS ===== */}
                <section className="lp__how" id="como-funciona">
                    <div className="lp__how-inner">
                        <h2>¿Cómo funciona MedDirect?</h2>
                        <div className="lp__how-grid">
                            {HOW_STEPS.map((step, i) => (
                                <div key={i} className="lp__how-step">
                                    <div className="lp__how-icon">
                                        <span className="material-symbols-outlined notranslate" translate="no">{step.icon}</span>
                                    </div>
                                    <h3>{step.title}</h3>
                                    <p>{step.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ===== DOCTOR ACCESS CTA ===== */}
                <section className="lp__cta" id="profesionales">
                    <div className="lp__cta-inner">
                        <div className="lp__cta-watermark">
                            <span className="material-symbols-outlined notranslate" translate="no">medical_information</span>
                        </div>
                        <h2>¿Sos un profesional de la salud o dirigís un centro médico?</h2>
                        <p>
                            Unite a la mayor red médica y empezá a recibir citas online. Mejorá tu visibilidad y simplificá tu gestión diaria.
                        </p>
                        <button className="lp__cta-btn" onClick={onLoginClick}>Dar de alta mi perfil</button>
                    </div>
                </section>
            </main>

            {/* ===== FOOTER ===== */}
            <footer className="lp__footer">
                <div className="lp__footer-inner">
                    <div className="lp__footer-grid">
                        <div className="lp__footer-brand">
                            <div className="lp__logo" style={{ marginBottom: '1.5rem' }}>
                                <span className="material-symbols-outlined notranslate" translate="no" style={{ color: 'var(--lp-primary)', fontSize: '1.875rem' }}>medical_services</span>
                                <h2 className="lp__logo-text">MedDirect</h2>
                            </div>
                            <p>Simplificamos el acceso a la salud, conectando a pacientes con los mejores profesionales médicos de forma rápida y segura.</p>
                            <div className="lp__footer-social">
                                <a href="#"><span className="material-symbols-outlined notranslate" translate="no" style={{ fontSize: 20 }}>share</span></a>
                                <a href="#"><span className="material-symbols-outlined notranslate" translate="no" style={{ fontSize: 20 }}>mail</span></a>
                            </div>
                        </div>

                        <div className="lp__footer-col">
                            <h4>Para Pacientes</h4>
                            <ul>
                                <li><a href="#" onClick={e => { e.preventDefault(); onSearch && onSearch(''); }}>Buscar Médicos</a></li>
                                <li><a href="#especialidades">Especialidades</a></li>
                                <li><a href="#">Clínicas Populares</a></li>
                                <li><a href="#">Preguntas Frecuentes</a></li>
                            </ul>
                        </div>

                        <div className="lp__footer-col">
                            <h4>Para Médicos</h4>
                            <ul>
                                <li><a href="#" onClick={e => { e.preventDefault(); onLoginClick && onLoginClick(); }}>Acceso Profesionales</a></li>
                                <li><a href="#">MedDirect para Clínicas</a></li>
                                <li><a href="#">Soluciones de Software</a></li>
                                <li><a href="#">Planes y Precios</a></li>
                            </ul>
                        </div>

                        <div className="lp__footer-col">
                            <h4>Compañía</h4>
                            <ul>
                                <li><a href="#">Sobre nosotros</a></li>
                                <li><a href="#">Contacto</a></li>
                                <li><a href="#">Blog de Salud</a></li>
                                <li><a href="#">Términos Legales</a></li>
                            </ul>
                        </div>
                    </div>

                    <div className="lp__footer-bottom">
                        <p>© 2025 MedDirect. Todos los derechos reservados.</p>
                        <div className="lp__footer-locale">
                            <span className="material-symbols-outlined notranslate" translate="no" style={{ fontSize: 16 }}>public</span>
                            Argentina (Español)
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}
