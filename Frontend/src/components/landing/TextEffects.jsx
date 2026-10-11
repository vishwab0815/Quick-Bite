import { Fragment, useRef } from 'react';
import PropTypes from 'prop-types';
import { useInView, useScrollProgress } from './hooks';

/**
 * Headline whose lines slide up from behind a mask, one after another
 */
export const MaskReveal = ({ as = 'h2', lines, className = '', delay = 0 }) => {
    const Tag = as;
    const ref = useRef(null);
    const visible = useInView(ref, { threshold: 0 });
    return (
        <Tag ref={ref} className={`${className} ${visible ? 'is-visible' : ''}`}>
            {lines.map((line, index) => (
                <span key={index} className="line-mask">
                    <span style={{ '--d': `${delay + index * 110}ms` }}>{line}</span>
                </span>
            ))}
        </Tag>
    );
};

MaskReveal.propTypes = {
    as: PropTypes.elementType,
    lines: PropTypes.arrayOf(PropTypes.node).isRequired,
    className: PropTypes.string,
    delay: PropTypes.number,
};

/**
 * Paragraph whose words light up one by one as it scrolls through the screen.
 * Words wrapped in *asterisks* are highlighted.
 */
export const ScrollWords = ({ text, className = '' }) => {
    const ref = useRef(null);
    const words = text.split(' ');

    useScrollProgress(ref, (progress) => {
        // Read the paragraph while it moves through the middle of the screen
        const reading = Math.min(1, Math.max(0, (progress - 0.2) / 0.45));
        ref.current?.style.setProperty('--p', reading.toFixed(3));
    }, 'pass');

    return (
        <p ref={ref} className={className} style={{ '--n': words.length }}>
            {words.map((word, index) => {
                const highlight = word.startsWith('*');
                const clean = word.replace(/\*/g, '');
                return (
                    <Fragment key={index}>
                        <span className={`scroll-word ${highlight ? 'font-accent font-normal italic text-saffron-deep' : ''}`} style={{ '--i': index }}>
                            {clean}
                        </span>{' '}
                    </Fragment>
                );
            })}
        </p>
    );
};

ScrollWords.propTypes = {
    text: PropTypes.string.isRequired,
    className: PropTypes.string,
};
