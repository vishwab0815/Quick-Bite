import { useCallback, useEffect, useState } from 'react';
import { FiUserPlus, FiKey, FiTrash2 } from 'react-icons/fi';
import PosHeader from '../../components/pos/PosHeader';
import { showToast } from '../../utils/toast';
import { posApi, formatDateTime, useStaffUser, usePosSettings } from '../../utils/pos';

const ADMIN_ONLY = ['admin'];
const EMPTY_FORM = { name: '', email: '', password: '' };
const PASSWORD_HINT = 'At least 8 characters with an uppercase letter, a lowercase letter and a number';
const STRONG_PASSWORD = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

export default function PosStaff() {
    const user = useStaffUser(ADMIN_ONLY);
    const settings = usePosSettings(Boolean(user));

    const [staff, setStaff] = useState([]);
    const [form, setForm] = useState(EMPTY_FORM);
    const [saving, setSaving] = useState(false);

    const loadStaff = useCallback(async () => {
        try {
            const res = await posApi.get('/staff');
            setStaff(res.data.staff);
        } catch {
            showToast.error('Failed to load staff');
        }
    }, []);

    useEffect(() => {
        if (user) loadStaff();
    }, [user, loadStaff]);

    const addStaff = async (event) => {
        event.preventDefault();
        if (!STRONG_PASSWORD.test(form.password)) {
            showToast.error(PASSWORD_HINT);
            return;
        }
        setSaving(true);
        try {
            await posApi.post('/staff', form);
            showToast.success(`Login created for ${form.name}`);
            setForm(EMPTY_FORM);
            loadStaff();
        } catch (error) {
            showToast.error(error.response?.data?.message || 'Failed to add staff');
        } finally {
            setSaving(false);
        }
    };

    const resetPassword = async (member) => {
        const password = window.prompt(`New password for ${member.name}\n(${PASSWORD_HINT})`);
        if (!password) return;
        if (!STRONG_PASSWORD.test(password)) {
            showToast.error(PASSWORD_HINT);
            return;
        }
        try {
            const res = await posApi.patch(`/staff/${member._id}/password`, { password });
            showToast.success(res.data.message);
        } catch (error) {
            showToast.error(error.response?.data?.message || 'Failed to reset password');
        }
    };

    const removeStaff = async (member) => {
        if (!window.confirm(`Remove ${member.name}'s login? They will be signed out immediately.`)) return;
        try {
            const res = await posApi.delete(`/staff/${member._id}`);
            showToast.success(res.data.message);
            loadStaff();
        } catch (error) {
            showToast.error(error.response?.data?.message || 'Failed to remove staff');
        }
    };

    if (!user) {
        return (
            <div className="pos-app flex min-h-screen items-center justify-center bg-stone-100">
                <div className="h-12 w-12 animate-spin rounded-full border-4 border-orange-500 border-t-transparent" />
            </div>
        );
    }

    return (
        <div className="min-h-screen pos-app bg-stone-100">
            <PosHeader user={user} hotelName={settings?.name} />

            <div className="mx-auto grid max-w-5xl gap-4 p-4 lg:grid-cols-[1fr_320px]">
                <section className="overflow-hidden rounded-2xl border border-stone-200/80 bg-white shadow-[0_1px_2px_rgba(28,25,23,0.05)]">
                    <h1 className="border-b border-stone-100 px-4 py-3 text-xl font-black">Staff logins</h1>
                    {staff.map((member) => (
                        <div key={member._id} className="flex items-center gap-3 border-b border-stone-50 px-4 py-3 last:border-0">
                            <div className="min-w-0 flex-1">
                                <p className="font-semibold">
                                    {member.name}
                                    {member._id === user._id && <span className="ml-1 text-xs text-stone-400">(you)</span>}
                                </p>
                                <p className="truncate text-sm text-stone-500">{member.email}</p>
                                <p className="text-xs text-stone-400">Added {formatDateTime(member.createdAt)}</p>
                            </div>
                            <span
                                className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                                    member.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-orange-100 text-orange-700'
                                }`}
                            >
                                {member.role === 'admin' ? 'Owner' : 'Counter staff'}
                            </span>
                            <button
                                onClick={() => resetPassword(member)}
                                className="rounded-lg p-2 text-stone-600 hover:bg-stone-100"
                                title="Reset password"
                            >
                                <FiKey />
                            </button>
                            {member.role === 'staff' && (
                                <button
                                    onClick={() => removeStaff(member)}
                                    className="rounded-lg p-2 text-red-500 hover:bg-red-50"
                                    title="Remove login"
                                >
                                    <FiTrash2 />
                                </button>
                            )}
                        </div>
                    ))}
                </section>

                <form onSubmit={addStaff} className="h-fit space-y-3 rounded-2xl border border-stone-200/80 bg-white shadow-[0_1px_2px_rgba(28,25,23,0.05)] p-4">
                    <h2 className="flex items-center gap-2 font-bold"><FiUserPlus /> Add counter staff</h2>
                    <input
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        required
                        minLength={2}
                        maxLength={60}
                        placeholder="Name"
                        className="w-full rounded-lg border border-stone-200 px-3 py-2 outline-none focus:border-orange-500"
                    />
                    <input
                        type="email"
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        required
                        placeholder="Login email (e.g. counter2@hotel.com)"
                        className="w-full rounded-lg border border-stone-200 px-3 py-2 outline-none focus:border-orange-500"
                    />
                    <input
                        type="text"
                        value={form.password}
                        onChange={(e) => setForm({ ...form, password: e.target.value })}
                        required
                        autoComplete="new-password"
                        placeholder="Password"
                        className="w-full rounded-lg border border-stone-200 px-3 py-2 outline-none focus:border-orange-500"
                    />
                    <p className="text-xs text-stone-500">{PASSWORD_HINT}. Staff can bill, run kitchen screens and see today&apos;s bills; only you can change the menu, staff or cancel bills.</p>
                    <button
                        type="submit"
                        disabled={saving}
                        className="w-full rounded-xl bg-gradient-to-r from-orange-500 to-rose-500 py-2.5 font-bold text-white disabled:opacity-50"
                    >
                        {saving ? 'Adding...' : 'Add staff login'}
                    </button>
                </form>
            </div>
        </div>
    );
}
