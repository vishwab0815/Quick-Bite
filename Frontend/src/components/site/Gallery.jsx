import { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { prefersReducedMotion, useMediaQuery, useScrollProgress } from './motion';

const DISHES = [
    { src: '/site/masala-dosa.webp', name: 'Masala Dose', kn: 'ಮಸಾಲೆ ದೋಸೆ' },
    { src: '/site/ghee-roast.webp', name: 'Ghee Roast' },
    { src: '/site/upma.webp', name: 'Uppittu', kn: 'ಉಪ್ಪಿಟ್ಟು' },
    { src: '/site/vada-kaapi.webp', name: 'Vade & Kaapi', kn: 'ವಡೆ · ಕಾಫಿ' },
    { src: '/site/oota.webp', name: 'Oota', kn: 'ಊಟ' },
];

const Card = ({ dish, index, cardRef }) => (
    <figure ref={cardRef} className="gallery-card relative shrink-0">
        <div className="relative aspect-[4/5] overflow-hidden rounded-[6px] bg-black/30">
            <img
                src={dish.src}
                alt={dish.name}
                width={960}
                height={1200}
                loading="lazy"
                decoding="async"
                className="gallery-img absolute inset-0 h-full w-full object-cover"
            />
        </div>
        <figcaption className="mt-5 flex items-baseline justify-between gap-4">
            <span className="font-accent text-3xl leading-none text-paper sm:text-4xl">{dish.name}</span>
            <span className="font-code text-[11px] tracking-[0.3em] text-paper/40">{String(index + 1).padStart(2, '0')}</span>
        </figcaption>
        {dish.kn && <p className="mt-2 font-kn text-sm text-gold/80">{dish.kn}</p>}
    </figure>
);

Card.propTypes = {
    dish: PropTypes.shape({ src: PropTypes.string, name: PropTypes.string, kn: PropTypes.string }).isRequired,
    index: PropTypes.number.isRequired,
    cardRef: PropTypes.func,
};

const Intro = () => (
    <div className="shrink-0 lg:w-[30vw] lg:pr-10">
        <p className="font-code text-[11px] uppercase tracking-[0.4em] text-gold">03</p>
        <h2 className="mt-6 font-accent text-[clamp(3.5rem,8vw,8.5rem)] leading-[0.85] text-paper">
            The <em>table.</em>
        </h2>
    </div>
);

/**
 * The dishes, large. On wide screens the row glides sideways while the page scrolls down,
 * each photo drifting inside its frame; on phones they stack and drift as they pass.
 */
const Gallery = () => {
    const sectionRef = useRef(null);
    const trackRef = useRef(null);
    const cardRefs = useRef([]);
    const [travel, setTravel] = useState(0);
    const wide = useMediaQuery('(min-width: 1024px)');
    const pinned = wide && !prefersReducedMotion();

    useEffect(() => {
        if (!pinned) return undefined;
        const measure = () => {
            const track = trackRef.current;
            if (track) setTravel(Math.max(0, track.scrollWidth - window.innerWidth));
        };
        measure();
        window.addEventListener('resize', measure);
        return () => window.removeEventListener('resize', measure);
    }, [pinned]);

    // Each photo slides gently inside its frame, against the direction of travel
    const drift = () => {
        const middle = window.innerWidth / 2;
        for (const card of cardRefs.current) {
            if (!card) continue;
            const rect = card.getBoundingClientRect();
            const offset = pinned
                ? (rect.left + rect.width / 2 - middle) / window.innerWidth
                : (rect.top + rect.height / 2 - window.innerHeight / 2) / window.innerHeight;
            const image = card.querySelector('.gallery-img');
            if (image) image.style.transform = pinned
                ? `translate3d(${(-offset * 9).toFixed(2)}%, 0, 0) scale(1.18)`
                : `translate3d(0, ${(-offset * 8).toFixed(2)}%, 0) scale(1.16)`;
        }
    };

    useScrollProgress(sectionRef, (progress) => {
        if (pinned && trackRef.current) trackRef.current.style.transform = `translate3d(${(-progress * travel).toFixed(1)}px, 0, 0)`;
        drift();
    }, pinned ? 'pin' : 'pass', !prefersReducedMotion());

    if (!pinned) {
        return (
            <section ref={sectionRef} id="table" data-chapter="The table" className="bg-kaapi px-5 py-28 sm:px-10">
                <Intro />
                <div className="mt-16 grid gap-16 sm:grid-cols-2 sm:gap-x-8">
                    {DISHES.map((dish, index) => (
                        <Card key={dish.name} dish={dish} index={index} cardRef={(node) => { cardRefs.current[index] = node; }} />
                    ))}
                </div>
            </section>
        );
    }

    return (
        <section ref={sectionRef} id="table" data-chapter="The table" className="relative bg-kaapi" style={{ height: `calc(100vh + ${travel}px)` }}>
            <div className="sticky top-0 flex h-screen items-center overflow-hidden">
                <div ref={trackRef} className="flex w-max items-center gap-[4vw] pl-[8vw] pr-[8vw] will-change-transform">
                    <Intro />
                    {DISHES.map((dish, index) => (
                        <div key={dish.name} className={`w-[28vw] max-w-[440px] ${index % 2 ? 'translate-y-[6vh]' : '-translate-y-[4vh]'}`}>
                            <Card dish={dish} index={index} cardRef={(node) => { cardRefs.current[index] = node; }} />
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default Gallery;
