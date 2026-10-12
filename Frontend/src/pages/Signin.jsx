import { useEffect, useState } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import { FiArrowRight, FiBarChart2, FiEye, FiEyeOff, FiLock, FiShoppingBag } from 'react-icons/fi';
import { demoHref, demoIsExternal } from '../utils/sales';

const API = import.meta.env.VITE_API_URL;

// Where each kind of login lands
const homeFor = (role) => (role === 'superadmin' ? '/console' : '/pos');

export default function Signin() {
    const navigate = useNavigate();
    const [form, setForm] = useState({ email: '', password: '' });
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [demoLoading, setDemoLoading] = useState('');

    // Already signed in on this device - go straight in
    useEffect(() => {
        document.title = 'Sign in · QuickBite';
        let active = true;
        axios.get(`${API}/api/auth/profile`, { withCredentials: true })
            .then((res) => { if (active && res.data.user) navigate(homeFor(res.data.user.role), { replace: true }); })
            .catch(() => {});
        return () => { active = false; };
    }, [navigate]);

    const update = (event) => {
        setForm({ ...form, [event.target.name]: event.target.value });
        if (error) setError('');
    };

    const submit = async (event) => {
        event.preventDefault();
        setLoading(true);
        setError('');
        try {
            const res = await axios.post(`${API}/api/auth/login`, form, { withCredentials: true });
            navigate(homeFor(res.data.user?.role), { replace: true });
        } catch (err) {
            setError(
                err.response?.status === 429
                    ? 'Too many attempts. Please wait 15 minutes and try again.'
                    : err.response?.data?.message || 'Could not sign in. Check your connection and try again.'
            );
        } finally {
            setLoading(false);
        }
    };

    // One click into the sample restaurant - for showing QuickBite to a client
    const openDemo = async (role) => {
        setDemoLoading(role);
        setError('');
        try {
            await axios.post(`${API}/api/auth/demo`, { role }, { withCredentials: true });
            navigate('/pos', { replace: true });
        } catch (err) {
            setError(err.response?.data?.message || 'Could not open the demo. Please try again.');
            setDemoLoading('');
        }
    };

    const demos = [
        { role: 'admin', title: 'Hotel owner', text: 'Dashboard, menu & staff', icon: FiBarChart2 },
        { role: 'staff', title: 'Cashier', text: 'Billing counter & kitchen', icon: FiShoppingBag },
    ];

    const field = 'w-full rounded-2xl border border-ink/15 bg-white px-4 py-3.5 text-[15px] text-ink outline-none transition focus:border-ink focus:ring-4 focus:ring-ink/5';

    return (
        <div className="qb-landing grid min-h-[100dvh] bg-paper text-ink lg:grid-cols-[1.05fr_1fr]">
            {/* Brand panel */}
            <aside className="grain relative hidden flex-col justify-between overflow-hidden bg-ink p-12 text-paper lg:flex">
                {/* A South Indian feast behind a dark gradient, so the words stay readable */}
                <img src="/food/hero-feast.webp" alt="" className="absolute inset-0 h-full w-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/75 to-ink/30" />
                <div className="absolute inset-0 bg-gradient-to-r from-ink/60 to-transparent" />
                <Link to="/" className="relative flex items-center gap-2.5">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-saffron font-extrabold text-ink">Q</span>
                    <span className="text-lg font-bold tracking-tight">QuickBite</span>
                </Link>
                <div className="relative">
                    <p className="font-display text-[clamp(3rem,5.5vw,5.5rem)] font-extrabold leading-[0.88] tracking-[-0.05em]">
                        Rush hour,<br />
                        <span className="font-accent font-normal italic text-saffron">handled.</span>
                    </p>
                    <p className="mt-6 max-w-sm text-stone-300">Bills in seconds, tokens on screen and every rupee on one live dashboard.</p>
                </div>
                <p className="relative font-code text-[11px] uppercase tracking-[0.2em] text-stone-400">Counter billing & tokens</p>
            </aside>

            {/* Form */}
            <main className="flex flex-col px-5 py-6 sm:px-10 sm:py-8">
                {/* Phones: food banner with the logo */}
                <Link to="/" className="relative -mx-5 -mt-6 mb-2 flex h-40 items-end overflow-hidden px-5 pb-4 text-paper sm:-mx-10 sm:-mt-8 sm:px-10 lg:hidden">
                    <img src="/food/hero-dosa.webp" alt="" className="absolute inset-0 h-full w-full object-cover" />
                    <span className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/30 to-transparent" />
                    <span className="relative flex items-center gap-2.5">
                        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-saffron font-extrabold text-ink">Q</span>
                        <span className="text-lg font-bold tracking-tight">QuickBite</span>
                    </span>
                </Link>

                <div className="mx-auto my-auto w-full max-w-sm py-12">
                    <h1 className="font-display text-4xl font-bold tracking-[-0.03em]">Sign in</h1>
                    <p className="mt-2 text-ink/60">Use the login your restaurant gave you.</p>

                    <form onSubmit={submit} className="mt-9 space-y-4" noValidate>
                        <label className="block">
                            <span className="mb-1.5 block text-sm font-semibold">Email / login ID</span>
                            <input
                                className={field}
                                type="email"
                                name="email"
                                autoComplete="username"
                                inputMode="email"
                                value={form.email}
                                onChange={update}
                                required
                                autoFocus
                            />
                        </label>
                        <label className="block">
                            <span className="mb-1.5 block text-sm font-semibold">Password</span>
                            <span className="relative block">
                                <input
                                    className={`${field} pr-12`}
                                    type={showPassword ? 'text' : 'password'}
                                    name="password"
                                    autoComplete="current-password"
                                    value={form.password}
                                    onChange={update}
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword((value) => !value)}
                                    className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-ink/45 hover:text-ink"
                                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                                >
                                    {showPassword ? <FiEyeOff /> : <FiEye />}
                                </button>
                            </span>
                        </label>

                        {error && (
                            <p role="alert" className="flex items-start gap-2 rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700 ring-1 ring-red-200">
                                <FiLock className="mt-0.5 shrink-0" /> {error}
                            </p>
                        )}

                        <button
                            type="submit"
                            disabled={loading || !form.email || !form.password}
                            className="group flex w-full items-center justify-center gap-2 rounded-2xl bg-ink px-5 py-4 font-semibold text-paper transition hover:bg-ink/85 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {loading ? 'Signing in…' : <>Sign in <FiArrowRight className="transition-transform group-hover:translate-x-0.5" /></>}
                        </button>
                    </form>

                    <p className="mt-6 text-sm text-ink/55">
                        Forgot your password? Ask your restaurant owner to reset it from Staff.
                    </p>

                    <section className="mt-10" aria-labelledby="demo-heading">
                        <h2 id="demo-heading" className="flex items-center gap-3 font-code text-[11px] font-semibold uppercase tracking-[0.2em] text-ink/45">
                            <span className="h-px flex-1 bg-ink/10" /> Try the demo <span className="h-px flex-1 bg-ink/10" />
                        </h2>
                        <div className="mt-4 grid grid-cols-2 gap-3">
                            {demos.map((demo) => {
                                const Icon = demo.icon;
                                return (
                                    <button
                                        key={demo.role}
                                        type="button"
                                        onClick={() => openDemo(demo.role)}
                                        disabled={Boolean(demoLoading)}
                                        className="group rounded-2xl border border-ink/10 bg-white p-4 text-left transition hover:border-ink/30 hover:shadow-[0_10px_30px_-18px_rgba(15,14,12,0.5)] disabled:opacity-60"
                                    >
                                        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-saffron/10 text-saffron-deep">
                                            <Icon />
                                        </span>
                                        <span className="mt-3 flex items-center gap-1.5 font-semibold">
                                            {demoLoading === demo.role ? 'Opening…' : demo.title}
                                            <FiArrowRight className="text-ink/40 transition-transform group-hover:translate-x-0.5" />
                                        </span>
                                        <span className="mt-0.5 block text-xs leading-snug text-ink/55">{demo.text}</span>
                                    </button>
                                );
                            })}
                        </div>
                        <p className="mt-3 text-center text-xs text-ink/45">A sample restaurant - no sign-up, nothing real is touched.</p>
                    </section>
                </div>

                <p className="text-center text-sm text-ink/55">
                    New restaurant?{' '}
                    <a
                        href={demoHref}
                        {...(demoIsExternal && { target: '_blank', rel: 'noreferrer' })}
                        className="font-semibold text-ink underline decoration-ink/25 underline-offset-4 hover:decoration-ink"
                    >
                        Book a demo
                    </a>
                </p>
            </main>
        </div>
    );
}
