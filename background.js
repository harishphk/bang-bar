// background.js (MV3 service worker)

// -----------------------------
// Global variable to hold bangs
// -----------------------------
let bangsMap = {};

// -----------------------------
// Load bangs.json on install or update
// -----------------------------
chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === "install" || details.reason === "update") {
    await loadBangsData();
  }
});

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

    if (query && query.startsWith("!")) {
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

  const { bangs } = await chrome.storage.local.get("bangs");
  const searchTerms = text.split(" ").slice(1).join(" ");
  const bangTrigger = text.split(" ")[0];

  const suggestions = Object.entries(bangs || {})
    .filter(([trigger]) => trigger.startsWith(bangTrigger))
    .slice(0, 5)
    .map(([trigger, bang]) => ({
      content: `${trigger} ${searchTerms}`,
      description: `${bang.description || bang.domain}: ${bang.trigger} - ${
        bang.domain
      }`.replace(new RegExp(`(${bangTrigger})`, "gi"), "<match>$1</match>"),
    }));

  suggest(suggestions);
});

// -----------------------------
// Omnibox: Execute when user selects input
// - Processes bang query
// - Redirects current tab or opens new tab
// -----------------------------
chrome.omnibox.onInputEntered.addListener(async (text) => {
  const redirectUrl = await processBangQuery(text, true);
  if (redirectUrl) {
    await safeRedirect(undefined, redirectUrl);
  }
});

// -----------------------------
// Process a bang query
// - Looks up bang in stored bangs
// - Returns redirect URL
// - isOmniSearch: whether input came from omnibox
// -----------------------------
async function processBangQuery(query, isOmniSearch = false) {
  const parts = query.split(" ");
  const bangTrigger = isOmniSearch
    ? parts[0] // Omnibox: "!yt"
    : parts[0].substring(1); // Search bar: strip "!" from "!yt"

  if (!bangTrigger) return null;

  const searchTerms = parts.slice(1).join(" ");
  const { bangs } = await chrome.storage.local.get("bangs");
  const bang = (bangs || {})[bangTrigger];

  if (bang && bang.url) {
    // Replace placeholder with search terms
    return bang.url.replace(/\{\{\{s\}\}\}/g, encodeURIComponent(searchTerms));
  }

  // Fallback to DuckDuckGo if bang not found
  console.warn(`Bang "${bangTrigger}" not found, redirecting to DuckDuckGo`);
  return `https://duckduckgo.com/?q=${encodeURIComponent(query)}`;
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
