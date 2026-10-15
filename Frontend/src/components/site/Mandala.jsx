import PropTypes from 'prop-types';

/** Points on a circle, as "x,y" strings */
const polar = (radius, angle) => `${(Math.cos(angle) * radius).toFixed(2)},${(Math.sin(angle) * radius).toFixed(2)}`;

/** A ring of pointed petals: each petal is two arcs meeting at a tip */
const petalRing = (count, inner, outer, width) => {
    const paths = [];
    for (let index = 0; index < count; index++) {
        const angle = (index / count) * Math.PI * 2;
        const left = angle - width;
        const right = angle + width;
        const base = polar(inner, angle);
        const tip = polar(outer, angle);
        const mid = (inner + outer) / 2;
        paths.push(`M ${base} Q ${polar(mid * 1.02, left)} ${tip} Q ${polar(mid * 1.02, right)} ${base} Z`);
    }
    return paths.join(' ');
};

/** A ring of small dots */
const dotRing = (count, radius, size) => Array.from({ length: count }, (_, index) => {
    const angle = (index / count) * Math.PI * 2 + Math.PI / count;
    const [x, y] = polar(radius, angle).split(',');
    return <circle key={index} cx={x} cy={y} r={size} />;
});

/** A ring of short radial ticks */
const tickRing = (count, inner, outer) => Array.from({ length: count }, (_, index) => {
    const angle = (index / count) * Math.PI * 2;
    const [x1, y1] = polar(inner, angle).split(',');
    const [x2, y2] = polar(outer, angle).split(',');
    return <line key={index} x1={x1} y1={y1} x2={x2} y2={y2} />;
});

/**
 * A gold mandala in line art: rings of petals, dots and ticks that draw themselves on and
 * turn at different speeds and directions. Pure SVG, so it is crisp at any size.
 */
const Mandala = ({ className = '' }) => (
    <svg viewBox="-110 -110 220 220" className={`mandala ${className}`} aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="0.7" strokeLinecap="round" strokeLinejoin="round">
        {/* Outer rings */}
        <g className="mandala__ring mandala__ring--1">
            <circle r="104" pathLength="1" />
            <circle r="98" pathLength="1" strokeDasharray="0.3 1.2" strokeWidth="0.5" />
            <g>{tickRing(72, 99.5, 102.5)}</g>
        </g>
        <g className="mandala__ring mandala__ring--2">
            <path d={petalRing(24, 70, 94, 0.11)} pathLength="1" />
            <circle r="70" pathLength="1" strokeWidth="0.5" />
        </g>
        <g className="mandala__ring mandala__ring--3" fill="currentColor" stroke="none">
            {dotRing(24, 66, 1.1)}
        </g>
        <g className="mandala__ring mandala__ring--4">
            <path d={petalRing(16, 42, 62, 0.16)} pathLength="1" />
            <circle r="42" pathLength="1" strokeWidth="0.5" />
        </g>
        <g className="mandala__ring mandala__ring--5">
            <path d={petalRing(8, 22, 38, 0.3)} pathLength="1" />
            <circle r="24" pathLength="1" strokeDasharray="0.1 0.8" strokeWidth="0.5" />
        </g>
        <g className="mandala__ring mandala__ring--6" fill="currentColor" stroke="none">
            {dotRing(8, 20, 0.9)}
        </g>
        <g className="mandala__core">
            <circle r="14" pathLength="1" />
            <path d={petalRing(6, 4, 12, 0.42)} pathLength="1" />
        </g>
    </svg>
);

Mandala.propTypes = { className: PropTypes.string };

export default Mandala;
