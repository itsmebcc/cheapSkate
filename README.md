# cheapSkate 🏷️

**Browser extension + affiliate network aggregator.** Users get **50%** of the affiliate commission when they shop through cheapSkate. Coupon codes auto-applied at checkout. Built for Chrome and Firefox.

## How It Works

1. You join affiliate networks (Amazon Associates, CJ, ShareASale, eBay, etc.)
2. cheapSkate pulls all offers + coupon codes into a database
3. When a user visits a merchant site, the extension detects it (URL + DOM signals)
4. At checkout, a popup appears: coupon code + cashback offer
5. User clicks "Apply & Save" → coupon auto-fills → redirect through your affiliate link → cookie set
6. If they convert, you get the commission — you split **50% with the user**

## Features

| Feature | Status |
|---------|--------|
| ✅ Checkout detection (URL + DOM) | Live |
| ✅ Coupon auto-application | Live — 63 codes across 32 merchants |
| ✅ Cashback popup overlay | Live |
| ✅ User registration & balance tracking | Live |
| ✅ Conversion tracking with fraud detection | Live |
| ✅ Referral system (10% commission) | Live |
| ✅ Payout holds (30-day, minimum 3 conversions) | Live |
| ✅ Extension settings (toggle, cooldown, popup) | Live |
| ✅ Admin dashboard (stats, users, conversions, withdrawals) | Live |
| ✅ Firefox port | Live |
| ✅ Keyboard shortcuts (Alt+Shift+C / Alt+Shift+S) | Live |
| ✅ Onboarding flow | Live |
| ✅ Docker deployment | Live |
| ✅ Integration tests | Live — 22 tests |
| 🟡 Affiliate API integration | Blocked on network approval |
| 🟡 Chrome Web Store listing | Ready for submission |

## Architecture

```
cheapSkate/
├── extension/                    # Browser extension
│   ├── manifest.json             # Chrome MV3 config
│   ├── manifest.firefox.json     # Firefox MV3 config
│   ├── background.js             # Service worker: sync, redirect, storage
│   ├── content.js                # Content script: detection, popup, coupon auto-fill
│   ├── popup.html                # Extension popup UI
│   ├── popup.js                  # Popup logic (dashboard + settings)
│   ├── onboarding.html           # First-run welcome page
│   ├── build.sh                  # Package builder
│   └── icons/                    # 128px / 48px / 32px PNGs
├── server/                       # Backend API
│   ├── server.js                 # Express server (~500 lines)
│   ├── db.js                     # SQLite schema (8 tables)
│   ├── seed.js                   # 32 offers + 63 coupons
│   ├── test.js                   # 22 integration tests
│   └── package.json
├── site/ → (files at repo root)  # Marketing site (Netlify)
├── screenshots/                  # 5 Chrome Web Store screenshots
├── dist/                         # Built extension zips
├── Dockerfile                    # Production container
├── docker-compose.yml            # Multi-service config
├── DNS_SETUP.md                  # cheapskate.gg DNS guide
├── store-listing.md              # Chrome Web Store listing text
├── .env.example                  # Environment variables
└── privacy.html                  # Chrome Web Store privacy policy
```

## Quick Start

### 1. Start the server (local)

```bash
cd server
npm install
npm run seed    # Populate DB with 32 offers + 63 coupons
npm start       # Starts on http://localhost:3001
```

### 2. Load the extension

- Open Chrome → Extensions → Developer mode
- **Load unpacked** → select `extension/` directory
- Pin the extension to the toolbar
- On first install, the onboarding page opens automatically

### 3. Test it

```bash
# Health check
curl http://localhost:3001/api/health

# Register a user
curl -X POST http://localhost:3001/api/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'

# Register with referral code
curl -X POST http://localhost:3001/api/register \
  -H "Content-Type: application/json" \
  -d '{"email":"friend@example.com","referralCode":"<referralCode>"}'

# Get offers
curl http://localhost:3001/api/offers

# Get coupons
curl http://localhost:3001/api/coupons

# Report a conversion
curl -X POST http://localhost:3001/api/conversion \
  -H "Content-Type: application/json" \
  -d '{"userId":"<userId>","network":"amazon","orderAmount":100,"commission":6}'

# Admin dashboard
open http://localhost:3001/admin
```

### 4. Docker (production)

```bash
docker compose up -d
# Server running on port 3001 with persistent volume
```

## API Reference

### Public Endpoints

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/health` | GET | — | Server health + offer/user counts |
| `/api/offers` | GET | — | All active affiliate offers |
| `/api/coupons` | GET | — | All active coupon codes |
| `/api/register` | POST | — | Register user (email + optional referralCode) |
| `/api/conversion` | POST | — | Report a conversion (includes fraud detection) |
| `/api/balance/:userId` | GET | — | User balance + conversion count |
| `/api/referral/:userId` | GET | — | Referral code, count, commission earned |
| `/go/:network/:merchantId` | GET | — | Affiliate redirect endpoint |
| `/withdraw` | GET/POST | — | Withdrawal page (checks fraud flags) |

### Admin Endpoints

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/admin/stats` | GET | `?token=admin` | Platform-wide statistics |
| `/api/admin/users` | GET | `?token=admin` | All users (limit 100) |
| `/api/admin/conversions` | GET | `?token=admin` | All conversions with user emails |
| `/api/admin/pending-withdrawals` | GET | `?token=admin` | Users with balance ≥ $5 |
| `/api/admin/release-hold` | POST | `?token=admin` | Release payout hold on a conversion |
| `/api/admin/approve-withdrawal` | POST | `?token=admin` | Bypass fraud checks, approve withdrawal |
| `/admin` | GET | — | Admin dashboard HTML |

### Request Bodies

**POST /api/register**
```json
{ "email": "user@example.com", "referralCode": "abc123" }
```

**POST /api/conversion**
```json
{ "userId": "uuid", "network": "amazon", "orderAmount": 100, "commission": 6, "orderId": "ORD123", "offerId": "1" }
```

**POST /api/admin/release-hold**
```json
{ "conversionId": 42 }
```

**POST /api/admin/approve-withdrawal**
```json
{ "userId": "uuid" }
```

## Database Schema

### `users`
| Column | Type | Description |
|--------|------|-------------|
| id | TEXT | UUID primary key |
| email | TEXT | User email (unique) |
| token | TEXT | Auth token |
| referral_code | TEXT | Unique referral code (8 chars hex) |
| referred_by | TEXT | Referrer's user ID |
| balance | REAL | Current cashback balance |
| conversions | INTEGER | Confirmed conversion count |

### `conversions`
| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER | Auto-increment PK |
| user_id | TEXT | FK → users |
| offer_id | TEXT | FK → offers |
| network | TEXT | Affiliate network name |
| order_id | TEXT | Merchant order ID (for fraud detection) |
| order_amount | REAL | Order total |
| commission | REAL | Gross affiliate commission |
| user_share | REAL | User's 50% share |
| status | TEXT | pending / confirmed / flagged |
| payout_hold_until | TEXT | ISO date or "requires_3_conversions" |
| fraud_flag | INTEGER | 0 = clean, 1 = flagged |

### Other tables
- `offers` — 32 affiliate offers with commission rates and cookie windows
- `coupons` — 63 coupon codes with domain targets and descriptions
- `referrals` — Referral relationships and commission earned
- `fraud_checks` — Fraud detection records with reasons
- `affiliate_networks` — Network API key storage (for production)

## Deployment

### Marketing Site (Netlify)
- Files at repo root → auto-deployed from GitHub
- Custom domain: `cheapskate.gg` (see `DNS_SETUP.md`)
- Netlify config in `netlify.toml` with API proxy redirects

### API Server (Docker)
```bash
docker compose up -d
```
- Alpine-based Node 22 image
- Persistent SQLite volume at `/app/data`
- Healthcheck, auto-restart, env config

### Chrome Web Store
- Extension packaged with `extension/build.sh`
- Screenshots in `screenshots/`
- Store listing text in `store-listing.md`
- Privacy policy at `privacy.html`

## Extension Settings
Users can configure in the popup:
- **Extension enabled** — toggle on/off
- **Show popup at checkout** — toggle on/off
- **Cooldown period** — 24h / 48h / 72h / 1 week
- **User ID** — displayed for support
- **Referral link** — copied to clipboard

## Keyboard Shortcuts
| Shortcut | Action |
|----------|--------|
| Alt+Shift+C | Apply current offer at checkout |
| Alt+Shift+S | Open settings page |

## Fraud Detection
- **Duplicate order check**: Same order ID rejected
- **Return rate**: >20% flagged conversions → blocked
- **30-day hold**: First conversion held for review
- **Minimum 3 conversions**: Withdrawal blocked until 3 confirmed
- **Admin override**: Release holds / approve withdrawals from dashboard

## Contributing
1. Fork the repo
2. Create a feature branch (`git checkout -b feat/thing`)
3. Run tests (`cd server && rm cheapskate.db && node seed.js && node server.js & node test.js`)
4. Submit a PR

## License
MIT — [itsmebcc](https://github.com/itsmebcc/cheapSkate) on GitHub
