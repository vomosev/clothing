const { pool } = require('../config/db');
const { sanitizeString, toPositiveInt } = require('../middleware/validate');

const SORTS = {
  newest: 'p.created_at DESC, p.id DESC',
  price_asc: 'p.price_cents ASC, p.id ASC',
  price_desc: 'p.price_cents DESC, p.id DESC',
};

function mapProduct(row) {
  if (!row) return null;
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    category: row.category,
    priceCents: Number(row.price_cents) || 0,
    price_cents: Number(row.price_cents) || 0,
    currency: row.currency || 'USD',
    imageKey: row.image_key,
    badge: row.badge || null,
    stock: Number(row.stock) || 0,
    isFeatured: Boolean(row.is_featured),
    createdAt: row.created_at,
  };
}

async function listProducts(req, res, next) {
  try {
    const category = sanitizeString(req.query.category, 60);
    const q = sanitizeString(req.query.q, 120);
    const featuredRaw = String(req.query.featured || '').toLowerCase();
    const featured = featuredRaw === 'true' || featuredRaw === '1';
    const sortKey = String(req.query.sort || 'newest');
    const orderBy = SORTS[sortKey] || SORTS.newest;

    let limit = toPositiveInt(req.query.limit, 60);
    if (!Number.isFinite(limit) || limit <= 0) limit = 60;
    if (limit > 100) limit = 100;

    const where = [];
    const params = [];

    if (category && category.toLowerCase() !== 'all') {
      where.push('p.category = ?');
      params.push(category);
    }
    if (q) {
      where.push('(p.name LIKE ? OR p.description LIKE ? OR p.category LIKE ?)');
      const like = `%${q}%`;
      params.push(like, like, like);
    }
    if (featured) {
      where.push('p.is_featured = 1');
    }

    const sql = `
      SELECT p.id, p.slug, p.name, p.description, p.category, p.price_cents,
             p.currency, p.image_key, p.badge, p.stock, p.is_featured, p.created_at
      FROM products p
      ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY ${orderBy}
      LIMIT ${limit}
    `;

    const [rows] = await pool.query(sql, params);
    const products = rows.map(mapProduct);

    if (products.length) {
      const ids = products.map((p) => p.id);
      const placeholders = ids.map(() => '?').join(',');
      const [sizeRows] = await pool.query(
        `SELECT id, product_id, size, stock FROM product_sizes WHERE product_id IN (${placeholders}) ORDER BY id ASC`,
        ids
      );
      const bySize = new Map();
      for (const s of sizeRows) {
        const list = bySize.get(s.product_id) || [];
        list.push({ id: s.id, size: s.size, stock: Number(s.stock) || 0 });
        bySize.set(s.product_id, list);
      }
      for (const p of products) {
        p.sizes = bySize.get(p.id) || [];
      }
    }

    res.json({ products, count: products.length });
  } catch (err) {
    next(err);
  }
}

async function listCategories(req, res, next) {
  try {
    const [rows] = await pool.query(
      `SELECT category, COUNT(*) AS count
       FROM products
       WHERE category IS NOT NULL AND category <> ''
       GROUP BY category
       ORDER BY category ASC`
    );
    res.json({
      categories: rows.map((r) => ({ category: r.category, count: Number(r.count) || 0 })),
    });
  } catch (err) {
    next(err);
  }
}

async function getProductBySlug(req, res, next) {
  try {
    const slug = sanitizeString(req.params.slug, 191);
    if (!slug) {
      const err = new Error('Product not found');
      err.status = 404;
      throw err;
    }

    const [rows] = await pool.query(
      `SELECT id, slug, name, description, category, price_cents, currency,
              image_key, badge, stock, is_featured, created_at
       FROM products
       WHERE slug = ?
       LIMIT 1`,
      [slug]
    );

    if (!rows.length) {
      const err = new Error('Product not found');
      err.status = 404;
      throw err;
    }

    const product = mapProduct(rows[0]);
    const [sizeRows] = await pool.query(
      'SELECT id, size, stock FROM product_sizes WHERE product_id = ? ORDER BY id ASC',
      [product.id]
    );
    product.sizes = sizeRows.map((s) => ({
      id: s.id,
      size: s.size,
      stock: Number(s.stock) || 0,
    }));

    res.json({ product });
  } catch (err) {
    next(err);
  }
}

module.exports = { listProducts, listCategories, getProductBySlug };