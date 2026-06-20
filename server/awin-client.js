// cheapSkate — Awin (Affiliate Window) API Client
// Documentation: https://wiki.awin.com/awin-api
//
// API key and publisher ID should be stored in the affiliate_networks table
// or passed as env vars: AWIN_PUBLISHER_ID, AWIN_API_TOKEN

const AWIN_API_BASE = "https://api.awin.com";
const AWIN_DEEP_LINK = "https://www.awin1.com/cread.php";

/**
 * Fetch all active advertiser programs the publisher is in.
 * Returns array of { programId, advertiserName, advertiserId, commissionRate, cookieWindow, ... }
 */
export async function fetchAwinPrograms(publisherId, apiToken) {
  // Fetch all available programs. Filter by linkStatus='online' after fetching.
  const url = `${AWIN_API_BASE}/publishers/${publisherId}/programmes?accessToken=${apiToken}`;
  const res = await fetch(url, {
    headers: { "Authorization": `Bearer ${apiToken}` },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Awin programs API ${res.status}: ${text.slice(0, 200)}`);
  }

  const data = await res.json();
  // Filter to programs with linkStatus 'online' (available for promotion)
  return Array.isArray(data) ? data.filter((p) => p.linkStatus === "online") : [];
}

/**
 * Fetch details for a specific program (commission rates, cookie window, etc.)
 */
export async function fetchAwinProgramDetails(publisherId, apiToken, programId) {
  const url = `${AWIN_API_BASE}/publisher/v1/${publisherId}/programs/${programId}?relationship=join-status`;
  const res = await fetch(url, {
    headers: { "ApiToken": apiToken },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Awin program details API ${res.status}: ${text.slice(0, 200)}`);
  }

  const data = await res.json();
  return data;
}

/**
 * Fetch recent transactions (conversions) from Awin.
 * Returns commissions that need to be credited to users.
 */
export async function fetchAwinTransactions(publisherId, apiToken, startDate, endDate) {
  const params = new URLSearchParams({
    startDate: startDate || new Date(Date.now() - 86400000 * 30).toISOString().split("T")[0],
    endDate: endDate || new Date().toISOString().split("T")[0],
  });
  const url = `${AWIN_API_BASE}/publisher/v1/${publisherId}/transactions?${params}`;
  const res = await fetch(url, {
    headers: { "ApiToken": apiToken },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Awin transactions API ${res.status}: ${text.slice(0, 200)}`);
  }

  const data = await res.json();
  return data;
}

/**
 * Generate an Awin tracking link via the Link Builder API.
 * 
 * @param {string} publisherId - Awin Publisher ID
 * @param {string} apiToken - Bearer token
 * @param {object} params - { advertiserId, destinationUrl, clickref }
 * @returns {string|null} Generated tracking URL
 */
export async function generateAwinLink(publisherId, apiToken, { advertiserId, destinationUrl, clickref }) {
  const url = `${AWIN_API_BASE}/publishers/${publisherId}/linkbuilder/generate?accessToken=${apiToken}`;
  const body = {
    advertiserId,
    destinationUrl: destinationUrl || undefined,
    parameters: clickref ? { clickref } : undefined,
    shorten: true,
  };
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    console.warn(`[awin] Link builder API ${res.status}: ${await res.text()}`);
    return null;
  }

  const data = await res.json();
  // Response may contain shortUrl or longUrl
  return data.shortUrl || data.longUrl || data.url || null;
}

/**
 * Build an Awin deep-link URL for redirecting users through the affiliate network.
 * 
 * @param {object} params - { advertiserId, advertiserName, programId, publisherId, destinationUrl }
 * @returns {string} Awin deep link URL
 */
export function buildAwinDeepLink({ advertiserId, advertiserName, programId, publisherId, destinationUrl }) {
  // Awin deep link format: https://www.awin1.com/cread.php?p=<programId>&a=<publisherId>&m=<merchantId>&cl=<clickRef>&u=<destination>
  const link = new URL(AWIN_DEEP_LINK);
  link.searchParams.set("p", programId);
  link.searchParams.set("a", publisherId);
  link.searchParams.set("m", advertiserId);
  link.searchParams.set("u", destinationUrl);
  return link.toString();
}

/**
 * Map Awin program data to our internal offers format
 */
export function mapAwinProgramToOffer(program, publisherId) {
  // Awin programs have varying commission structures
  const commissionPct = program.commissionRate || 0;
  const cookieWindow = program.cookieWindow || 30;

  return {
    network: "awin",
    network_id: String(program.id || program.programId || ""),
    merchant_name: program.advertiserName || program.name || "Unknown",
    merchant_id: String(program.advertiserId || program.id || ""),
    domain: extractDomain(program.advertiserUrl || program.url || ""),
    landing_url: program.defaultAdvertUrl || program.url || "",
    discount: commissionPct ? `${commissionPct}% commission` : "",
    description: program.description || `${program.advertiserName || "Store"} via Awin`,
    commission_pct: commissionPct,
    cookie_window: cookieWindow,
    active: 1,
  };
}

/**
 * Extract the main domain from a URL for offer matching
 */
function extractDomain(url) {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, "");
  } catch {
    return url || "";
  }
}
