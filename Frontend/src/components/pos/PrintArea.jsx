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

    const width = settings.receiptPaperWidth === 58 ? 58 : 80;
    const contentWidth = width === 58 ? 48 : 72;
    const includeReceipt = job.includeReceipt !== false;
    const counters = job.coupons ? job.bill.stations.map((station) => station.counter) : [];

    return createPortal(
        <div className="print-area" style={{ width: `${contentWidth}mm`, padding: '0 2mm', boxSizing: 'border-box' }}>
            <style>{`@page { size: ${width}mm auto; margin: 0 4mm; }`}</style>
            {includeReceipt && <Receipt bill={job.bill} settings={settings} />}
            {counters.map((counter, index) => (
                <div
                    key={counter}
                    className={includeReceipt || index > 0 ? 'break-before-page pt-2' : ''}
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
