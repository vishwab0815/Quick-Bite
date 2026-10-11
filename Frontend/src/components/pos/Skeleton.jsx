import PropTypes from 'prop-types';

/**
 * Placeholder block shown while data loads for the first time
 */
const Skeleton = ({ className = '' }) => (
    <div className={`animate-pulse rounded-2xl bg-stone-200/70 ${className}`} />
);

Skeleton.propTypes = {
    className: PropTypes.string,
};

export default Skeleton;
