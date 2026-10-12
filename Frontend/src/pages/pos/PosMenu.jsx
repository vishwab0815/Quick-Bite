import { useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import {
    PiPlusBold, PiMagnifyingGlassBold, PiPencilSimpleBold, PiTrashBold, PiUploadSimpleBold, PiBowlFoodDuotone,
    PiCheckBold, PiSparkleFill,
} from 'react-icons/pi';
import Skeleton from '../../components/pos/Skeleton';
import {
    Button, ConfirmDialog, DishPhoto, EmptyState, Field, IconButton, Modal, PageHeader, Segmented, Switch, VegMark,
    cardClass, inputClass,
} from '../../components/pos/ui';
import { showToast } from '../../utils/toast';
import { posApi, formatINR, formatPrice } from '../../utils/pos';
import { FOOD_PHOTOS, dishPhotoKey, photoUrl } from '../../utils/foodPhotos';
import { useCachedQuery } from '../../utils/useCachedQuery';

const NO_ITEMS = [];
// Same cache key as the billing counter - edits show up there instantly
const fetchMenu = () => posApi.get('/menu').then((res) => res.data.items);
const EMPTY_FORM = { name: '', price: '', counter: '', category: '', isVeg: true, isAvailable: true, image: '' };

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

/* ---------- Dish card ---------- */

// Compact row on phones, photo card on wider screens
const MenuCard = ({ item, onToggle, onEdit, onDelete }) => (
    <article className={`${cardClass} flex overflow-hidden sm:flex-col`}>
        <div className="relative w-28 shrink-0 overflow-hidden bg-stone-100 sm:aspect-[16/10] sm:w-auto">
            <DishPhoto item={item} rounded="" dimmed={!item.isAvailable} className="absolute inset-0 h-full w-full sm:static" />
            <span className="absolute left-2 top-2 rounded-md bg-white/95 p-[3px] shadow-sm sm:left-3 sm:top-3"><VegMark isVeg={item.isVeg} /></span>
            {!item.isAvailable && (
                <span className="absolute bottom-2 left-2 rounded-full bg-stone-900/90 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white sm:bottom-auto sm:left-auto sm:right-3 sm:top-3 sm:px-2.5 sm:text-[11px]">Sold out</span>
            )}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-2 p-3.5 sm:gap-3 sm:p-4">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <h3 className="truncate text-[15px] font-semibold text-stone-900">{item.name}</h3>
                    <p className="truncate text-xs text-stone-500">{item.category || 'General'}</p>
                </div>
                <span className="font-display text-lg font-bold tabular-nums">{formatPrice(item.price)}</span>
            </div>
            <div className="mt-auto flex items-center justify-between sm:border-t sm:border-line sm:pt-3">
                <label className="flex items-center gap-2.5 text-[13px] font-medium text-stone-600">
                    <Switch checked={item.isAvailable} onChange={() => onToggle(item)} label={item.isAvailable ? `Mark ${item.name} sold out` : `Mark ${item.name} available`} />
                    {item.isAvailable ? 'Available' : 'Sold out'}
                </label>
                <div className="flex">
                    <IconButton label={`Edit ${item.name}`} onClick={() => onEdit(item)}><PiPencilSimpleBold /></IconButton>
                    <IconButton label={`Remove ${item.name}`} tone="danger" onClick={() => onDelete(item)}><PiTrashBold /></IconButton>
                </div>
            </div>
        </div>
    </article>
);

MenuCard.propTypes = {
    item: PropTypes.object.isRequired,
    onToggle: PropTypes.func.isRequired,
    onEdit: PropTypes.func.isRequired,
    onDelete: PropTypes.func.isRequired,
};

/* ---------- Add / edit dish ---------- */

const PhotoPicker = ({ form, onPick }) => {
    const autoKey = dishPhotoKey({ name: form.name, category: form.category });
    const options = [{ key: '', label: 'Automatic' }, ...FOOD_PHOTOS];
    return (
        <div className="grid max-h-[248px] grid-cols-4 gap-2 overflow-y-auto pr-1 sm:grid-cols-5">
            {options.map((photo) => {
                const selected = (form.image || '') === photo.key;
                const src = photo.key ? photoUrl(photo.key) : photoUrl(autoKey);
                return (
                    <button
                        key={photo.key || 'auto'}
                        type="button"
                        onClick={() => onPick(photo.key)}
                        title={photo.label}
                        aria-pressed={selected}
                        className={`group relative aspect-square overflow-hidden rounded-xl ring-2 transition ${selected ? 'ring-saffron' : 'ring-transparent hover:ring-stone-300'}`}
                    >
                        {src
                            ? <img src={src} alt="" loading="lazy" className="h-full w-full object-cover" />
                            : <span className="flex h-full w-full items-center justify-center bg-stone-100 text-stone-400"><PiBowlFoodDuotone className="text-2xl" /></span>}
                        {!photo.key && (
                            <span className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 bg-gradient-to-t from-black/70 to-transparent pb-1 pt-4 text-[10px] font-bold text-white">
                                <PiSparkleFill /> Auto
                            </span>
                        )}
                        {selected && (
                            <span className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-saffron text-[11px] text-white shadow"><PiCheckBold /></span>
                        )}
                    </button>
                );
            })}
        </div>
    );
};

PhotoPicker.propTypes = { form: PropTypes.object.isRequired, onPick: PropTypes.func.isRequired };

const DishForm = ({ form, setForm, saving, onSave, onClose }) => (
    <Modal
        title={form._id ? `Edit ${form.name || 'dish'}` : 'Add a dish'}
        description="Prices always come from here - the counter can never change them."
        onClose={onClose}
        size="lg"
    >
        <form onSubmit={onSave} className="grid gap-6 sm:grid-cols-[1fr_1.1fr]">
            <div className="space-y-3">
                <DishPhoto item={{ name: form.name, category: form.category, image: form.image }} className="aspect-[4/3] w-full" rounded="rounded-2xl" />
                <p className="text-[13px] font-semibold text-stone-700">Photo</p>
                <PhotoPicker form={form} onPick={(image) => setForm({ ...form, image })} />
            </div>
            <div className="space-y-4">
                <Field label="Dish name">
                    <input className={inputClass} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required minLength={2} maxLength={60} placeholder="e.g. Masala Dosa" autoFocus />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                    <Field label="Price (₹)">
                        <input className={inputClass} value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value.replace(/[^\d.]/g, '') })} required inputMode="decimal" placeholder="80" />
                    </Field>
                    <Field label="Category">
                        <input className={inputClass} value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} list="menu-categories" maxLength={40} placeholder="Breakfast" />
                    </Field>
                </div>
                <Field label="Food counter" hint="Where the customer collects it - groups kitchen tickets and token slips">
                    <input className={inputClass} value={form.counter} onChange={(event) => setForm({ ...form, counter: event.target.value })} list="menu-counters" required maxLength={40} placeholder="e.g. Dosa Counter" />
                </Field>
                <Segmented
                    options={[
                        { value: 'veg', label: <span className="flex items-center gap-2"><VegMark isVeg /> Veg</span> },
                        { value: 'nonveg', label: <span className="flex items-center gap-2"><VegMark isVeg={false} /> Non-veg</span> },
                    ]}
                    value={form.isVeg ? 'veg' : 'nonveg'}
                    onChange={(value) => setForm({ ...form, isVeg: value === 'veg' })}
                    size="lg"
                />
                <label className="flex items-center justify-between rounded-2xl bg-stone-50 px-4 py-3 text-sm font-semibold text-stone-700 ring-1 ring-line">
                    Available now
                    <Switch checked={form.isAvailable} onChange={(isAvailable) => setForm({ ...form, isAvailable })} label="Available now" />
                </label>
                <div className="flex justify-end gap-2 pt-2">
                    <Button variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button type="submit" variant="accent" disabled={saving}>{saving ? 'Saving…' : form._id ? 'Save changes' : 'Add to menu'}</Button>
                </div>
            </div>
        </form>
    </Modal>
);

DishForm.propTypes = {
    form: PropTypes.object.isRequired,
    setForm: PropTypes.func.isRequired,
    saving: PropTypes.bool,
    onSave: PropTypes.func.isRequired,
    onClose: PropTypes.func.isRequired,
};

/* ---------- Page ---------- */

export default function PosMenu() {
    const { data: menuData, error: menuError, refresh: loadMenu } = useCachedQuery('menu', fetchMenu);
    const items = menuData || NO_ITEMS;
    const [search, setSearch] = useState('');
    const [activeCounter, setActiveCounter] = useState('All');
    const [form, setForm] = useState(null); // null = closed, { ...fields, _id? } = open
    const [saving, setSaving] = useState(false);
    const [importOpen, setImportOpen] = useState(false);
    const [importText, setImportText] = useState('');
    const [importErrors, setImportErrors] = useState([]);
    const [removing, setRemoving] = useState(null);

    useEffect(() => {
        if (menuError) showToast.error('Failed to load menu');
    }, [menuError]);

    const counters = useMemo(() => [...new Set(items.map((item) => item.counter))].sort(), [items]);
    const categories = useMemo(() => [...new Set(items.map((item) => item.category).filter(Boolean))].sort(), [items]);
    const available = items.filter((item) => item.isAvailable).length;

    const grouped = useMemo(() => {
        const term = search.trim().toLowerCase();
        const groups = new Map();
        items
            .filter((item) => activeCounter === 'All' || item.counter === activeCounter)
            .filter((item) => !term || item.name.toLowerCase().includes(term) || (item.category || '').toLowerCase().includes(term))
            .forEach((item) => {
                if (!groups.has(item.counter)) groups.set(item.counter, []);
                groups.get(item.counter).push(item);
            });
        return [...groups.entries()];
    }, [items, search, activeCounter]);

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
            image: form.image || '',
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
        try {
            await posApi.delete(`/menu/${item._id}`);
            showToast.success(`${item.name} removed`);
            setRemoving(null);
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
        <div className="mx-auto max-w-[1400px] space-y-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            <PageHeader
                title="Menu"
                subtitle={menuData ? `${items.length} dishes · ${available} available now` : 'Your dishes, prices and food counters'}
                actions={(
                    <>
                        <Button variant="secondary" onClick={() => { setImportErrors([]); setImportOpen(true); }}><PiUploadSimpleBold /> Bulk import</Button>
                        <Button variant="accent" onClick={() => setForm({ ...EMPTY_FORM, counter: activeCounter !== 'All' ? activeCounter : counters[0] || '' })}><PiPlusBold /> Add dish</Button>
                    </>
                )}
            />

            <div className="flex flex-wrap items-center gap-3">
                <div className="relative w-full sm:w-72">
                    <PiMagnifyingGlassBold className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                    <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search dishes or categories" aria-label="Search dishes" className={`${inputClass} pl-10`} />
                </div>
                <div className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0">
                    {['All', ...counters].map((counter) => (
                        <button
                            key={counter}
                            type="button"
                            onClick={() => setActiveCounter(counter)}
                            className={`h-9 shrink-0 whitespace-nowrap rounded-full px-4 text-[13px] font-semibold transition-colors ${
                                activeCounter === counter ? 'bg-ink text-white' : 'bg-white text-stone-600 ring-1 ring-line hover:text-stone-900'
                            }`}
                        >
                            {counter === 'All' ? 'All counters' : counter}
                        </button>
                    ))}
                </div>
            </div>

            {!menuData && (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {Array.from({ length: 8 }, (_, index) => <Skeleton key={index} className="h-72 rounded-3xl" />)}
                </div>
            )}

            {grouped.map(([counter, counterItems]) => (
                <section key={counter} className="space-y-3">
                    <h2 className="flex items-center gap-2 text-[13px] font-bold uppercase tracking-[0.12em] text-stone-500">
                        {counter}
                        <span className="rounded-full bg-white px-2 py-0.5 text-xs tabular-nums text-stone-500 ring-1 ring-line">{counterItems.length}</span>
                    </h2>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {counterItems.map((item) => (
                            <MenuCard
                                key={item._id}
                                item={item}
                                onToggle={toggleAvailable}
                                onEdit={(dish) => setForm({ ...EMPTY_FORM, ...dish, price: String(dish.price), image: dish.image || '' })}
                                onDelete={setRemoving}
                            />
                        ))}
                    </div>
                </section>
            ))}

            {menuData && grouped.length === 0 && (
                <EmptyState icon={PiBowlFoodDuotone} title={items.length === 0 ? 'No dishes yet' : 'No dishes match'}>
                    {items.length === 0 ? 'Add your first dish, or paste your whole menu with Bulk import.' : 'Try a different search or counter.'}
                </EmptyState>
            )}

            {form && <DishForm form={form} setForm={setForm} saving={saving} onSave={saveItem} onClose={() => setForm(null)} />}

            {removing && (
                <ConfirmDialog
                    title={`Remove ${removing.name}?`}
                    description="It disappears from the counter. Past bills are not affected."
                    confirmLabel="Remove dish"
                    onConfirm={() => deleteItem(removing)}
                    onClose={() => setRemoving(null)}
                />
            )}

            {importOpen && (
                <Modal
                    title="Bulk import menu"
                    description="One dish per line: Name, Price, Counter, Category, veg/non-veg - or paste rows straight from Excel. Existing names get the new price."
                    onClose={() => setImportOpen(false)}
                    size="lg"
                    footer={(
                        <Button variant="accent" onClick={runImport} disabled={saving || importRows.length === 0}>
                            {saving ? 'Importing…' : `Import ${importRows.length} dish${importRows.length === 1 ? '' : 'es'}`}
                        </Button>
                    )}
                >
                    <textarea
                        value={importText}
                        onChange={(event) => { setImportText(event.target.value); setImportErrors([]); }}
                        rows={7}
                        placeholder={'Masala Dosa, 80, Dosa Counter, Dosa, veg\nFilter Coffee, 30, Beverages, Beverages, veg\nChicken Biryani, 220, Meals Counter, Rice, non-veg'}
                        className="w-full rounded-2xl border border-line bg-stone-50 p-4 font-mono text-sm outline-none transition focus:border-stone-900 focus:bg-white focus:ring-4 focus:ring-stone-900/5"
                    />
                    {importRows.length > 0 && (
                        <div className="mt-4 max-h-64 overflow-y-auto rounded-2xl border border-line">
                            <table className="w-full text-sm">
                                <thead className="sticky top-0 bg-stone-50 text-left text-[11px] font-semibold uppercase tracking-wider text-stone-500">
                                    <tr>
                                        <th className="px-3 py-2">#</th>
                                        <th className="px-3 py-2">Dish</th>
                                        <th className="px-3 py-2 text-right">Price</th>
                                        <th className="px-3 py-2">Counter</th>
                                        <th className="px-3 py-2">Category</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-line">
                                    {importRows.map((row, index) => {
                                        const rowError = importErrors.find((error) => error.row === index + 1);
                                        return (
                                            <tr key={index} className={rowError ? 'bg-rose-50' : ''}>
                                                <td className="px-3 py-2 text-stone-400">{index + 1}</td>
                                                <td className="px-3 py-2">
                                                    <span className="flex items-center gap-2">
                                                        {row.isVeg !== undefined && <VegMark isVeg={row.isVeg} />}
                                                        {row.name}
                                                    </span>
                                                    {rowError && <p className="text-xs font-semibold text-rose-600">{rowError.message}</p>}
                                                </td>
                                                <td className="px-3 py-2 text-right tabular-nums">{Number.isFinite(row.price) ? formatINR(row.price) : '—'}</td>
                                                <td className="px-3 py-2">{row.counter}</td>
                                                <td className="px-3 py-2">{row.category}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </Modal>
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
