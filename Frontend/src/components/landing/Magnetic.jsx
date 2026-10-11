import { useRef } from 'react';
import PropTypes from 'prop-types';
import { prefersReducedMotion } from './hooks';

const PULL = 0.28;

/**
 * Leans its child towards the mouse pointer while hovered (mouse only, not touch)
 */
const Magnetic = ({ children, className = '' }) => {
    const ref = useRef(null);

    const onPointerMove = (event) => {
        if (event.pointerType !== 'mouse' || prefersReducedMotion()) return;
        const node = ref.current;
        const rect = node.getBoundingClientRect();
        const x = (event.clientX - rect.left - rect.width / 2) * PULL;
        const y = (event.clientY - rect.top - rect.height / 2) * PULL;
        node.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    };

    const onPointerLeave = () => {
        if (ref.current) ref.current.style.transform = '';
    };

    return (
        <span
            ref={ref}
            onPointerMove={onPointerMove}
            onPointerLeave={onPointerLeave}
            className={`inline-block transition-transform duration-300 ease-out ${className}`}
        >
            {children}
        </span>
    );
};

Magnetic.propTypes = {
    children: PropTypes.node,
    className: PropTypes.string,
};

export default Magnetic;
