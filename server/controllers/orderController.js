const crypto = require('crypto');
const { pool } = require('../config/db');
const { toPositiveInt, sanitizeString } = require('../middleware/validate');

function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

function generateReference() {
  const stamp = Date.now().toString(36).toUpperCase();
  const rand = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `MONO-${stamp}-${rand}`;
}

function normaliseItems(rawItems) {
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    throw httpError(400, 'Your bag is empty');
  }
  if (rawItems.length > 50) {
    throw httpError(400, 'Too many items in one order');
  }

  const items = rawItems.map((raw) => {
    if (!raw || typeof raw !== 'object') {
      throw httpError(400, 'Invalid cart item');
    }
    const productId = toPositiveInt(raw.productId, 0);
    if (!productId) {
      throw httpError(400, 'Invalid product in cart');
    }
    const quantity = toPositiveInt(raw.quantity, 1);
    if (!quantity || quantity > 20) {
      throw httpError(400, 'Invalid quantity in cart');
    }
    const size = raw.size ? sanitizeString(raw.size, 16) : null;
    return { productId, quantity, size };
  });

  // Merge duplicate product/size pairs.
  const merged = new Map();
  for (const item of items) {
    const key = `${item.productId}::${item.size || ''}`;
    if (merged.has(key)) {
      const existing = merged.get(key);
      existing.quantity = Math.min(20, existing.quantity + item.quantity);
    } else {
      merged.set(key, { ...item });
    }
  }
  return Array.from(merged.values());
}

async function createOrder(req, res, next) {
  let connection;
  try {
    const user = req.session && req.session.user;
    if (!user) {
      throw httpError(401, 'Authentication required');
    }

    const provider = sanitizeString(req.body && req.body.provider, 32) || 'stripe';
    const items = normaliseItems(req.body && req.body.items);

    connection = await pool.getConnection();
    await connection.beginTransaction();

    const ids = [...new Set(items.map((i) => i.productId))];
    const placeholders = ids.map(() => '?').join(', ');
    const [rows] = await connection.query(
      `SELECT id, slug, name, price_cents, currency, stock
         FROM products
        WHERE id IN (${placeholders})`,
      ids
    );

    const byId = new Map(rows.map((row) => [Number(row.id), row]));

    let subtotalCents = 0;
    const lines = [];

    for (const item of items) {
      const product = byId.get(item.productId);
      if (!product) {
        throw httpError(400, 'One of the items is no longer available');
      }
      if (Number(product.stock) < item.quantity) {
        throw httpError(409, `${product.name} does not have enough stock`);
      }
      const unitPrice = Number(product.price_cents);
      if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
        throw httpError(500, 'Product pricing is unavailable');
      }
      subtotalCents += unitPrice * item.quantity;
      lines.push({
        productId: item.productId,
        size: item.size,
        quantity: item.quantity,
        unitPriceCents: unitPrice,
        name: product.name,
      });
    }

    const totalCents = subtotalCents;
    if (totalCents <= 0) {
      throw httpError(400, 'Order total must be greater than zero');
    }

    const reference = generateReference();
    const currency = 'USD';

    const [orderResult] = await connection.execute(
      `INSERT INTO orders (user_id, reference, status, subtotal_cents, total_cents, currency)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [user.id, reference, 'pending', subtotalCents, totalCents, currency]
    );
    const orderId = orderResult.insertId;

    for (const line of lines) {
      await connection.execute(
        `INSERT INTO order_items (order_id, product_id, size, quantity, unit_price_cents, name_snapshot)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [orderId, line.productId, line.size, line.quantity, line.unitPriceCents, line.name]
      );
    }

    await connection.commit();
    connection.release();
    connection = null;

    const itemCount = lines.reduce((sum, line) => sum + line.quantity, 0);
    const description = `MONOLITH order ${reference} — ${itemCount} item${itemCount === 1 ? '' : 's'}`;

    let checkout;
    try {
      const payments = require('../payments');
      checkout = await payments.createCheckout({
        provider,
        user: { id: user.id, email: user.email },
        amount: totalCents,
        description,
        itemId: reference,
      });
    } catch (checkoutError) {
      try {
        await pool.execute(
          'UPDATE orders SET status = ? WHERE reference = ?',
          ['failed', reference]
        );
      } catch (_) {
        /* ignore secondary failure */
      }
      const message =
        (checkoutError && checkoutError.message) || 'Unable to start checkout';
      throw httpError(checkoutError && checkoutError.status ? checkoutError.status : 502, message);
    }

    return res.status(201).json({
      reference,
      orderId,
      totalCents,
      currency,
      redirectUrl:
        (checkout && (checkout.redirectUrl || checkout.url || checkout.checkoutUrl)) || null,
      paymentReference: (checkout && checkout.reference) || reference,
    });
  } catch (err) {
    if (connection) {
      try {
        await connection.rollback();
      } catch (_) {
        /* ignore */
      }
      connection.release();
    }
    return next(err);
  }
}

async function listOrders(req, res, next) {
  try {
    const user = req.session && req.session.user;
    if (!user) {
      throw httpError(401, 'Authentication required');
    }

    const [orders] = await pool.execute(
      `SELECT id, reference, status, subtotal_cents, total_cents, currency, created_at
         FROM orders
        WHERE user_id = ?
        ORDER BY created_at DESC, id DESC
        LIMIT 100`,
      [user.id]
    );

    if (orders.length === 0) {
      return res.json({ orders: [] });
    }

    const orderIds = orders.map((o) => o.id);
    const placeholders = orderIds.map(() => '?').join(', ');
    const [itemRows] = await pool.query(
      `SELECT id, order_id, product_id, size, quantity, unit_price_cents, name_snapshot
         FROM order_items
        WHERE order_id IN (${placeholders})`,
      orderIds
    );

    const itemsByOrder = new Map();
    for (const row of itemRows) {
      const list = itemsByOrder.get(row.order_id) || [];
      list.push({
        id: row.id,
        productId: row.product_id,
        size: row.size,
        quantity: row.quantity,
        unitPriceCents: Number(row.unit_price_cents),
        name: row.name_snapshot,
      });
      itemsByOrder.set(row.order_id, list);
    }

    return res.json({
      orders: orders.map((o) => ({
        id: o.id,
        reference: o.reference,
        status: o.status,
        subtotalCents: Number(o.subtotal_cents),
        totalCents: Number(o.total_cents),
        currency: o.currency,
        createdAt: o.created_at,
        items: itemsByOrder.get(o.id) || [],
      })),
    });
  } catch (err) {
    return next(err);
  }
}

async function getOrder(req, res, next) {
  try {
    const user = req.session && req.session.user;
    if (!user) {
      throw httpError(401, 'Authentication required');
    }

    const reference = sanitizeString(req.params.reference, 64);
    if (!reference) {
      throw httpError(400, 'Order reference is required');
    }

    const [rows] = await pool.execute(
      `SELECT id, reference, status, subtotal_cents, total_cents, currency, created_at
         FROM orders
        WHERE reference = ? AND user_id = ?
        LIMIT 1`,
      [reference, user.id]
    );

    if (rows.length === 0) {
      throw httpError(404, 'Order not found');
    }

    const order = rows[0];
    const [items] = await pool.execute(
      `SELECT id, product_id, size, quantity, unit_price_cents, name_snapshot
         FROM order_items
        WHERE order_id = ?`,
      [order.id]
    );

    return res.json({
      order: {
        id: order.id,
        reference: order.reference,
        status: order.status,
        subtotalCents: Number(order.subtotal_cents),
        totalCents: Number(order.total_cents),
        currency: order.currency,
        createdAt: order.created_at,
        items: items.map((row) => ({
          id: row.id,
          productId: row.product_id,
          size: row.size,
          quantity: row.quantity,
          unitPriceCents: Number(row.unit_price_cents),
          name: row.name_snapshot,
        })),
      },
    });
  } catch (err) {
    return next(err);
  }
}

async function fulfilOrder(reference) {
  if (!reference || typeof reference !== 'string') {
    return { fulfilled: false, reason: 'missing-reference' };
  }

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [rows] = await connection.execute(
      'SELECT id, status FROM orders WHERE reference = ? LIMIT 1 FOR UPDATE',
      [reference]
    );

    if (rows.length === 0) {
      await connection.rollback();
      return { fulfilled: false, reason: 'order-not-found' };
    }

    const order = rows[0];
    if (order.status === 'paid') {
      await connection.rollback();
      return { fulfilled: true, reason: 'already-paid' };
    }

    await connection.execute('UPDATE orders SET status = ? WHERE id = ?', ['paid', order.id]);

    const [items] = await connection.execute(
      'SELECT product_id, size, quantity FROM order_items WHERE order_id = ?',
      [order.id]
    );

    for (const item of items) {
      await connection.execute(
        'UPDATE products SET stock = GREATEST(stock - ?, 0) WHERE id = ?',
        [item.quantity, item.product_id]
      );
      if (item.size) {
        await connection.execute(
          'UPDATE product_sizes SET stock = GREATEST(stock - ?, 0) WHERE product_id = ? AND size = ?',
          [item.quantity, item.product_id, item.size]
        );
      }
    }

    await connection.commit();
    return { fulfilled: true, orderId: order.id };
  } catch (err) {
    if (connection) {
      try {
        await connection.rollback();
      } catch (_) {
        /* ignore */
      }
    }
    console.error('fulfilOrder failed for', reference, err);
    return { fulfilled: false, reason: 'error', error: err.message };
  } finally {
    if (connection) connection.release();
  }
}

module.exports = { createOrder, listOrders, getOrder, fulfilOrder };