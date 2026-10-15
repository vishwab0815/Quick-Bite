import { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { prefersReducedMotion, smoothstep, useMediaQuery, useScrollProgress } from './motion';
import { RevealFade, RevealImage, RevealWords } from './Reveal';

const COURSES = [
    { key: 'idli', name: 'Idli', kn: 'ಇಡ್ಲಿ', line: 'Steamed soft. Sambar, two chutneys.', src: '/site/course-idli.webp' },
    { key: 'vade', name: 'Medu Vade', kn: 'ಮೆದು ವಡೆ', line: 'Crisp outside, light inside. Fried to order.', src: '/site/course-vade.webp' },
    { key: 'kaapi', name: 'Filter Kaapi', kn: 'ಫಿಲ್ಟರ್ ಕಾಫಿ', line: 'Brewed slow in brass. Poured from a height.', src: '/site/course-kaapi.webp' },
];

const INTRO_END = 0.24;   // the opening photo gives way to the courses
const COURSES_FROM = 0.3; // then each course takes a third of what is left

const Label = ({ children, className = '' }) => (
    <span className={`flex items-center gap-3 font-code text-[10px] uppercase tracking-[0.4em] sm:text-[11px] ${className}`}>
        <span className="h-px w-8 bg-current opacity-70" /> {children}
    </span>
);

Label.propTypes = { children: PropTypes.node, className: PropTypes.string };

/**
 * Morning, on a computer: one pinned screen. It opens on a cinematic photo of vadas, which
 * darkens and recedes as a tasting-menu list of the three morning dishes appears beside a tall
 * framed photograph. Scrolling moves through the courses; the photograph crossfades to each.
 */
const PinnedMorning = () => {
    const sectionRef = useRef(null);
    const introRef = useRef(null);
    const introPhotoRef = useRef(null);
    const coursesRef = useRef(null);
    const photoRefs = useRef([]);
    const [active, setActive] = useState(-1);

    useScrollProgress(sectionRef, (progress) => {
        const gone = smoothstep(INTRO_END - 0.12, INTRO_END - 0.02, progress);
        if (introRef.current) {
            introRef.current.style.opacity = (1 - gone).toFixed(3);
            introRef.current.style.visibility = gone >= 1 ? 'hidden' : 'visible';
        }
        if (introPhotoRef.current) introPhotoRef.current.style.transform = `scale(${(1 + progress * 0.35).toFixed(3)})`;
        if (coursesRef.current) {
            const shown = smoothstep(INTRO_END - 0.01, COURSES_FROM, progress);
            // Towards the end the list starts moving up by itself, so when the chapter
            // releases, the page is already in motion and there is no jolt
            const leaving = smoothstep(0.86, 1, progress);
            coursesRef.current.style.opacity = (shown * (1 - leaving * 0.6)).toFixed(3);
            coursesRef.current.style.transform = `translate3d(0, ${((1 - shown) * 40 - leaving * window.innerHeight * 0.35).toFixed(1)}px, 0)`;
            coursesRef.current.style.visibility = shown <= 0 ? 'hidden' : 'visible';
        }
        const span = (1 - COURSES_FROM) / COURSES.length;
        const position = Math.max(0, (progress - COURSES_FROM) / span);
        const index = progress < INTRO_END ? -1 : Math.min(COURSES.length - 1, Math.floor(position));
        setActive(index);
        // The active photograph pushes in slowly; the others wait behind it
        photoRefs.current.forEach((node, i) => {
            if (!node) return;
            const local = Math.min(1, Math.max(0, position - i));
            node.style.transform = `scale(${(1.12 - local * 0.1).toFixed(3)})`;
        });
    });

    return (
        <section ref={sectionRef} id="morning" data-chapter="Morning" className="relative bg-ink" style={{ height: '420svh' }}>
            <div className="sticky top-0 h-[100svh] overflow-hidden">
                {/* Opening: vadas in a clay bowl, warm light */}
                <div ref={introRef} className="absolute inset-0">
                    <img ref={introPhotoRef} src="/site/morning-intro.webp" alt="Freshly fried vadas in a clay bowl" loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover will-change-transform" />
                    <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(15,14,12,0.85)_0%,rgba(15,14,12,0.45)_50%,rgba(15,14,12,0.2)_100%)]" />
                    <div className="absolute inset-0 bg-gradient-to-t from-ink via-transparent to-ink/40" />
                    <div className="absolute inset-x-0 bottom-0 px-5 pb-16 sm:px-12 sm:pb-24">
                        <RevealFade><Label className="text-gold">Morning</Label></RevealFade>
                        <RevealFade delay={120} className="mt-5 font-kn text-2xl text-gold sm:text-3xl" aria-hidden="true">ಬೆಳಗ್ಗೆ</RevealFade>
                        <RevealWords as="h2" delay={200} by="chars" step={90} text="Morning." className="font-accent text-[clamp(5rem,15vw,15rem)] leading-[0.85] text-paper" />
                        <RevealWords delay={550} step={45} mode="soft" text={'Three things we have done every morning,\nthe *same* *way,* since the first day.'} className="mt-6 max-w-xl font-accent text-[clamp(1.4rem,2.4vw,2.2rem)] leading-[1.2] text-paper/80" />
                    </div>
                </div>

                {/* The courses */}
                <div ref={coursesRef} className="absolute inset-0 grid grid-cols-[1.05fr_0.95fr] items-center gap-10 px-10 opacity-0 will-change-transform lg:px-16">
                    <div className="max-w-xl">
                        <Label className="text-gold">Every morning</Label>
                        <ol className="mt-10 divide-y divide-paper/10 border-y border-paper/10">
                            {COURSES.map((course, index) => {
                                const on = index === active;
                                return (
                                    <li key={course.key} className={`course-row grid grid-cols-[3rem_1fr] items-baseline py-6 lg:py-7 ${on ? 'is-on' : ''}`}>
                                        <span className="font-code text-[11px] tracking-[0.3em] text-paper/40">0{index + 1}</span>
                                        <div>
                                            <p className="course-row__name font-accent text-[clamp(2.4rem,4.4vw,4.6rem)] leading-[0.95] text-paper/45">{course.name}</p>
                                            <div className="course-row__more">
                                                <p className="mt-3 font-kn text-base text-gold">{course.kn}</p>
                                                <p className="mt-2 text-paper/65 lg:text-lg">{course.line}</p>
                                            </div>
                                        </div>
                                    </li>
                                );
                            })}
                        </ol>
                    </div>

                    {/* Framed photograph */}
                    <div className="relative mx-auto aspect-[3/4] h-[72vh] max-h-[760px]">
                        <div className="pointer-events-none absolute -inset-3 border border-gold/40" aria-hidden="true" />
                        <div className="pointer-events-none absolute -bottom-6 -right-6 h-24 w-24 border-b border-r border-gold/60" aria-hidden="true" />
                        <div className="relative h-full w-full overflow-hidden bg-black/40">
                            {COURSES.map((course, index) => (
                                <img
                                    key={course.key}
                                    ref={(node) => { photoRefs.current[index] = node; }}
                                    src={course.src}
                                    alt={course.name}
                                    loading="lazy"
                                    decoding="async"
                                    className="absolute inset-0 h-full w-full object-cover transition-opacity duration-[900ms] ease-out will-change-transform"
                                    style={{ opacity: index === active ? 1 : 0 }}
                                />
                            ))}
                        </div>
                        <p className="absolute -bottom-9 left-0 font-code text-[11px] tracking-[0.3em] text-paper/45" aria-live="polite">
                            {active >= 0 ? `0${active + 1} / 0${COURSES.length}` : ''}
                        </p>
                    </div>
                </div>
            </div>
        </section>
    );
};

/**
 * Morning on phones (and with reduced motion): the opening photo, then one screen per course.
 */
const StackedMorning = () => (
    <section id="morning" data-chapter="Morning" className="bg-ink">
        <div className="relative flex h-[100svh] min-h-[560px] flex-col justify-end overflow-hidden px-5 pb-16">
            <img src="/site/morning-intro-m.webp" alt="Freshly fried vadas in a clay bowl" loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/55 to-ink/25" />
            <div className="relative">
                <RevealFade><Label className="text-gold">Morning</Label></RevealFade>
                <RevealFade delay={120} className="mt-5 font-kn text-2xl text-gold" aria-hidden="true">ಬೆಳಗ್ಗೆ</RevealFade>
                <RevealWords as="h2" delay={200} by="chars" step={90} text="Morning." className="font-accent text-[clamp(4.5rem,22vw,8rem)] leading-[0.85] text-paper" />
                <RevealWords delay={550} step={45} text={'Three things, the *same* *way,*\nsince the first day.'} className="mt-5 font-accent text-2xl leading-[1.2] text-paper/80" />
            </div>
        </div>
        {COURSES.map((course, index) => (
            <article key={course.key} className="flex min-h-[100svh] flex-col px-5 pb-14 pt-24">
                <RevealImage src={course.src} alt={course.name} className="relative mx-auto aspect-[3/4] w-full max-w-sm" imgClassName="h-full w-full object-cover" />
                <div className="mt-8">
                    <p className="font-code text-[11px] tracking-[0.3em] text-paper/45">0{index + 1} / 0{COURSES.length}</p>
                    <RevealWords as="h3" delay={100} by="chars" text={course.name} className="mt-3 font-accent text-[clamp(3rem,13vw,5rem)] leading-[0.9] text-paper" />
                    <RevealFade delay={300} className="mt-3 font-kn text-lg text-gold">{course.kn}</RevealFade>
                    <RevealWords delay={400} step={35} text={course.line} className="mt-3 text-paper/65" />
                </div>
            </article>
        ))}
    </section>
);

const Morning = () => {
    const wide = useMediaQuery('(min-width: 768px)');
    const [still, setStill] = useState(false);
    useEffect(() => setStill(prefersReducedMotion()), []);
    return wide && !still ? <PinnedMorning /> : <StackedMorning />;
};

export default Morning;
