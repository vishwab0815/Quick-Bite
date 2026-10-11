import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { FiPrinter } from 'react-icons/fi';
import { Receipt } from '../../components/pos/Receipt';
import PrintArea from '../../components/pos/PrintArea';
import { posApi } from '../../utils/pos';

/**
 * Public e-receipt - opened from the WhatsApp message or the QR on the printed bill
 */
export default function ReceiptPage() {
    const { publicId } = useParams();
    const [data, setData] = useState(null);
    const [error, setError] = useState('');
    const [printJob, setPrintJob] = useState(null);

    useEffect(() => {
        posApi.get(`/receipt/${publicId}`)
            .then((res) => setData(res.data))
            .catch((err) => setError(err.response?.data?.message || 'Receipt not found'));
    }, [publicId]);

    const handlePrintDone = useCallback(() => setPrintJob(null), []);

    return (
        <div className="flex min-h-screen flex-col items-center pos-app bg-stone-100 px-4 py-8">
            {error && <p className="mt-20 rounded-xl bg-white px-6 py-4 font-semibold text-stone-700 shadow">{error}</p>}

            {!data && !error && (
                <div className="mt-20 h-12 w-12 animate-spin rounded-full border-4 border-orange-500 border-t-transparent" />
            )}

            {data && (
                <>
                    <div className="w-full max-w-[360px] rounded-2xl bg-white p-5 shadow-xl">
                        <Receipt bill={data.bill} settings={data.settings} />
                    </div>
                    <button
                        onClick={() => setPrintJob({ bill: data.bill, coupons: false })}
                        className="mt-4 flex items-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-rose-500 px-5 py-3 font-bold text-white shadow-lg"
                    >
                        <FiPrinter /> Print / Save as PDF
                    </button>
                    <PrintArea job={printJob} settings={data.settings} onDone={handlePrintDone} />
                </>
            )}
        </div>
    );
}
