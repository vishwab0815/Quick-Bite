import { Fragment, useRef } from 'react';
import PropTypes from 'prop-types';
import { useInView } from './motion';

/**
 * Words that rise one after another from behind a mask.
 * - "*word*" is set in gold italics, "\n" breaks the line
 * - `controlled`: no observer of its own - it plays when an ancestor gets the class "is-in"
 *   (used inside pinned scroll scenes); `show` forces it on (e.g. after the opening)
 */
export const RevealWords = ({ text, as = 'p', className = '', delay = 0, step = 70, controlled = false, show }) => {
    const Tag = as;
    const ref = useRef(null);
    const seen = useInView(ref, { disabled: controlled || show !== undefined });
    const on = show !== undefined ? show : seen;
    let index = 0;

    return (
        <Tag ref={ref} className={`rw ${!controlled && on ? 'is-in' : ''} ${className}`} aria-label={text.replace(/\*/g, '').replace(/\n/g, ' ')}>
            {text.split('\n').map((line, lineIndex) => (
                <Fragment key={lineIndex}>
                    {lineIndex > 0 && <br />}
                    {line.split(' ').filter(Boolean).map((word, wordIndex) => {
                        const accent = word.startsWith('*');
                        const current = index++;
                        return (
                            <Fragment key={wordIndex}>
                                <span className="rw__mask" aria-hidden="true">
                                    <span className={`rw__word ${accent ? 'italic text-gold' : ''}`} style={{ transitionDelay: `${delay + current * step}ms` }}>
                                        {word.replace(/\*/g, '')}
                                    </span>
                                </span>{' '}
                            </Fragment>
                        );
                    })}
                </Fragment>
            ))}
        </Tag>
    );
};

RevealWords.propTypes = {
    text: PropTypes.string.isRequired,
    as: PropTypes.elementType,
    className: PropTypes.string,
    delay: PropTypes.number,
    step: PropTypes.number,
    controlled: PropTypes.bool,
    show: PropTypes.bool,
};

/** Letters that rise one after another (for the big name) */
export const RevealLetters = ({ text, className = '', delay = 0, step = 55, show }) => (
    <span className={`rl ${show ? 'is-in' : ''} ${className}`} aria-label={text}>
        {[...text].map((char, index) => (
            <span key={index} className="rl__mask" aria-hidden="true">
                <span className="rl__char" style={{ transitionDelay: `${delay + index * step}ms` }}>{char === ' ' ? ' ' : char}</span>
            </span>
        ))}
    </span>
);

RevealLetters.propTypes = { text: PropTypes.string.isRequired, className: PropTypes.string, delay: PropTypes.number, step: PropTypes.number, show: PropTypes.bool };

/** Fades and lifts a block in when it comes into view */
export const RevealFade = ({ as = 'div', className = '', delay = 0, show, children, ...props }) => {
    const Tag = as;
    const ref = useRef(null);
    const seen = useInView(ref, { disabled: show !== undefined });
    const on = show !== undefined ? show : seen;
    return (
        <Tag ref={ref} className={`rf ${on ? 'is-in' : ''} ${className}`} style={{ transitionDelay: `${delay}ms` }} {...props}>
            {children}
        </Tag>
    );
};

RevealFade.propTypes = { as: PropTypes.elementType, className: PropTypes.string, delay: PropTypes.number, show: PropTypes.bool, children: PropTypes.node };

/**
 * An image that is uncovered from the bottom up and settles from a slight zoom.
 * `sources`: [{ media, srcSet }] for art direction (phone / desktop crops).
 */
export const RevealImage = ({ className = '', imgClassName = '', show, delay = 0, sources, ...img }) => {
    const ref = useRef(null);
    const seen = useInView(ref, { threshold: 0.2, disabled: show !== undefined });
    const on = show !== undefined ? show : seen;
    const image = <img loading="lazy" decoding="async" {...img} className={`ri__img ${imgClassName}`} />;
    return (
        // The observed box is never clipped (a fully clipped element counts as invisible)
        <div ref={ref} className={`ri ${on ? 'is-in' : ''} ${className}`} style={{ '--ri-delay': `${delay}ms` }}>
            <div className="ri__clip h-full w-full overflow-hidden">
                {sources ? (
                    <picture className="block h-full w-full">
                        {sources.map((source) => <source key={source.srcSet} media={source.media} srcSet={source.srcSet} />)}
                        {image}
                    </picture>
                ) : image}
            </div>
        </div>
    );
};

RevealImage.propTypes = {
    className: PropTypes.string,
    imgClassName: PropTypes.string,
    show: PropTypes.bool,
    delay: PropTypes.number,
    sources: PropTypes.arrayOf(PropTypes.shape({ media: PropTypes.string, srcSet: PropTypes.string })),
};
