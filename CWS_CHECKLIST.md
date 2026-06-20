# Chrome Web Store — Submission Checklist

## Pre-Submission Verification

- [ ] Extension loads without errors in Chrome
- [ ] All icons present (32px, 48px, 128px)
- [ ] Onboarding page opens on first install
- [ ] Background service worker starts correctly
- [ ] Content script injects on merchant pages
- [ ] Popup opens and shows dashboard/settings
- [ ] API server running (local or production)
- [ ] Offers sync correctly
- [ ] Coupon auto-fill works on test pages
- [ ] Keyboard shortcuts work (Alt+Shift+C / Alt+Shift+S)
- [ ] Firefox manifest is separate (`manifest.firefox.json`)

## Store Listing Assets

- [ ] Store description in `store-listing.md`
- [ ] 5 screenshots in `screenshots/`
- [ ] 1280×800 promotional image (marquee) — generate from screenshot #1
- [ ] Privacy policy URL: `https://cheapskate.gg/privacy`
- [ ] Support URL: `https://cheapskate.gg`
- [ ] Developer email: configured in Chrome Web Store account

## Required Permissions Justification
In the "Permissions justification" section of the CWS dashboard, explain:

### Storage
> "Saves user ID, preferences (enabled/disabled, cooldown), and locally cached offers. No browsing history or personal data stored beyond what's listed."

### Alarms
> "Periodically refreshes the offer database every 30 minutes. No data collected beyond fetching updated offers from our API."

### Tabs
> "Detects the current URL to check for matching offers and coupons. Used only to determine which store you're on. Never reads tab content."

### Host Permissions
> "Communicates with our API server at cheapskate.gg to fetch offers and report conversions. Also redirects through affiliate links when user chooses to apply an offer. Never modifies or intercepts communications with other websites."

## Submission Process

1. Go to https://chrome.google.com/webstore/devconsole
2. Create new item
3. Upload `dist/cheapskate-chrome.zip`
4. Fill in store listing from `store-listing.md`
5. Upload screenshots from `screenshots/`
6. Set privacy policy URL: `https://cheapskate.gg/privacy`
7. Submit for review

## Post-Submission

- [ ] Wait for review (typically 2-3 days for first submission)
- [ ] Respond to any review feedback promptly
- [ ] Once approved, publish to Chrome Web Store
- [ ] Update extension with published URL for auto-update

## Firefox Add-ons Submission

1. Go to https://addons.mozilla.org/developers
2. Submit `dist/cheapskate-firefox.zip`
3. Same description as Chrome version
