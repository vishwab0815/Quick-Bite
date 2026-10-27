import PropTypes from 'prop-types';

/** A green tick that draws itself */
export const PaidTick = ({ size = 88 }) => (
    <svg width={size} height={size} viewBox="0 0 88 88" className="pay-tick" aria-hidden="true">
        <circle cx="44" cy="44" r="40" className="pay-tick__ring" />
        <path d="M27 45.5 39 57.5 62 33" className="pay-tick__check" />
    </svg>
);

PaidTick.propTypes = { size: PropTypes.number };

/** A plain coloured initial standing in for a UPI app */
export const AppMark = ({ app, size = 40 }) => (
    <span
        className="flex shrink-0 items-center justify-center rounded-xl font-bold text-white"
        style={{ background: app.color, width: size, height: size, fontSize: size * 0.42 }}
        aria-hidden="true"
    >
        {app.name[0]}
    </span>
);

AppMark.propTypes = { app: PropTypes.shape({ name: PropTypes.string, color: PropTypes.string }).isRequired, size: PropTypes.number };
