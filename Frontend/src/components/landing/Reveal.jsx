import { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';

/**
 * Reveals its children (fade + rise) the first time they scroll into view
 */
const Reveal = ({ as = 'div', delay = 0, className = '', children, ...props }) => {
    const Tag = as;
    const ref = useRef(null);
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const node = ref.current;
        if (!node || typeof IntersectionObserver === 'undefined') {
            setVisible(true);
            return undefined;
        }
        const observer = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) {
                setVisible(true);
                observer.disconnect();
            }
        }, { rootMargin: '0px 0px -10% 0px', threshold: 0.12 });
        observer.observe(node);
        return () => observer.disconnect();
    }, []);

    return (
        <Tag
            ref={ref}
            className={`reveal ${visible ? 'is-visible' : ''} ${className}`}
            style={{ '--reveal-delay': `${delay}ms` }}
            {...props}
        >
            {children}
        </Tag>
    );
};

Reveal.propTypes = {
    as: PropTypes.elementType,
    delay: PropTypes.number,
    className: PropTypes.string,
    children: PropTypes.node,
};

export default Reveal;
