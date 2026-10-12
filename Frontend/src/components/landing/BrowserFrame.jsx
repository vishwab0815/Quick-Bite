import PropTypes from 'prop-types';
import { PiLockSimpleFill } from 'react-icons/pi';

/**
 * A product screenshot inside a light browser window. Pass `children` to stack several
 * screenshots in the same window (the product tour cross-fades between them).
 */
const BrowserFrame = ({ src, alt = '', url = 'quickbite.app/pos', eager = false, className = '', children }) => (
    <figure className={`overflow-hidden rounded-[14px] bg-white shadow-[0_50px_100px_-30px_rgba(15,14,12,0.55),0_0_0_1px_rgba(15,14,12,0.08)] sm:rounded-[20px] ${className}`}>
        <div className="flex items-center gap-3 border-b border-ink/[0.06] bg-[#f5f2ed] px-3 py-2 sm:px-4 sm:py-2.5" aria-hidden="true">
            <span className="flex w-12 shrink-0 gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[#ff5f57] sm:h-2.5 sm:w-2.5" />
                <span className="h-2 w-2 rounded-full bg-[#febc2e] sm:h-2.5 sm:w-2.5" />
                <span className="h-2 w-2 rounded-full bg-[#28c840] sm:h-2.5 sm:w-2.5" />
            </span>
            <span className="mx-auto flex min-w-0 items-center gap-1.5 truncate rounded-md bg-white px-3 py-0.5 font-code text-[9px] text-stone-500 ring-1 ring-ink/5 sm:py-1 sm:text-[11px]">
                <PiLockSimpleFill className="shrink-0 text-stone-400" /> {url}
            </span>
            <span className="w-12 shrink-0" />
        </div>
        <div className="relative aspect-[16/10] bg-canvas">
            {children || (
                <img
                    src={src}
                    alt={alt}
                    width={1600}
                    height={1000}
                    loading={eager ? 'eager' : 'lazy'}
                    decoding="async"
                    className="absolute inset-0 h-full w-full object-cover object-top"
                />
            )}
        </div>
    </figure>
);

BrowserFrame.propTypes = {
    src: PropTypes.string,
    alt: PropTypes.string,
    url: PropTypes.string,
    eager: PropTypes.bool,
    className: PropTypes.string,
    children: PropTypes.node,
};

export default BrowserFrame;
