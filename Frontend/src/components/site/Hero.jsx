import { Suspense, lazy, useRef } from 'react';
import PropTypes from 'prop-types';
import { PiArrowDownLight, PiArrowUpRight } from 'react-icons/pi';
import { RESTAURANT } from '../../site/restaurant';
import { prefersReducedMotion, useInView, useScrollProgress } from './motion';

const KaapiScene = lazy(() => import('./KaapiScene'));
import { RevealFade, RevealImage, RevealLetters, RevealWords } from './Reveal';

/**
 * Opening screen (one full screen): the name, set large and rising letter by letter, beside
 * golden dosas on a leaf. On phones the photo fills the screen behind the words.
 * Scrolling away, the photo drifts slower than the words.
 */
export const Hero = ({ revealed, onlineOrdering, hasMenu, hours, onMenu }) => {
    const sectionRef = useRef(null);
    const photoRef = useRef(null);
    const textRef = useRef(null);

    useScrollProgress(sectionRef, (progress) => {
        const away = Math.max(0, (progress - 0.5) * 2);
        if (photoRef.current) photoRef.current.style.transform = `translate3d(0, ${(away * 18).toFixed(2)}%, 0)`;
        if (textRef.current) {
            textRef.current.style.transform = `translate3d(0, ${(-away * 22).toFixed(2)}vh, 0)`;
            textRef.current.style.opacity = (1 - away * 1.4).toFixed(3);
        }
    }, 'pass');

    return (
        <section ref={sectionRef} id="top" data-chapter="Welcome" className="relative h-[100svh] min-h-[600px] overflow-hidden bg-ink">
            {/* The photo: right half on wide screens, the whole screen on phones */}
            <div ref={photoRef} className="absolute inset-0 will-change-transform md:left-auto md:w-[48%]">
                <RevealImage
                        sources={[{ media: '(max-width: 767px)', srcSet: '/site/hero-m.webp' }]}
                        show={revealed}
                        src="/site/hero.webp"
                        alt="Two golden dosas on a banana leaf with chutneys, at Udupi Sri Krishna Naivedya"
                        fetchPriority="high"
                        loading="eager"
                        className="ri--tall absolute inset-0"
                        imgClassName="h-full w-full object-cover"
                    />
                <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/55 to-ink/20 md:bg-gradient-to-r md:from-ink md:via-ink/10 md:to-transparent" />
            </div>

            <div ref={textRef} className="relative flex h-full flex-col justify-end px-5 pb-10 pt-28 will-change-transform sm:px-10 md:w-[60%] md:justify-center md:pb-16">
                <h1 className="sr-only">{RESTAURANT.name}, {RESTAURANT.area}, {RESTAURANT.city}</h1>
                <RevealFade show={revealed} delay={100} className="flex items-center gap-4 font-code text-[10px] uppercase tracking-[0.4em] text-paper/60 sm:text-[11px]">
                    <span className="h-px w-10 bg-gold" /> Udupi tiffin · kaapi · meals
                </RevealFade>
                <RevealFade show={revealed} delay={250} className="mt-8 font-kn text-xl text-gold sm:text-3xl" aria-hidden="true">
                    {RESTAURANT.leadKn}
                </RevealFade>
                <p className="font-accent text-[clamp(5.2rem,13vw,13.5rem)] leading-[0.84] tracking-[-0.025em] text-paper" aria-hidden="true">
                    <RevealLetters text={RESTAURANT.word} show={revealed} delay={300} step={60} />
                </p>
                <RevealWords
                    show={revealed}
                    delay={800}
                    step={45}
                    text={'The Udupi way of eating -\ncrisp dosas, soft idlis, strong *kaapi.*'}
                    className="mt-7 max-w-xl font-accent text-[clamp(1.5rem,2.6vw,2.4rem)] leading-[1.15] text-paper/85"
                />
                <RevealFade show={revealed} delay={1250} className="mt-10 flex flex-wrap items-center gap-3">
                    {onlineOrdering && (
                        <a href="/order" className="site-button bg-gold text-ink" data-cursor="Order">Order online <PiArrowUpRight /></a>
                    )}
                    {hasMenu ? (
                        <a href="#menu" onClick={onMenu} className="site-button border border-paper/25 text-paper">Today&apos;s menu</a>
                    ) : (
                        <a href={RESTAURANT.mapsUrl} target="_blank" rel="noreferrer" className="site-button border border-paper/25 text-paper">Directions <PiArrowUpRight /></a>
                    )}
                </RevealFade>
            </div>

            <RevealFade show={revealed} delay={1450} className="pointer-events-none absolute inset-x-0 bottom-0 hidden items-end justify-between px-10 pb-8 font-code text-[11px] uppercase tracking-[0.35em] text-paper/60 md:flex md:w-[52%]">
                <span>{RESTAURANT.area} · {RESTAURANT.city}{hours ? ` · ${hours}` : ''}</span>
                <span className="flex items-center gap-2">Scroll <PiArrowDownLight className="site-bob text-base text-gold" /></span>
            </RevealFade>
        </section>
    );
};

Hero.propTypes = {
    revealed: PropTypes.bool,
    onlineOrdering: PropTypes.bool,
    hasMenu: PropTypes.bool,
    hours: PropTypes.string,
    onMenu: PropTypes.func,
};

/**
 * One full screen, one thought: what "naivedya" means - beside a filter-kaapi set modelled
 * in 3D, with gold cubes orbiting it (see KaapiScene).
 */
export const Statement = () => {
    const sectionRef = useRef(null);
    const near = useInView(sectionRef, { threshold: 0, rootMargin: '60% 0px' });

    return (
        <section ref={sectionRef} data-chapter="Offering" className="relative flex min-h-[100svh] items-center justify-center overflow-hidden bg-ink px-5 py-28 text-center sm:px-10">
            {/* The filter-kaapi set, modelled in 3D, with gold cubes orbiting it */}
            <div className="kaapi-host absolute inset-x-0 top-0 h-[36svh] md:inset-y-0 md:left-auto md:right-0 md:h-auto md:w-[46%]" aria-hidden="true">
                {near && !prefersReducedMotion() && (
                    <Suspense fallback={null}>
                        <KaapiScene className="h-full w-full" />
                    </Suspense>
                )}
            </div>

            <div className="relative max-w-5xl pt-[30svh] md:pt-0 md:pr-[30%] md:text-left">
                <RevealFade className="font-kn text-2xl text-gold sm:text-3xl" aria-hidden="true">{RESTAURANT.wordKn}</RevealFade>
                <RevealFade delay={120} className="mt-3 font-code text-[10px] uppercase tracking-[0.4em] text-paper/50 sm:text-[11px]">
                    naivedya · an offering
                </RevealFade>
                <RevealWords
                    as="h2"
                    delay={200}
                    text={'Every plate here\nbegins as an *offering.*'}
                    className="mt-10 font-accent text-[clamp(3rem,8vw,7.5rem)] leading-[0.98] text-paper"
                />
                <RevealWords
                    delay={700}
                    step={35}
                    text="Food is first offered with devotion, then shared with everyone at the table."
                    className="mx-auto mt-10 max-w-xl text-base leading-relaxed text-paper/60 sm:text-lg md:mx-0"
                />
            </div>
        </section>
    );
};
