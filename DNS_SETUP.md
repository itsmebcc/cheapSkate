# cheapSkate — DNS & Domain Setup

## Custom Domain: cheapskate.gg

### Step 1: Add domain to Netlify

1. Go to Netlify dashboard → cheapSkate site → **Site settings** → **Domain management**
2. Click **Add custom domain** → enter `cheapskate.gg`
3. Netlify will show you the DNS configuration needed

### Step 2: DNS records (at your domain registrar)

Create these DNS records at your domain registrar (Namecheap, Cloudflare, etc.):

| Type | Name  | Value                                          |
|------|-------|------------------------------------------------|
| CNAME | `www` | `cheapskate.netlify.app`                        |
| A     | `@`   | `75.2.60.5` (Netlify's load balancer IP)       |
| CNAME | `api` | `cheapskate.netlify.app`                       |

Or use Netlify's **Netlify DNS** (recommended): transfer DNS to Netlify and they auto-configure everything.

### Step 3: Verify ownership

Netlify will check DNS propagation. Once verified:
- `https://cheapskate.gg` → marketing site
- `https://www.cheapskate.gg` → redirects to apex
- `https://cheapskate.gg/api/health` → API health endpoint
- `https://cheapskate.gg/go/*` → affiliate redirects

### Step 4: Update extension config

In `extension/background.js`, change:
```js
const API_BASE = "https://cheapskate.gg";
```

In `extension/popup.js`, change:
```js
const API_BASE = "https://cheapskate.gg";
```

### Step 5: Enable HTTPS

Netlify auto-provisions SSL certificates. Make sure **HTTPS enforced** is enabled in Netlify settings.

### Step 6: Update Chrome Web Store listing

Set support URL and privacy policy URL to `https://cheapskate.gg/*`
