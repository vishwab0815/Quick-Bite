import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { PiForkKnifeDuotone, PiXBold } from 'react-icons/pi';
import { dishPhoto } from '../../utils/foodPhotos';

/*
 * Building blocks shared by the hotel app (counter, kitchen, dashboard, menu, staff),
 * so every screen has the same spacing, radii, type and motion.
 */

/** Dish photo, or a warm placeholder when the dish has none (or the file fails to load) */
export const DishPhoto = ({ item, className = '', rounded = 'rounded-xl', dimmed = false }) => {
    const src = dishPhoto(item);
    const [failed, setFailed] = useState(false);
    useEffect(() => setFailed(false), [src]);

    if (!src || failed) {
        return (
            <div className={`flex items-center justify-center bg-gradient-to-br from-orange-100 via-amber-50 to-stone-100 text-orange-800/50 ${rounded} ${className}`}>
                <PiForkKnifeDuotone className="h-1/3 w-1/3 max-h-10 max-w-10" aria-hidden="true" />
            </div>
        );
    }
    return (
        <img
            src={src}
            alt=""
            loading="lazy"
            decoding="async"
            draggable="false"
            onError={() => setFailed(true)}
            className={`object-cover ${rounded} ${dimmed ? 'grayscale' : ''} ${className}`}
        />
    );
};

DishPhoto.propTypes = {
    item: PropTypes.object,
    className: PropTypes.string,
    rounded: PropTypes.string,
    dimmed: PropTypes.bool,
};

const BUTTON_VARIANTS = {
    primary: 'bg-ink text-white hover:bg-stone-800 shadow-sm',
    accent: 'bg-saffron text-white hover:bg-[#f04d12] shadow-sm shadow-orange-600/20',
    secondary: 'bg-white text-stone-800 ring-1 ring-line hover:bg-stone-50 hover:ring-stone-300',
    ghost: 'text-stone-600 hover:bg-stone-900/5 hover:text-stone-900',
    danger: 'bg-rose-600 text-white hover:bg-rose-700',
    dangerGhost: 'text-rose-600 hover:bg-rose-50 hover:text-rose-700',
    success: 'bg-emerald-600 text-white hover:bg-emerald-700',
};

const BUTTON_SIZES = {
    sm: 'h-9 px-3.5 text-[13px] rounded-xl gap-1.5',
    md: 'h-11 px-4 text-sm rounded-xl gap-2',
    lg: 'h-14 px-6 text-base rounded-2xl gap-2.5',
};

export const Button = ({ variant = 'primary', size = 'md', className = '', type = 'button', ...props }) => (
    <button
        type={type}
        className={`inline-flex shrink-0 items-center justify-center font-semibold transition-[background-color,box-shadow,transform,color] duration-150 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-45 ${BUTTON_VARIANTS[variant]} ${BUTTON_SIZES[size]} ${className}`}
        {...props}
    />
);

Button.propTypes = {
    variant: PropTypes.oneOf(Object.keys(BUTTON_VARIANTS)),
    size: PropTypes.oneOf(Object.keys(BUTTON_SIZES)),
    className: PropTypes.string,
    type: PropTypes.string,
};

export const IconButton = ({ label, className = '', tone = 'default', ...props }) => (
    <button
        type="button"
        title={label}
        aria-label={label}
        className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[17px] transition-colors ${
            tone === 'danger' ? 'text-stone-400 hover:bg-rose-50 hover:text-rose-600' : 'text-stone-500 hover:bg-stone-900/5 hover:text-stone-900'
        } ${className}`}
        {...props}
    />
);

IconButton.propTypes = {
    label: PropTypes.string.isRequired,
    className: PropTypes.string,
    tone: PropTypes.oneOf(['default', 'danger']),
};

export const inputClass = 'h-11 w-full rounded-xl border border-line bg-white px-3.5 text-[15px] text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-stone-900 focus:ring-4 focus:ring-stone-900/5';

export const Field = ({ label, hint, children, className = '' }) => (
    <label className={`block ${className}`}>
        <span className="mb-1.5 block text-[13px] font-semibold text-stone-700">{label}</span>
        {children}
        {hint && <span className="mt-1.5 block text-xs text-stone-500">{hint}</span>}
    </label>
);

Field.propTypes = {
    label: PropTypes.node.isRequired,
    hint: PropTypes.node,
    children: PropTypes.node.isRequired,
    className: PropTypes.string,
};

/** Segmented control: one choice from a few options */
export const Segmented = ({ options, value, onChange, className = '', size = 'md' }) => (
    <div className={`grid gap-1 rounded-2xl bg-stone-900/[0.05] p-1 ${className}`} style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }} role="radiogroup">
        {options.map((option) => {
            const Icon = option.icon;
            const active = option.value === value;
            return (
                <button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => onChange(option.value)}
                    className={`flex items-center justify-center gap-1.5 rounded-xl font-semibold transition-all duration-150 ${size === 'lg' ? 'h-12 text-[15px]' : 'h-9 text-[13px]'} ${
                        active ? 'bg-white text-stone-900 shadow-[0_1px_3px_rgba(28,25,23,0.12)]' : 'text-stone-500 hover:text-stone-800'
                    }`}
                >
                    {Icon && <Icon className={`text-lg ${active ? 'text-saffron' : ''}`} aria-hidden="true" />}
                    {option.label}
                </button>
            );
        })}
    </div>
);

Segmented.propTypes = {
    options: PropTypes.arrayOf(PropTypes.shape({ value: PropTypes.string, label: PropTypes.node, icon: PropTypes.elementType })).isRequired,
    value: PropTypes.string,
    onChange: PropTypes.func.isRequired,
    className: PropTypes.string,
    size: PropTypes.oneOf(['md', 'lg']),
};

export const Switch = ({ checked, onChange, label, disabled = false }) => (
    <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        title={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200 disabled:opacity-50 ${checked ? 'bg-emerald-500' : 'bg-stone-300'}`}
    >
        <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 ${checked ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
    </button>
);

Switch.propTypes = {
    checked: PropTypes.bool,
    onChange: PropTypes.func.isRequired,
    label: PropTypes.string.isRequired,
    disabled: PropTypes.bool,
};

/** Centered dialog on wide screens, bottom sheet on phones */
export const Modal = ({ title, description, onClose, children, footer, size = 'md' }) => {
    useEffect(() => {
        const onKey = (event) => { if (event.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    const widths = { sm: 'sm:max-w-sm', md: 'sm:max-w-md', lg: 'sm:max-w-2xl' };

    return (
        <div className="qb-fade fixed inset-0 z-[70] flex items-end justify-center bg-stone-950/45 backdrop-blur-[2px] sm:items-center sm:p-4" onMouseDown={onClose}>
            <div
                role="dialog"
                aria-modal="true"
                aria-label={typeof title === 'string' ? title : undefined}
                onMouseDown={(event) => event.stopPropagation()}
                className={`qb-sheet flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-[28px] bg-white shadow-2xl sm:rounded-3xl ${widths[size]}`}
            >
                {title && (
                    <header className="flex items-start justify-between gap-4 px-6 pb-2 pt-6">
                        <div className="min-w-0">
                            <h2 className="font-display text-xl font-bold tracking-tight text-stone-900">{title}</h2>
                            {description && <p className="mt-1 text-sm leading-relaxed text-stone-500">{description}</p>}
                        </div>
                        <IconButton label="Close" onClick={onClose} className="-mr-2 -mt-1"><PiXBold /></IconButton>
                    </header>
                )}
                <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6 pt-3">{children}</div>
                {footer && <footer className="flex flex-wrap justify-end gap-2 border-t border-line bg-stone-50/60 px-6 py-4">{footer}</footer>}
            </div>
        </div>
    );
};

Modal.propTypes = {
    title: PropTypes.node,
    description: PropTypes.node,
    onClose: PropTypes.func.isRequired,
    children: PropTypes.node,
    footer: PropTypes.node,
    size: PropTypes.oneOf(['sm', 'md', 'lg']),
};

/** Confirmation dialog, optionally asking for a reason (e.g. cancelling a bill) */
export const ConfirmDialog = ({ title, description, confirmLabel, tone = 'danger', reasonLabel, onConfirm, onClose }) => {
    const [reason, setReason] = useState('');
    const [busy, setBusy] = useState(false);
    const needsReason = Boolean(reasonLabel);

    const submit = async (event) => {
        event.preventDefault();
        if (needsReason && !reason.trim()) return;
        setBusy(true);
        try {
            await onConfirm(reason.trim());
        } finally {
            setBusy(false);
        }
    };

    return (
        <Modal title={title} description={description} onClose={onClose} size="sm">
            <form onSubmit={submit} className="space-y-4">
                {needsReason && (
                    <Field label={reasonLabel}>
                        <input className={inputClass} value={reason} onChange={(event) => setReason(event.target.value)} maxLength={200} autoFocus required />
                    </Field>
                )}
                <div className="flex justify-end gap-2">
                    <Button variant="secondary" onClick={onClose}>Keep</Button>
                    <Button type="submit" variant={tone} disabled={busy || (needsReason && !reason.trim())}>{busy ? 'Working…' : confirmLabel}</Button>
                </div>
            </form>
        </Modal>
    );
};

ConfirmDialog.propTypes = {
    title: PropTypes.string.isRequired,
    description: PropTypes.node,
    confirmLabel: PropTypes.string.isRequired,
    tone: PropTypes.oneOf(['danger', 'primary', 'success']),
    reasonLabel: PropTypes.string,
    onConfirm: PropTypes.func.isRequired,
    onClose: PropTypes.func.isRequired,
};

export const PageHeader = ({ eyebrow, title, subtitle, actions }) => (
    <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div className="min-w-0">
            {eyebrow && <div className="mb-1.5 flex items-center gap-2 text-[13px] font-medium text-stone-500">{eyebrow}</div>}
            <h1 className="font-display text-[28px] font-bold leading-tight tracking-[-0.02em] text-stone-900">{title}</h1>
            {subtitle && <p className="mt-1 text-[15px] text-stone-500">{subtitle}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
);

PageHeader.propTypes = {
    eyebrow: PropTypes.node,
    title: PropTypes.node.isRequired,
    subtitle: PropTypes.node,
    actions: PropTypes.node,
};

export const Kbd = ({ children, dark = false }) => (
    <kbd className={`inline-flex h-5 min-w-5 items-center justify-center rounded-md border px-1.5 font-sans text-[11px] font-semibold ${
        dark ? 'border-white/20 bg-white/10 text-white/80' : 'border-line bg-white text-stone-500 shadow-[0_1px_0_rgba(28,25,23,0.08)]'
    }`}>
        {children}
    </kbd>
);

Kbd.propTypes = { children: PropTypes.node, dark: PropTypes.bool };

export const EmptyState = ({ icon, title, children, className = '' }) => {
    const Icon = icon;
    return (
    <div className={`flex flex-col items-center justify-center rounded-3xl border border-dashed border-stone-300/80 px-6 py-14 text-center ${className}`}>
        {Icon && (
            <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-[28px] text-stone-400 shadow-[var(--shadow-card)]">
                <Icon aria-hidden="true" />
            </span>
        )}
        {title && <p className="font-semibold text-stone-800">{title}</p>}
        {children && <div className="mt-1 max-w-sm text-sm text-stone-500">{children}</div>}
    </div>
    );
};

EmptyState.propTypes = {
    icon: PropTypes.elementType,
    title: PropTypes.node,
    children: PropTypes.node,
    className: PropTypes.string,
};

/** Indian veg / non-veg mark */
export const VegMark = ({ isVeg = true, className = '' }) => (
    <span
        title={isVeg ? 'Veg' : 'Non-veg'}
        className={`inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-[4px] border-[1.5px] bg-white ${isVeg ? 'border-emerald-600' : 'border-rose-600'} ${className}`}
    >
        <span className={`h-1.5 w-1.5 rounded-full ${isVeg ? 'bg-emerald-600' : 'bg-rose-600'}`} />
    </span>
);

VegMark.propTypes = { isVeg: PropTypes.bool, className: PropTypes.string };

export const cardClass = 'rounded-3xl border border-line bg-white shadow-[var(--shadow-card)]';
