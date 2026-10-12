const MenuItem = require('../models/menuItem.model');
const { isValidObjectId, sanitizeString } = require('../middleware/validation');
const { round2 } = require('../utils/billing');

const MAX_IMPORT_ITEMS = 500;

/**
 * Validate menu item fields from a request body.
 * With partial = true (update), only the fields present are validated.
 * @returns {{ value?: object, error?: string }}
 */
const parseMenuInput = (body = {}, { partial = false } = {}) => {
    const value = {};

    if (!partial || body.name !== undefined) {
        const name = sanitizeString(body.name);
        if (name.length < 2 || name.length > 60) {
            return { error: 'Name must be 2 to 60 characters' };
        }
        value.name = name;
    }

    if (!partial || body.price !== undefined) {
        const price = Number(body.price);
        if (!Number.isFinite(price) || price <= 0 || price > 100000) {
            return { error: 'Price must be a number greater than 0' };
        }
        value.price = round2(price);
    }

    if (!partial || body.counter !== undefined) {
        const counter = sanitizeString(body.counter);
        if (counter.length < 1 || counter.length > 40) {
            return { error: 'Counter must be 1 to 40 characters' };
        }
        value.counter = counter;
    }

    if (body.category !== undefined) {
        const category = sanitizeString(body.category);
        if (category.length > 40) {
            return { error: 'Category must be at most 40 characters' };
        }
        value.category = category || 'General';
    }

    if (body.image !== undefined) {
        if (typeof body.image !== 'string' || !/^[a-z0-9-]{0,40}$/.test(body.image)) {
            return { error: 'Invalid photo' };
        }
        value.image = body.image;
    }

    for (const field of ['isVeg', 'isAvailable']) {
        if (body[field] !== undefined) {
            if (typeof body[field] !== 'boolean') {
                return { error: `${field} must be true or false` };
            }
            value[field] = body[field];
        }
    }

    if (body.sortOrder !== undefined) {
        const sortOrder = Number(body.sortOrder);
        if (!Number.isInteger(sortOrder)) {
            return { error: 'sortOrder must be a whole number' };
        }
        value.sortOrder = sortOrder;
    }

    return { value };
};

const isDuplicateKeyError = (error) => error?.code === 11000;

/**
 * Full menu for the counter, including sold-out items
 */
module.exports.getMenu = async (req, res) => {
    try {
        const items = await MenuItem.find({ hotel: req.hotelId })
            .sort({ counter: 1, sortOrder: 1, name: 1 })
            .lean();

        res.status(200).json({ success: true, count: items.length, items });
    } catch (error) {
        console.error('❌ Error fetching menu:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch menu' });
    }
};

/**
 * Mark a menu item as available / sold out (counter staff)
 */
module.exports.setItemAvailability = async (req, res) => {
    try {
        const { id } = req.params;
        const { isAvailable } = req.body;

        if (!isValidObjectId(id)) {
            return res.status(400).json({ success: false, message: 'Invalid item ID' });
        }
        if (typeof isAvailable !== 'boolean') {
            return res.status(400).json({ success: false, message: 'isAvailable must be true or false' });
        }

        const item = await MenuItem.findOneAndUpdate({ _id: id, hotel: req.hotelId }, { isAvailable }, { new: true }).lean();
        if (!item) {
            return res.status(404).json({ success: false, message: 'Menu item not found' });
        }

        res.status(200).json({ success: true, item });
    } catch (error) {
        console.error('❌ Error updating item availability:', error);
        res.status(500).json({ success: false, message: 'Failed to update item' });
    }
};

/**
 * Add a menu item (admin)
 */
module.exports.createMenuItem = async (req, res) => {
    try {
        const { value, error } = parseMenuInput(req.body);
        if (error) {
            return res.status(400).json({ success: false, message: error });
        }

        const item = await MenuItem.create({ ...value, hotel: req.hotelId });
        console.log(`✅ Menu item added: ${item.name} (₹${item.price}, ${item.counter})`);

        res.status(201).json({ success: true, item });
    } catch (error) {
        if (isDuplicateKeyError(error)) {
            return res.status(409).json({ success: false, message: 'An item with this name already exists' });
        }
        console.error('❌ Error adding menu item:', error);
        res.status(500).json({ success: false, message: 'Failed to add menu item' });
    }
};

/**
 * Edit a menu item (admin)
 * Existing bills keep the name & price they were billed with
 */
module.exports.updateMenuItem = async (req, res) => {
    try {
        if (!isValidObjectId(req.params.id)) {
            return res.status(400).json({ success: false, message: 'Invalid item ID' });
        }

        const { value, error } = parseMenuInput(req.body, { partial: true });
        if (error) {
            return res.status(400).json({ success: false, message: error });
        }

        const item = await MenuItem.findOne({ _id: req.params.id, hotel: req.hotelId });
        if (!item) {
            return res.status(404).json({ success: false, message: 'Menu item not found' });
        }

        item.set(value);
        await item.save();

        res.status(200).json({ success: true, item });
    } catch (error) {
        if (isDuplicateKeyError(error)) {
            return res.status(409).json({ success: false, message: 'An item with this name already exists' });
        }
        console.error('❌ Error updating menu item:', error);
        res.status(500).json({ success: false, message: 'Failed to update menu item' });
    }
};

/**
 * Remove a menu item (admin)
 * Past bills are unaffected - they store their own copy of each item
 */
module.exports.deleteMenuItem = async (req, res) => {
    try {
        if (!isValidObjectId(req.params.id)) {
            return res.status(400).json({ success: false, message: 'Invalid item ID' });
        }

        const item = await MenuItem.findOneAndDelete({ _id: req.params.id, hotel: req.hotelId }).lean();
        if (!item) {
            return res.status(404).json({ success: false, message: 'Menu item not found' });
        }

        console.log(`✅ Menu item removed: ${item.name}`);
        res.status(200).json({ success: true, message: `${item.name} removed from the menu` });
    } catch (error) {
        console.error('❌ Error removing menu item:', error);
        res.status(500).json({ success: false, message: 'Failed to remove menu item' });
    }
};

/**
 * Bulk import / update menu items (admin)
 * Items are matched by name (case-insensitive): existing items get the new
 * price / counter / category, new names are added. All-or-nothing.
 */
module.exports.importMenu = async (req, res) => {
    try {
        const { items } = req.body;

        if (!Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ success: false, message: 'Add at least one item to import' });
        }
        if (items.length > MAX_IMPORT_ITEMS) {
            return res.status(400).json({ success: false, message: `You can import at most ${MAX_IMPORT_ITEMS} items at a time` });
        }

        const errors = [];
        const seen = new Set();
        const rows = [];

        items.forEach((raw, index) => {
            const { value, error } = parseMenuInput(raw);
            if (error) {
                errors.push({ row: index + 1, message: error });
                return;
            }
            const nameKey = value.name.toLowerCase();
            if (seen.has(nameKey)) {
                errors.push({ row: index + 1, message: `${value.name} appears more than once` });
                return;
            }
            seen.add(nameKey);
            rows.push({ ...value, nameKey });
        });

        if (errors.length > 0) {
            return res.status(400).json({ success: false, message: 'Fix the highlighted rows and try again', errors });
        }

        const insertDefaults = { category: 'General', isVeg: true, isAvailable: true, sortOrder: 0 };

        const result = await MenuItem.bulkWrite(rows.map((row) => {
            // Defaults only for fields the row doesn't set ($set and $setOnInsert can't share a path)
            const setOnInsert = Object.fromEntries(
                Object.entries(insertDefaults).filter(([field]) => row[field] === undefined)
            );
            const update = { $set: { ...row, hotel: req.hotelId } };
            if (Object.keys(setOnInsert).length > 0) update.$setOnInsert = setOnInsert;
            return {
                updateOne: {
                    filter: { hotel: req.hotelId, nameKey: row.nameKey },
                    update,
                    upsert: true
                }
            };
        }));

        const created = result.upsertedCount;
        const updated = result.matchedCount;
        console.log(`✅ Menu import: ${created} added, ${updated} updated`);

        res.status(200).json({
            success: true,
            message: `${created} added, ${updated} updated`,
            created,
            updated
        });
    } catch (error) {
        console.error('❌ Error importing menu:', error);
        res.status(500).json({ success: false, message: 'Failed to import menu' });
    }
};
