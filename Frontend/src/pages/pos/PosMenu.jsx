import { useEffect, useMemo, useState } from 'react';
import { FiPlus, FiSearch, FiEdit2, FiTrash2, FiUpload, FiX } from 'react-icons/fi';
import Skeleton from '../../components/pos/Skeleton';
import VegDot from '../../components/pos/VegDot';
import { showToast } from '../../utils/toast';
import { posApi, formatINR } from '../../utils/pos';
import { useCachedQuery } from '../../utils/useCachedQuery';

const NO_ITEMS = [];
// Same cache key as the billing counter - edits show up there instantly
const fetchMenu = () => posApi.get('/menu').then((res) => res.data.items);
const EMPTY_FORM = { name: '', price: '', counter: '', category: '', isVeg: true, isAvailable: true };

/**
 * Parse pasted menu lines: "Name, Price, Counter, Category, veg/non-veg"
 * (tab-separated rows pasted from Excel / Google Sheets also work)
 */
const parseImportText = (text) => text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.split(line.includes('\t') ? '\t' : ',').map((cell) => cell.trim()))
    .filter((cells, index) => !(index === 0 && cells[0].toLowerCase() === 'name'))
    .map(([name, price, counter, category, veg]) => {
        const item = { name, price: Number(price), counter };
        if (category) item.category = category;
        if (veg) {
            const value = veg.toLowerCase().replace(/[\s-]/g, '');
            if (['veg', 'v', 'yes', 'true'].includes(value)) item.isVeg = true;
            if (['nonveg', 'nv', 'no', 'false'].includes(value)) item.isVeg = false;
        }
        return item;
    });

export default function PosMenu() {
    const { data: menuData, error: menuError, refresh: loadMenu } = useCachedQuery('menu', fetchMenu);
    const items = menuData || NO_ITEMS;
    const [search, setSearch] = useState('');
    const [form, setForm] = useState(null); // null = closed, { ...fields, _id? } = open
    const [saving, setSaving] = useState(false);
    const [importOpen, setImportOpen] = useState(false);
    const [importText, setImportText] = useState('');
    const [importErrors, setImportErrors] = useState([]);

    useEffect(() => {
        if (menuError) showToast.error('Failed to load menu');
    }, [menuError]);

    const counters = useMemo(() => [...new Set(items.map((item) => item.counter))].sort(), [items]);
    const categories = useMemo(() => [...new Set(items.map((item) => item.category).filter(Boolean))].sort(), [items]);

    const grouped = useMemo(() => {
        const term = search.trim().toLowerCase();
        const groups = new Map();
        items
            .filter((item) => !term || item.name.toLowerCase().includes(term) || item.counter.toLowerCase().includes(term))
            .forEach((item) => {
                if (!groups.has(item.counter)) groups.set(item.counter, []);
                groups.get(item.counter).push(item);
            });
        return [...groups.entries()];
    }, [items, search]);

    const importRows = useMemo(() => parseImportText(importText), [importText]);

    const saveItem = async (event) => {
        event.preventDefault();
        setSaving(true);
        const payload = {
            name: form.name,
            price: Number(form.price),
            counter: form.counter,
            category: form.category,
            isVeg: form.isVeg,
            isAvailable: form.isAvailable,
        };
        try {
            if (form._id) {
                await posApi.put(`/menu/${form._id}`, payload);
                showToast.success(`${form.name} updated`);
            } else {
                await posApi.post('/menu', payload);
                showToast.success(`${form.name} added`);
            }
            setForm(null);
            loadMenu();
        } catch (error) {
            showToast.error(error.response?.data?.message || 'Failed to save item');
        } finally {
            setSaving(false);
        }
    };

    const toggleAvailable = async (item) => {
        try {
            await posApi.patch(`/menu/${item._id}/availability`, { isAvailable: !item.isAvailable });
            loadMenu();
        } catch (error) {
            showToast.error(error.response?.data?.message || 'Failed to update item');
        }
    };

    const deleteItem = async (item) => {
        if (!window.confirm(`Remove "${item.name}" from the menu? Past bills are not affected.`)) return;
        try {
            await posApi.delete(`/menu/${item._id}`);
            showToast.success(`${item.name} removed`);
            loadMenu();
        } catch (error) {
            showToast.error(error.response?.data?.message || 'Failed to remove item');
        }
    };

    const runImport = async () => {
        setImportErrors([]);
        setSaving(true);
        try {
            const res = await posApi.post('/menu/import', { items: importRows });
            showToast.success(`Menu imported: ${res.data.message}`);
            setImportOpen(false);
            setImportText('');
            loadMenu();
        } catch (error) {
            setImportErrors(error.response?.data?.errors || []);
            showToast.error(error.response?.data?.message || 'Import failed');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div>
            <div className="mx-auto max-w-5xl space-y-4 px-3 py-5 sm:px-6 sm:py-6">
                <div className="flex flex-wrap items-center gap-2">
                    <h1 className="mr-auto text-xl font-semibold tracking-tight">Menu <span className="text-sm font-normal text-stone-400">· {items.length} items</span></h1>
                    <div className="relative">
                        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search items or counters"
                            className="rounded-lg border border-stone-200 bg-white py-2 pl-9 pr-3 outline-none focus:border-orange-500"
                        />
                    </div>
                    <button
                        onClick={() => { setImportErrors([]); setImportOpen(true); }}
                        className="flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-3 py-2 font-semibold text-stone-700"
                    >
                        <FiUpload /> Bulk import
                    </button>
                    <button
                        onClick={() => setForm({ ...EMPTY_FORM, counter: counters[0] || '' })}
                        className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-orange-500 to-rose-500 px-4 py-2 font-bold text-white"
                    >
                        <FiPlus /> Add item
                    </button>
                </div>

                {grouped.map(([counter, counterItems]) => (
                    <section key={counter} className="overflow-hidden rounded-2xl border border-stone-200/80 bg-white shadow-[0_1px_2px_rgba(28,25,23,0.05)]">
                        <h2 className="border-b border-stone-100 bg-stone-50 px-4 py-2 text-sm font-bold uppercase tracking-wider text-stone-600">
                            {counter} · {counterItems.length}
                        </h2>
                        {counterItems.map((item) => (
                            <div key={item._id} className="flex items-center gap-3 border-b border-stone-50 px-4 py-2.5 last:border-0">
                                <VegDot isVeg={item.isVeg} />
                                <div className="min-w-0 flex-1">
                                    <p className={`truncate font-semibold ${item.isAvailable ? '' : 'text-stone-400 line-through'}`}>{item.name}</p>
                                    <p className="text-xs text-stone-500">
                                        {item.category}
                                        <span className="font-semibold text-stone-700 sm:hidden"> · {formatINR(item.price)}</span>
                                    </p>
                                </div>
                                <span className="hidden w-24 text-right font-bold tabular-nums sm:block">{formatINR(item.price)}</span>
                                <button
                                    onClick={() => toggleAvailable(item)}
                                    className={`w-20 shrink-0 rounded-full px-2 py-1 text-[11px] font-bold sm:w-24 sm:text-xs ${
                                        item.isAvailable ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                    }`}
                                    title="Tap to switch"
                                >
                                    {item.isAvailable ? 'Available' : 'Sold out'}
                                </button>
                                <button
                                    onClick={() => setForm({ ...EMPTY_FORM, ...item, price: String(item.price) })}
                                    className="rounded-lg p-2 text-stone-600 hover:bg-stone-100"
                                    title="Edit"
                                >
                                    <FiEdit2 />
                                </button>
                                <button
                                    onClick={() => deleteItem(item)}
                                    className="rounded-lg p-2 text-red-500 hover:bg-red-50"
                                    title="Remove"
                                >
                                    <FiTrash2 />
                                </button>
                            </div>
                        ))}
                    </section>
                ))}

                {!menuData && Array.from({ length: 3 }, (_, index) => <Skeleton key={index} className="h-40" />)}

                {menuData && grouped.length === 0 && (
                    <p className="rounded-xl bg-white py-12 text-center text-stone-500">
                        {items.length === 0 ? 'No items yet. Add one or use Bulk import.' : 'No items match your search.'}
                    </p>
                )}
            </div>

            {/* Add / edit item */}
            {form && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
                    <form onSubmit={saveItem} className="w-full max-w-md space-y-3 rounded-2xl bg-white p-6 shadow-2xl">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-bold">{form._id ? 'Edit item' : 'Add item'}</h3>
                            <button type="button" onClick={() => setForm(null)} className="rounded-lg p-1 hover:bg-stone-100" aria-label="Close">
                                <FiX />
                            </button>
                        </div>

                        <label className="block text-sm font-semibold text-stone-700">
                            Name
                            <input
                                value={form.name}
                                onChange={(e) => setForm({ ...form, name: e.target.value })}
                                required
                                minLength={2}
                                maxLength={60}
                                placeholder="e.g. Masala Dosa"
                                className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 font-normal outline-none focus:border-orange-500"
                                autoFocus
                            />
                        </label>

                        <div className="grid grid-cols-2 gap-3">
                            <label className="block text-sm font-semibold text-stone-700">
                                Price (₹)
                                <input
                                    value={form.price}
                                    onChange={(e) => setForm({ ...form, price: e.target.value.replace(/[^\d.]/g, '') })}
                                    required
                                    inputMode="decimal"
                                    placeholder="80"
                                    className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 font-normal outline-none focus:border-orange-500"
                                />
                            </label>
                            <label className="block text-sm font-semibold text-stone-700">
                                Category
                                <input
                                    value={form.category}
                                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                                    list="menu-categories"
                                    maxLength={40}
                                    placeholder="Breakfast"
                                    className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 font-normal outline-none focus:border-orange-500"
                                />
                            </label>
                        </div>

                        <label className="block text-sm font-semibold text-stone-700">
                            Food counter (where it is collected)
                            <input
                                value={form.counter}
                                onChange={(e) => setForm({ ...form, counter: e.target.value })}
                                list="menu-counters"
                                required
                                maxLength={40}
                                placeholder="e.g. Dosa Counter"
                                className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 font-normal outline-none focus:border-orange-500"
                            />
                        </label>

                        <div className="flex gap-2">
                            {[true, false].map((isVeg) => (
                                <button
                                    key={String(isVeg)}
                                    type="button"
                                    onClick={() => setForm({ ...form, isVeg })}
                                    className={`flex flex-1 items-center justify-center gap-2 rounded-lg border py-2 font-semibold ${
                                        form.isVeg === isVeg ? 'border-stone-900 bg-stone-900 text-white' : 'border-stone-200'
                                    }`}
                                >
                                    <VegDot isVeg={isVeg} /> {isVeg ? 'Veg' : 'Non-veg'}
                                </button>
                            ))}
                        </div>

                        <label className="flex items-center gap-2 text-sm font-semibold text-stone-700">
                            <input
                                type="checkbox"
                                checked={form.isAvailable}
                                onChange={(e) => setForm({ ...form, isAvailable: e.target.checked })}
                                className="h-4 w-4 accent-orange-500"
                            />
                            Available now
                        </label>

                        <button
                            type="submit"
                            disabled={saving}
                            className="w-full rounded-xl bg-gradient-to-r from-orange-500 to-rose-500 py-3 font-bold text-white disabled:opacity-50"
                        >
                            {saving ? 'Saving...' : form._id ? 'Save changes' : 'Add to menu'}
                        </button>
                    </form>
                </div>
            )}

            {/* Bulk import */}
            {importOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
                    <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl bg-white p-6 shadow-2xl">
                        <div className="mb-2 flex items-center justify-between">
                            <h3 className="text-lg font-bold">Bulk import menu</h3>
                            <button onClick={() => setImportOpen(false)} className="rounded-lg p-1 hover:bg-stone-100" aria-label="Close">
                                <FiX />
                            </button>
                        </div>
                        <p className="mb-2 text-sm text-stone-600">
                            One item per line: <span className="font-mono">Name, Price, Counter, Category, veg/non-veg</span>.
                            You can also paste rows straight from Excel or Google Sheets. Existing names get the new price and counter.
                        </p>
                        <textarea
                            value={importText}
                            onChange={(e) => { setImportText(e.target.value); setImportErrors([]); }}
                            rows={8}
                            placeholder={'Masala Dosa, 80, Dosa Counter, Dosa, veg\nFilter Coffee, 30, Beverages, Beverages, veg\nChicken Biryani, 220, Meals Counter, Rice, non-veg'}
                            className="w-full rounded-lg border border-stone-200 p-3 font-mono text-sm outline-none focus:border-orange-500"
                        />

                        {importRows.length > 0 && (
                            <div className="mt-3 min-h-0 flex-1 overflow-y-auto rounded-lg border border-stone-100">
                                <table className="w-full text-sm">
                                    <thead className="bg-stone-50 text-left text-xs uppercase text-stone-500">
                                        <tr>
                                            <th className="px-2 py-1">#</th>
                                            <th className="px-2 py-1">Name</th>
                                            <th className="px-2 py-1 text-right">Price</th>
                                            <th className="px-2 py-1">Counter</th>
                                            <th className="px-2 py-1">Category</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {importRows.map((row, index) => {
                                            const rowError = importErrors.find((error) => error.row === index + 1);
                                            return (
                                                <tr key={index} className={rowError ? 'bg-red-50' : 'border-t border-stone-50'}>
                                                    <td className="px-2 py-1 text-stone-400">{index + 1}</td>
                                                    <td className="px-2 py-1">
                                                        {row.isVeg !== undefined && <span className="mr-1 inline-block align-middle"><VegDot isVeg={row.isVeg} /></span>}
                                                        {row.name}
                                                        {rowError && <p className="text-xs font-semibold text-red-600">{rowError.message}</p>}
                                                    </td>
                                                    <td className="px-2 py-1 text-right">{Number.isFinite(row.price) ? formatINR(row.price) : '—'}</td>
                                                    <td className="px-2 py-1">{row.counter}</td>
                                                    <td className="px-2 py-1">{row.category}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        <button
                            onClick={runImport}
                            disabled={saving || importRows.length === 0}
                            className="mt-3 w-full rounded-xl bg-gradient-to-r from-orange-500 to-rose-500 py-3 font-bold text-white disabled:opacity-50"
                        >
                            {saving ? 'Importing...' : `Import ${importRows.length} item${importRows.length === 1 ? '' : 's'}`}
                        </button>
                    </div>
                </div>
            )}

            <datalist id="menu-counters">
                {counters.map((counter) => <option key={counter} value={counter} />)}
            </datalist>
            <datalist id="menu-categories">
                {categories.map((category) => <option key={category} value={category} />)}
            </datalist>
        </div>
    );
}
