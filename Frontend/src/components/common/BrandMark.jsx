import PropTypes from 'prop-types';

/** The restaurant's mark: a serif N in gold on ink */
const BrandMark = ({ className = 'h-9 w-9 text-[22px]' }) => (
    <span className={`flex shrink-0 items-center justify-center rounded-xl bg-ink font-accent leading-none text-gold ring-1 ring-white/10 ${className}`} aria-hidden="true">
        N
    </span>
);

BrandMark.propTypes = { className: PropTypes.string };

export default BrandMark;
