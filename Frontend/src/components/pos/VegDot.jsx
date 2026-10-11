import PropTypes from 'prop-types';

/**
 * Indian veg / non-veg mark (green or red dot in a square)
 */
const VegDot = ({ isVeg }) => (
    <span
        title={isVeg ? 'Veg' : 'Non-veg'}
        className={`inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border-2 ${isVeg ? 'border-green-600' : 'border-red-600'}`}
    >
        <span className={`h-1.5 w-1.5 rounded-full ${isVeg ? 'bg-green-600' : 'bg-red-600'}`} />
    </span>
);

VegDot.propTypes = {
    isVeg: PropTypes.bool,
};

export default VegDot;
