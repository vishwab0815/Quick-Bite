import PropTypes from 'prop-types';
import { QRCodeSVG } from 'qrcode.react';
import { formatDateTime, receiptUrl } from '../../utils/pos';

const money = (amount) => Number(amount || 0).toFixed(2);

const Divider = () => <div className="my-1.5 border-t border-dashed border-black" />;

const Row = ({ label, value, bold = false }) => (
    <div className={`flex justify-between ${bold ? 'font-bold text-[1.1em]' : ''}`}>
        <span>{label}</span>
        <span>{value}</span>
    </div>
);

Row.propTypes = {
    label: PropTypes.node.isRequired,
    value: PropTypes.node.isRequired,
    bold: PropTypes.bool,
};

/**
 * Thermal-printer style receipt (also used on the public receipt page)
 */
export const Receipt = ({ bill, settings }) => {
    const isComposition = bill.gstScheme === 'composition';
    const timeZone = settings.timeZone || 'Asia/Kolkata';
    const qrValue = receiptUrl(settings, bill.publicId);

    return (
        <div className="bg-white font-mono text-[12px] leading-snug text-black">
            <div className="text-center">
                <p className="text-[1.35em] font-bold uppercase">{settings.name}</p>
                {settings.address && <p>{settings.address}</p>}
                {settings.phone && <p>Ph: {settings.phone}</p>}
                {settings.gstin && <p>GSTIN: {settings.gstin}</p>}
                <p className="mt-1 font-bold">{isComposition ? 'BILL OF SUPPLY' : 'TAX INVOICE'}</p>
            </div>

            <Divider />
            <Row label="Bill No" value={bill.billNumber} />
            <Row label="Date" value={formatDateTime(bill.createdAt, timeZone)} />
            {bill.customer?.name && <Row label="Customer" value={bill.customer.name} />}

            <Divider />
            <div className="text-center">
                <p className="text-[0.9em] uppercase tracking-widest">Token</p>
                <p className="text-[3.2em] font-black leading-none">#{bill.tokenNumber}</p>
            </div>
            {bill.status === 'cancelled' && (
                <p className="mt-1 text-center font-bold">*** CANCELLED ***</p>
            )}

            <Divider />
            <div className="flex font-bold">
                <span className="flex-1">Item</span>
                <span className="w-8 text-right">Qty</span>
                <span className="w-14 text-right">Rate</span>
                <span className="w-16 text-right">Amt</span>
            </div>
            {bill.items.map((item) => (
                <div key={`${item.itemId}-${item.name}`} className="flex">
                    <span className="flex-1 pr-1 break-words">{item.name}</span>
                    <span className="w-8 text-right">{item.quantity}</span>
                    <span className="w-14 text-right">{money(item.price)}</span>
                    <span className="w-16 text-right">{money(item.amount)}</span>
                </div>
            ))}

            <Divider />
            {isComposition ? (
                <Row label="Subtotal" value={money(bill.subtotal)} />
            ) : (
                <>
                    <Row label="Taxable value" value={money(bill.taxableAmount)} />
                    <Row label={`CGST @${bill.gstRate / 2}%`} value={money(bill.cgst)} />
                    <Row label={`SGST @${bill.gstRate / 2}%`} value={money(bill.sgst)} />
                </>
            )}
            {bill.roundOff !== 0 && <Row label="Round off" value={money(bill.roundOff)} />}
            <Row label="TOTAL" value={`₹${money(bill.total)}`} bold />

            <Divider />
            <Row label="Paid by" value={bill.payment.mode.toUpperCase()} />
            {bill.payment.mode === 'cash' && bill.payment.cashReceived !== undefined && (
                <>
                    <Row label="Cash received" value={money(bill.payment.cashReceived)} />
                    <Row label="Change" value={money(bill.payment.changeReturned)} />
                </>
            )}

            <Divider />
            {isComposition ? (
                <p className="text-center text-[0.85em]">
                    Composition taxable person, not eligible to collect tax on supplies
                </p>
            ) : (
                settings.sacCode && <p className="text-center text-[0.85em]">SAC: {settings.sacCode}</p>
            )}
            <div className="mt-2 flex flex-col items-center gap-1">
                <QRCodeSVG value={qrValue} size={96} level="M" />
                <p className="text-center text-[0.85em]">Scan for e-receipt</p>
            </div>
            {settings.receiptFooter && <p className="mt-2 text-center">{settings.receiptFooter}</p>}
        </div>
    );
};

Receipt.propTypes = {
    bill: PropTypes.object.isRequired,
    settings: PropTypes.object.isRequired,
};

/**
 * Counter coupon - one per food counter, the customer hands it in to collect food
 */
export const CounterCoupon = ({ bill, settings, counter }) => {
    const items = bill.items.filter((item) => item.counter === counter);

    return (
        <div className="bg-white font-mono text-[12px] leading-snug text-black">
            <div className="text-center">
                <p className="font-bold uppercase">{settings.name}</p>
                <p className="mt-1 text-[1.2em] font-bold uppercase">{counter}</p>
                <p className="text-[3em] font-black leading-none">#{bill.tokenNumber}</p>
            </div>
            <Divider />
            {items.map((item) => (
                <div key={`${item.itemId}-${item.name}`} className="flex text-[1.15em] font-bold">
                    <span className="flex-1 pr-1 break-words">{item.name}</span>
                    <span>x {item.quantity}</span>
                </div>
            ))}
            <Divider />
            <div className="flex items-center justify-between gap-2">
                <div className="text-[0.85em]">
                    <p>{formatDateTime(bill.createdAt, settings.timeZone)}</p>
                    <p>Show this coupon at {counter}</p>
                </div>
                <QRCodeSVG value={receiptUrl(settings, bill.publicId)} size={64} level="M" />
            </div>
        </div>
    );
};

CounterCoupon.propTypes = {
    bill: PropTypes.object.isRequired,
    settings: PropTypes.object.isRequired,
    counter: PropTypes.string.isRequired,
};
