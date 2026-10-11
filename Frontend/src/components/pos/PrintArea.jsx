import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import PropTypes from 'prop-types';
import { Receipt, CounterCoupon } from './Receipt';

/**
 * Renders a receipt (and optional per-counter coupons) into a print-only area
 * and opens the print dialog. Each coupon prints on its own page so the
 * thermal printer cuts between them.
 *
 * Tip: start Chrome with --kiosk-printing on the counter PC to print
 * silently to the default (thermal) printer without the dialog.
 */
const PrintArea = ({ job, settings, onDone }) => {
    useEffect(() => {
        if (!job) return undefined;

        const timer = setTimeout(() => {
            window.print();
            onDone?.();
        }, 150);

        return () => clearTimeout(timer);
    }, [job, onDone]);

    if (!job || !settings) return null;

    // Thermal rolls: 80mm paper prints a 72mm strip, 58mm paper a 48mm strip.
    // Zero page margins (no browser header/footer), side padding keeps text inside the printable strip.
    const width = settings.receiptPaperWidth === 58 ? 58 : 80;
    const sidePadding = width === 58 ? 6 : 5;
    const includeReceipt = job.includeReceipt !== false;
    const counters = job.coupons ? job.bill.stations.map((station) => station.counter) : [];

    return createPortal(
        <div className="print-area" style={{ width: `${width}mm`, padding: `0 ${sidePadding}mm`, boxSizing: 'border-box' }}>
            <style>{`@page { size: ${width}mm auto; margin: 0; }`}</style>
            {includeReceipt && <div className="print-slip"><Receipt bill={job.bill} settings={settings} /></div>}
            {counters.map((counter, index) => (
                <div
                    key={counter}
                    className={`print-slip ${includeReceipt || index > 0 ? 'break-before-page' : ''}`}
                >
                    <CounterCoupon bill={job.bill} settings={settings} counter={counter} />
                </div>
            ))}
        </div>,
        document.body
    );
};

PrintArea.propTypes = {
    job: PropTypes.shape({
        bill: PropTypes.object.isRequired,
        coupons: PropTypes.bool,
        includeReceipt: PropTypes.bool,
    }),
    settings: PropTypes.object,
    onDone: PropTypes.func,
};

export default PrintArea;
