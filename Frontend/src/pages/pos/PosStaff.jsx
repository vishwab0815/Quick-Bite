import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { PiUserPlusBold, PiKeyBold, PiTrashBold, PiCrownSimpleFill, PiUsersThreeDuotone, PiShieldCheckDuotone } from 'react-icons/pi';
import Skeleton from '../../components/pos/Skeleton';
import { Button, ConfirmDialog, EmptyState, Field, IconButton, Modal, PageHeader, cardClass, inputClass } from '../../components/pos/ui';
import { showToast } from '../../utils/toast';
import { posApi } from '../../utils/pos';
import { usePos } from '../../utils/posContext';
import { useCachedQuery } from '../../utils/useCachedQuery';

const NO_STAFF = [];
const fetchStaff = () => posApi.get('/staff').then((res) => res.data.staff);
const EMPTY_FORM = { name: '', email: '', password: '' };
const PASSWORD_HINT = 'At least 8 characters with an uppercase letter, a lowercase letter and a number';
const STRONG_PASSWORD = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

const formatDate = (date) => new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(date));

const PasswordDialog = ({ member, onClose }) => {
    const [password, setPassword] = useState('');
    const [saving, setSaving] = useState(false);
    const strong = STRONG_PASSWORD.test(password);

    const submit = async (event) => {
        event.preventDefault();
        if (!strong) return;
        setSaving(true);
        try {
            const res = await posApi.patch(`/staff/${member._id}/password`, { password });
            showToast.success(res.data.message);
            onClose();
        } catch (error) {
            showToast.error(error.response?.data?.message || 'Failed to reset password');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal title={`New password for ${member.name}`} description="Share it with them privately. Their current session keeps working." onClose={onClose} size="sm">
            <form onSubmit={submit} className="space-y-4">
                <Field label="New password" hint={PASSWORD_HINT}>
                    <input className={inputClass} type="text" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" autoFocus />
                </Field>
                <Button type="submit" variant="primary" disabled={!strong || saving} className="w-full">{saving ? 'Saving…' : 'Set password'}</Button>
            </form>
        </Modal>
    );
};

PasswordDialog.propTypes = { member: PropTypes.object.isRequired, onClose: PropTypes.func.isRequired };

export default function PosStaff() {
    const { user } = usePos();
    const { data: staffData, error: staffError, refresh: loadStaff } = useCachedQuery('staff', fetchStaff);
    const staff = staffData || NO_STAFF;
    const [form, setForm] = useState(EMPTY_FORM);
    const [saving, setSaving] = useState(false);
    const [resetting, setResetting] = useState(null);
    const [removing, setRemoving] = useState(null);

    useEffect(() => {
        if (staffError) showToast.error('Failed to load staff');
    }, [staffError]);

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

    const removeStaff = async (member) => {
        try {
            const res = await posApi.delete(`/staff/${member._id}`);
            showToast.success(res.data.message);
            setRemoving(null);
            loadStaff();
        } catch (error) {
            showToast.error(error.response?.data?.message || 'Failed to remove staff');
        }
    };

    return (
        <div className="mx-auto max-w-[1200px] space-y-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            <PageHeader title="Staff" subtitle="Who can sign in to your counter" />

            <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
                <section className="min-w-0 space-y-3">
                    {!staffData && Array.from({ length: 3 }, (_, index) => <Skeleton key={index} className="h-20 rounded-3xl" />)}
                    {staffData && staff.length === 0 && <EmptyState icon={PiUsersThreeDuotone} title="No logins yet" />}
                    {staff.map((member) => {
                        const isYou = String(member._id) === String(user.id);
                        const isOwner = member.role === 'admin';
                        return (
                            <article key={member._id} className={`${cardClass} flex items-center gap-4 p-4 sm:p-5`}>
                                <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-lg font-bold ${isOwner ? 'bg-gradient-to-br from-saffron to-orange-600 text-white' : 'bg-stone-100 text-stone-600'}`}>
                                    {member.name.charAt(0).toUpperCase()}
                                </span>
                                <div className="min-w-0 flex-1">
                                    <p className="flex items-center gap-2 truncate font-semibold text-stone-900">
                                        {member.name}
                                        {isYou && <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[11px] font-semibold text-stone-500">You</span>}
                                    </p>
                                    <p className="truncate text-sm text-stone-500">{member.email}</p>
                                    <p className="text-xs text-stone-400">Added {formatDate(member.createdAt)}</p>
                                </div>
                                <span className={`hidden items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold sm:inline-flex ${isOwner ? 'bg-orange-50 text-orange-800 ring-1 ring-orange-200' : 'bg-stone-100 text-stone-600'}`}>
                                    {isOwner && <PiCrownSimpleFill />} {isOwner ? 'Owner' : 'Counter staff'}
                                </span>
                                <div className="flex">
                                    <IconButton label={`Reset ${member.name}'s password`} onClick={() => setResetting(member)}><PiKeyBold /></IconButton>
                                    {!isOwner && <IconButton label={`Remove ${member.name}`} tone="danger" onClick={() => setRemoving(member)}><PiTrashBold /></IconButton>}
                                </div>
                            </article>
                        );
                    })}
                </section>

                <form onSubmit={addStaff} className={`${cardClass} min-w-0 space-y-4 p-5 sm:p-6 lg:sticky lg:top-6`}>
                    <div className="flex items-center gap-3">
                        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-lg text-saffron-deep"><PiUserPlusBold /></span>
                        <div>
                            <h2 className="font-semibold">Add counter staff</h2>
                            <p className="text-xs text-stone-500">They can sign in on any counter PC</p>
                        </div>
                    </div>
                    <Field label="Name">
                        <input className={inputClass} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required minLength={2} maxLength={60} placeholder="e.g. Ramesh" />
                    </Field>
                    <Field label="Login email">
                        <input className={inputClass} type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required placeholder="counter2@yourhotel.com" />
                    </Field>
                    <Field label="Password" hint={PASSWORD_HINT}>
                        <input className={inputClass} type="text" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} required autoComplete="new-password" />
                    </Field>
                    <Button type="submit" variant="accent" disabled={saving} className="w-full">{saving ? 'Adding…' : 'Add staff login'}</Button>
                    <p className="flex gap-2 rounded-2xl bg-stone-50 p-3 text-xs leading-relaxed text-stone-500 ring-1 ring-line">
                        <PiShieldCheckDuotone className="mt-0.5 shrink-0 text-base text-emerald-600" />
                        Staff can bill, run kitchen screens and see today&apos;s bills. Only you can change the menu, staff or cancel bills.
                    </p>
                </form>
            </div>

            {resetting && <PasswordDialog member={resetting} onClose={() => setResetting(null)} />}
            {removing && (
                <ConfirmDialog
                    title={`Remove ${removing.name}?`}
                    description="Their login stops working immediately - even on a counter they are signed in to right now."
                    confirmLabel="Remove login"
                    onConfirm={() => removeStaff(removing)}
                    onClose={() => setRemoving(null)}
                />
            )}
        </div>
    );
}
