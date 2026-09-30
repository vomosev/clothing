-- MONOLITH — Streetwear store schema (MySQL 8, utf8mb4)
-- Run with:  mysql -u <user> -p <database> < schema.sql

SET NAMES utf8mb4;
SET time_zone = '+00:00';
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS order_items;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS product_sizes;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS payments;
DROP TABLE IF EXISTS subscriptions;
DROP TABLE IF EXISTS payment_plans;
DROP TABLE IF EXISTS payment_events;

SET FOREIGN_KEY_CHECKS = 1;

-- ---------------------------------------------------------------------------
-- users
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  email         VARCHAR(190) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name     VARCHAR(120) NOT NULL,
  created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- products
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS products (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  slug        VARCHAR(160) NOT NULL,
  name        VARCHAR(160) NOT NULL,
  description TEXT         NOT NULL,
  category    VARCHAR(40)  NOT NULL DEFAULT 'tees',
  price_cents INT UNSIGNED NOT NULL DEFAULT 0,
  currency    CHAR(3)      NOT NULL DEFAULT 'USD',
  image_key   VARCHAR(80)  NOT NULL,
  badge       VARCHAR(40)  DEFAULT NULL,
  stock       INT          NOT NULL DEFAULT 0,
  is_featured TINYINT(1)   NOT NULL DEFAULT 0,
  created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_products_slug (slug),
  KEY idx_products_category (category),
  KEY idx_products_featured (is_featured),
  KEY idx_products_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- product_sizes
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS product_sizes (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  product_id INT UNSIGNED NOT NULL,
  size       VARCHAR(16)  NOT NULL,
  stock      INT          NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  UNIQUE KEY uq_product_size (product_id, size),
  KEY idx_product_sizes_product (product_id),
  CONSTRAINT fk_product_sizes_product
    FOREIGN KEY (product_id) REFERENCES products (id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- orders
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS orders (
  id             INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id        INT UNSIGNED DEFAULT NULL,
  reference      VARCHAR(64)  NOT NULL,
  status         VARCHAR(24)  NOT NULL DEFAULT 'pending',
  subtotal_cents INT UNSIGNED NOT NULL DEFAULT 0,
  total_cents    INT UNSIGNED NOT NULL DEFAULT 0,
  currency       CHAR(3)      NOT NULL DEFAULT 'USD',
  created_at     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_orders_reference (reference),
  KEY idx_orders_user (user_id),
  KEY idx_orders_status (status),
  CONSTRAINT fk_orders_user
    FOREIGN KEY (user_id) REFERENCES users (id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- order_items
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS order_items (
  id               INT UNSIGNED NOT NULL AUTO_INCREMENT,
  order_id         INT UNSIGNED NOT NULL,
  product_id       INT UNSIGNED DEFAULT NULL,
  size             VARCHAR(16)  NOT NULL DEFAULT 'OS',
  quantity         INT UNSIGNED NOT NULL DEFAULT 1,
  unit_price_cents INT UNSIGNED NOT NULL DEFAULT 0,
  name_snapshot    VARCHAR(160) NOT NULL,
  PRIMARY KEY (id),
  KEY idx_order_items_order (order_id),
  KEY idx_order_items_product (product_id),
  CONSTRAINT fk_order_items_order
    FOREIGN KEY (order_id) REFERENCES orders (id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_order_items_product
    FOREIGN KEY (product_id) REFERENCES products (id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- payments (required by payments module)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS payments (
  reference        VARCHAR(64)  NOT NULL PRIMARY KEY,
  kind             VARCHAR(16)  NOT NULL,
  provider         VARCHAR(32)  NOT NULL,
  provider_ref     VARCHAR(191) NULL,
  user_id          VARCHAR(191) NOT NULL,
  email            VARCHAR(191) NOT NULL,
  item_id          VARCHAR(191) NULL,
  description      VARCHAR(255) NULL,
  amount           BIGINT       NOT NULL,
  currency         CHAR(3)      NOT NULL,
  status           VARCHAR(16)  NOT NULL DEFAULT 'pending',
  failure_reason   VARCHAR(255) NULL,
  created_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_payments_provider_ref (provider, provider_ref),
  INDEX idx_payments_user (user_id),
  INDEX idx_payments_status (status, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- subscriptions (required by payments module)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS subscriptions (
  id                        BIGINT       NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id                   VARCHAR(191) NOT NULL,
  email                     VARCHAR(191) NOT NULL,
  provider                  VARCHAR(32)  NOT NULL,
  plan_id                   VARCHAR(191) NOT NULL,
  initial_reference         VARCHAR(64)  NOT NULL,
  provider_plan_id          VARCHAR(191) NULL,
  provider_subscription_id  VARCHAR(191) NULL,
  provider_customer_id      VARCHAR(191) NULL,
  status                    VARCHAR(16)  NOT NULL DEFAULT 'pending',
  current_period_end        DATETIME     NULL,
  cancel_at_period_end      TINYINT(1)   NOT NULL DEFAULT 0,
  provider_data             TEXT         NULL,
  last_synced_at            DATETIME     NULL,
  created_at                DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at                DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_subscriptions_user (user_id),
  INDEX idx_subscriptions_provider_id (provider, provider_subscription_id),
  INDEX idx_subscriptions_email (provider, email),
  INDEX idx_subscriptions_initial (initial_reference)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- payment_plans (required by payments module)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS payment_plans (
  provider          VARCHAR(32)  NOT NULL,
  plan_key          VARCHAR(191) NOT NULL,
  provider_plan_id  VARCHAR(191) NOT NULL,
  created_at        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (provider, plan_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- payment_events (required by payments module)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS payment_events (
  provider     VARCHAR(32)  NOT NULL,
  event_id     VARCHAR(191) NOT NULL,
  received_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (provider, event_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- Seed data — 14 streetwear products
-- ---------------------------------------------------------------------------
INSERT INTO products (slug, name, description, category, price_cents, currency, image_key, badge, stock, is_featured) VALUES
('obsidian-boxy-tee', 'Obsidian Boxy Tee', 'Heavyweight 240gsm cotton in deep obsidian black with a boxy drop-shoulder cut and a tonal platinum chest mark. Pre-shrunk and garment dyed so the colour holds after every wash.', 'tees', 6500, 'USD', 'obsidian-boxy-tee', 'Core', 120, 1),
('platinum-arc-hoodie', 'Platinum Arc Hoodie', 'Brushed-back 420gsm fleece hoodie with a puff-printed platinum arc across the back, twin-needle seams and a heavy metal-tipped drawcord.', 'hoodies', 14800, 'USD', 'platinum-arc-hoodie', 'Best seller', 64, 1),
('nightshift-cargo-pant', 'Nightshift Cargo Pant', 'Relaxed ripstop cargo with articulated knees, six utility pockets and adjustable ankle cinches. Built for long nights and longer walks.', 'bottoms', 12900, 'USD', 'nightshift-cargo-pant', NULL, 48, 1),
('chrome-static-tee', 'Chrome Static Tee', 'Washed black jersey tee with a distressed chrome static graphic screen-printed in four passes for real depth.', 'tees', 7200, 'USD', 'chrome-static-tee', 'New', 90, 1),
('monolith-heavyweight-crew', 'Monolith Heavyweight Crew', 'Structured 400gsm crewneck with ribbed side panels and an embroidered platinum wordmark at the left chest.', 'hoodies', 13500, 'USD', 'monolith-heavyweight-crew', NULL, 55, 0),
('graphite-shell-jacket', 'Graphite Shell Jacket', 'Water-resistant graphite shell with taped seams, a storm hood and reflective platinum piping along the sleeves.', 'outerwear', 22500, 'USD', 'graphite-shell-jacket', 'Limited', 22, 1),
('void-puffer-vest', 'Void Puffer Vest', 'Matte black recycled-nylon puffer vest with high-loft insulation, a stand collar and hidden zip pockets.', 'outerwear', 18900, 'USD', 'void-puffer-vest', NULL, 30, 0),
('slate-wide-leg-denim', 'Slate Wide Leg Denim', 'Rigid 14oz denim in a smoke-slate wash, cut wide through the leg with a stacked hem and platinum hardware.', 'bottoms', 15600, 'USD', 'slate-wide-leg-denim', NULL, 40, 0),
('silverline-track-pant', 'Silverline Track Pant', 'Tapered tricot track pant with a platinum side stripe, zip ankles and a deep elasticated waistband.', 'bottoms', 9800, 'USD', 'silverline-track-pant', NULL, 70, 0),
('eclipse-longsleeve', 'Eclipse Longsleeve', 'Midweight longsleeve in pure black with a wrap-around eclipse print and ribbed cuffs that hold their shape.', 'tees', 8400, 'USD', 'eclipse-longsleeve', NULL, 85, 0),
('ingot-cap', 'Ingot Cap', 'Unstructured six-panel cap in washed black canvas with a raised platinum ingot embroidery and a metal slider strap.', 'accessories', 4500, 'USD', 'ingot-cap', NULL, 150, 0),
('foundry-beanie', 'Foundry Beanie', 'Chunky rib-knit beanie in carbon black with a woven platinum tab. Double-layer cuff for real warmth.', 'accessories', 3800, 'USD', 'foundry-beanie', 'New', 140, 0),
('alloy-crossbody-bag', 'Alloy Crossbody Bag', 'Compact cordura crossbody with a magnetic buckle, webbing strap and a platinum-coated zip pull.', 'accessories', 7900, 'USD', 'alloy-crossbody-bag', NULL, 60, 0),
('after-hours-coach-jacket', 'After Hours Coach Jacket', 'Classic coach jacket in matte black poly with snap closure, flannel lining and a platinum back script.', 'outerwear', 16400, 'USD', 'after-hours-coach-jacket', 'Sold out', 0, 0);

INSERT INTO product_sizes (product_id, size, stock)
SELECT p.id, s.size, s.stock FROM products p JOIN (
  SELECT 'obsidian-boxy-tee' AS slug, 'S' AS size, 20 AS stock UNION ALL
  SELECT 'obsidian-boxy-tee', 'M', 35 UNION ALL
  SELECT 'obsidian-boxy-tee', 'L', 40 UNION ALL
  SELECT 'obsidian-boxy-tee', 'XL', 25 UNION ALL

  SELECT 'platinum-arc-hoodie', 'S', 10 UNION ALL
  SELECT 'platinum-arc-hoodie', 'M', 18 UNION ALL
  SELECT 'platinum-arc-hoodie', 'L', 22 UNION ALL
  SELECT 'platinum-arc-hoodie', 'XL', 14 UNION ALL

  SELECT 'nightshift-cargo-pant', '30', 10 UNION ALL
  SELECT 'nightshift-cargo-pant', '32', 14 UNION ALL
  SELECT 'nightshift-cargo-pant', '34', 14 UNION ALL
  SELECT 'nightshift-cargo-pant', '36', 10 UNION ALL

  SELECT 'chrome-static-tee', 'S', 18 UNION ALL
  SELECT 'chrome-static-tee', 'M', 26 UNION ALL
  SELECT 'chrome-static-tee', 'L', 28 UNION ALL
  SELECT 'chrome-static-tee', 'XL', 18 UNION ALL

  SELECT 'monolith-heavyweight-crew', 'S', 9 UNION ALL
  SELECT 'monolith-heavyweight-crew', 'M', 16 UNION ALL
  SELECT 'monolith-heavyweight-crew', 'L', 18 UNION ALL
  SELECT 'monolith-heavyweight-crew', 'XL', 12 UNION ALL

  SELECT 'graphite-shell-jacket', 'S', 4 UNION ALL
  SELECT 'graphite-shell-jacket', 'M', 6 UNION ALL
  SELECT 'graphite-shell-jacket', 'L', 8 UNION ALL
  SELECT 'graphite-shell-jacket', 'XL', 4 UNION ALL

  SELECT 'void-puffer-vest', 'S', 6 UNION ALL
  SELECT 'void-puffer-vest', 'M', 8 UNION ALL
  SELECT 'void-puffer-vest', 'L', 10 UNION ALL
  SELECT 'void-puffer-vest', 'XL', 6 UNION ALL

  SELECT 'slate-wide-leg-denim', '30', 8 UNION ALL
  SELECT 'slate-wide-leg-denim', '32', 12 UNION ALL
  SELECT 'slate-wide-leg-denim', '34', 12 UNION ALL
  SELECT 'slate-wide-leg-denim', '36', 8 UNION ALL

  SELECT 'silverline-track-pant', 'S', 14 UNION ALL
  SELECT 'silverline-track-pant', 'M', 20 UNION ALL
  SELECT 'silverline-track-pant', 'L', 22 UNION ALL
  SELECT 'silverline-track-pant', 'XL', 14 UNION ALL

  SELECT 'eclipse-longsleeve', 'S', 16 UNION ALL
  SELECT 'eclipse-longsleeve', 'M', 24 UNION ALL
  SELECT 'eclipse-longsleeve', 'L', 27 UNION ALL
  SELECT 'eclipse-longsleeve', 'XL', 18 UNION ALL

  SELECT 'ingot-cap', 'OS', 150 UNION ALL
  SELECT 'foundry-beanie', 'OS', 140 UNION ALL
  SELECT 'alloy-crossbody-bag', 'OS', 60 UNION ALL

  SELECT 'after-hours-coach-jacket', 'S', 0 UNION ALL
  SELECT 'after-hours-coach-jacket', 'M', 0 UNION ALL
  SELECT 'after-hours-coach-jacket', 'L', 0 UNION ALL
  SELECT 'after-hours-coach-jacket', 'XL', 0
) AS s ON s.slug = p.slug;
