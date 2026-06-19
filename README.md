# cheapSkate 🏷️

**Browser extension + affiliate network aggregator.** Users get 50% of the affiliate commission when they shop through cheapSkate.

## How it works

1. You join affiliate networks (Amazon Associates, CJ, ShareASale, eBay, etc.)
2. cheapSkate pulls all offers into a database
3. When a user visits a merchant site, the extension detects it
4. At checkout, a popup appears: "We found a deal — click to save!"
5. User clicks → redirect through your affiliate link → cookie set
6. If they convert, you get the commission — you split 50% with the user

## Architecture

```
cheapSkate/
├── extension/          # Chrome extension (Manifest V3)
│   ├── manifest.json   # Extension config
│   ├── background.js   # Service worker: sync, redirect, storage
│   ├── content.js      # Content script: checkout detection, popup overlay
│   ├── popup.html      # Extension popup UI
│   ├── popup.js        # Popup logic
│   └── icons/
├── server/             # Backend API server
│   ├── server.js       # Express server with all routes
│   ├── db.js           # SQLite database layer
│   ├── seed.js         # Sample offer data for testing
│   └── package.json
├── shared/
│   └── constants.js    # Shared constants between extension and server
└── README.md
```

## Website (Netlify)

The marketing site lives in `site/` and is ready for Netlify:

1. Push to GitHub → Netlify auto-deploys from `site/`
2. Set custom domain: `cheapskate.gg`
3. Netlify config is in `site/netlify.toml`

Or deploy manually:
```bash
npx netlify deploy --dir=site --prod
```

## Quick Start

### 1. Start the server
```bash
cd server
npm install
npm run seed    # Populate DB with sample offers
npm start       # Starts on http://localhost:3001
```

### 2. Load the extension
- Open Chrome → Extensions → Developer mode
- Load unpacked → select `extension/` directory
- Pin the extension to the toolbar

### 3. Test it
- Visit `amazon.com` or `nike.com`
- Navigate to a product page → see a subtle badge in the corner
- Navigate to checkout → see a popup with the offer
- Click "Apply & Save" → redirected through your affiliate link

## Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| **Popup at checkout, not page load** | Ensures last-click cookie attribution. User is primed to buy. |
| **User clicks to redirect** | Legitimate click — passes affiliate ToS. Not cookie stuffing. |
| **50% revenue share** | Best-in-class. Competitors give 1-5%. Drives organic growth. |
| **SQLite (not Postgres)** | Single binary, zero-config for MVP. Easy to upgrade later. |
| **Crypto payouts first** | No KYC overhead. USDC/BTC. Add fiat later at scale. |

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/offers` | GET | Returns all active offers for extension sync |
| `/api/register` | POST | Register a new user (email → userId + token) |
| `/api/conversion` | POST | Report a conversion, update user balance |
| `/api/balance/:userId` | GET | Get user balance and conversion count |
| `/go/:network/:merchantId` | GET | Affiliate redirect endpoint |
| `/withdraw` | GET/POST | Withdrawal page (MVP) |

## Profit Model

- **Commission margin**: 50% to user, 50% to you
- **Break even**: ~3% conversion rate on $100 AOV at 5% commission
- **10k users**: ~$9,500-14,000/mo projected
- **Additional levers**: data sales, premium tiers, referral program, coupon arbitrage

## Next Steps (Production)

- [ ] Wire up real affiliate network APIs (CJ, ShareASale, Amazon)
- [ ] Add coupon auto-application at checkout
- [ ] Deploy server to production (Fly.io / Railway)
- [ ] Build Chrome Web Store listing
- [ ] Add fraud detection (return rate flags, payout holds)
- [ ] Add referral tracking
- [ ] Add multi-network offer stacking (show best offer across all networks)

## Legal Note

This extension uses a **click-based** model — the user actively clicks to apply the offer and redirects through the affiliate link. This is the same model used by Honey, Swagbucks, and TopCashback. It does NOT perform silent cookie stuffing.
