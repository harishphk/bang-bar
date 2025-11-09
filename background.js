// background.js (MV3 service worker)

// -----------------------------
// Global variable to hold bangs
// -----------------------------
let bangsMap = {};

// -----------------------------
// Pre-load bangs immediately when service worker starts
// Critical for MV3: Service workers restart frequently
// This handles all cases: install, update, and SW wake-up
// -----------------------------
(async () => {
  await loadBangsData();
})();

// -----------------------------
// Load bangs data into memory and storage
// - Checks stored version vs current JSON version
// - Updates storage if version changed
// -----------------------------
async function loadBangsData() {
  try {
    const stored = await chrome.storage.local.get(["bangsVersion", "bangs"]);
    const response = await fetch(chrome.runtime.getURL("bangs.json"));
    const bangsData = await response.json();

    if (!stored.bangsVersion || stored.bangsVersion !== bangsData.version) {
      // Reset bangsMap
      bangsMap = {};
      bangsData.bangs.forEach((b) => {
        bangsMap[b.t] = {
          trigger: b.t,
          domain: b.d,
          url: b.u,
          description: b.s || b.d || b.description || "",
        };
      });

      // Store in chrome storage
      await chrome.storage.local.set({
        bangs: bangsMap,
        bangsVersion: bangsData.version,
      });
    } else {
      // Load stored bangs
      bangsMap = stored.bangs || {};
    }
  } catch (err) {
    console.error("Error loading bangs:", err);
    bangsMap = {};
  }
}

// -----------------------------
// Generic Query Extractor
// - Handles most search engines
// - Tries common query params, then path-based search
// -----------------------------
function extractQuery(url) {
  // Common search parameter names
  const params = ["q", "query", "p", "search", "wd"];
  for (const key of params) {
    if (url.searchParams.has(key)) {
      return url.searchParams.get(key);
    }
  }

  // Handle path-based search (e.g., /search/<term>)
  const parts = url.pathname.split("/").filter(Boolean);
  const idx = parts.indexOf("search");
  if (idx >= 0 && parts[idx + 1]) {
    return decodeURIComponent(parts[idx + 1]);
  }

  return null;
}

// -----------------------------
// Navigation Interceptor (fallback)
// - Detects bangs typed in search engines directly
// - Redirects to proper URL if bang exists
// -----------------------------
chrome.webNavigation.onBeforeNavigate.addListener(async (details) => {
  try {
    const url = new URL(details.url);
    const query = extractQuery(url);

    if (query && query.trim().startsWith("!")) {
      const redirectUrl = await processBangQuery(query);
      if (redirectUrl) {
        await safeRedirect(details.tabId, redirectUrl);
      }
    }
  } catch (err) {
    console.error("Intercept error:", err);
  }
});

// -----------------------------
// Omnibox: Suggestions while typing
// - Shows matching bangs
// - Updates as user types
// -----------------------------
chrome.omnibox.onInputChanged.addListener(async (text, suggest) => {
  if (!text.trim()) return;

  // Normalize input
  const normalizedText = text.trim().replace(/\s+/g, " ");
  const parts = normalizedText.split(" ");
  const bangTrigger = parts[0];
  const searchTerms = parts.slice(1).join(" ");

  // Use in-memory cache for instant suggestions
  const suggestions = Object.entries(bangsMap)
    .filter(([trigger]) => trigger.startsWith(bangTrigger))
    .slice(0, 8) // Increased from 5 to 8 for better UX
    .map(([trigger, bang]) => ({
      content: `${trigger} ${searchTerms}`,
      description: `<match>!${trigger}</match> ${bang.description || bang.domain} <dim>(${bang.domain})</dim>`
    }));

  suggest(suggestions);
});

// -----------------------------
// Omnibox: Execute when user selects input
// - Processes bang query
// - Redirects current tab or opens new tab
// -----------------------------
chrome.omnibox.onInputEntered.addListener(async (text) => {
  const normalizedText = text.trim();
  if (!normalizedText) return;
  
  const redirectUrl = await processBangQuery(normalizedText, true);
  if (redirectUrl) {
    await safeRedirect(undefined, redirectUrl);
  }
});

// -----------------------------
// Process a bang query
// - Looks up bang in memory cache (faster than storage)
// - Returns redirect URL
// - isOmniSearch: whether input came from omnibox
// -----------------------------
async function processBangQuery(query, isOmniSearch = false) {
  // Trim and normalize whitespace
  const normalizedQuery = query.trim().replace(/\s+/g, " ");
  const parts = normalizedQuery.split(" ");
  const bangTrigger = isOmniSearch
    ? parts[0] // Omnibox: "!yt"
    : parts[0].substring(1); // Search bar: strip "!" from "!yt"

  if (!bangTrigger) return null;

  const searchTerms = parts.slice(1).join(" ");
  
  // Use in-memory cache instead of storage for better performance
  const bang = bangsMap[bangTrigger];

  if (bang && bang.url) {
    // Replace placeholder with search terms
    return bang.url.replace(/\{\{\{s\}\}\}/g, encodeURIComponent(searchTerms));
  }

  // Fallback to DuckDuckGo if bang not found
  console.warn(`Bang "${bangTrigger}" not found, redirecting to DuckDuckGo`);
  return `https://duckduckgo.com/?q=${encodeURIComponent(normalizedQuery)}`;
}

// -----------------------------
// Safe redirect helper
// - Updates current tab if available
// - Otherwise opens a new tab
// -----------------------------
async function safeRedirect(tabId, redirectUrl) {
  try {
    if (typeof tabId !== "undefined") {
      await chrome.tabs.update(tabId, { url: redirectUrl });
    } else {
      await chrome.tabs.create({ url: redirectUrl });
    }
  } catch (err) {
    console.error("Tab redirect failed, opening new tab:", err);
    chrome.tabs.create({ url: redirectUrl });
  }
}
