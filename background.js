// Load bangs on install or update
chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install' || details.reason === 'update') {
    await loadBangsData();
  }
});

async function loadBangsData() {
  try {
    // First check if we have stored bangs
    const stored = await chrome.storage.local.get(['bangsVersion', 'bangs']);
    
    const response = await fetch(chrome.runtime.getURL("bangs.json"));
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const bangsData = await response.json();

    // Convert array to object for O(1) lookups
    let bangsMap = stored.bangs || {};
    
    // If versions don't match, update the stored bangs
    if (!stored.bangsVersion || stored.bangsVersion !== bangsData.version) {
      console.log(`Updating bangs: stored version ${stored.bangsVersion || 'none'}, new version ${bangsData.version}`);
      
      // Create new bangs map
      bangsMap = {};
      bangsData.bangs.forEach((bang) => {
        bangsMap[bang.t] = {
          trigger: bang.t,
          domain: bang.d,
          url: bang.u,
          description: bang.s || bang.d || bang.description || '',
        };
      });

      await chrome.storage.local.set({
        bangs: bangsMap,
        bangsVersion: bangsData.version
      });
      console.log(`Updated to version ${bangsData.version} with ${Object.keys(bangsMap).length} bangs`);
    } else {
      console.log('Bangs are up to date');
      bangsMap = stored.bangs; // Use the stored bangs when version matches
    }
    return bangsMap;
  } catch (error) {
    console.error("Failed to load bangs:", error);
    // Try to load from cache if fetch fails
    return {};
  }
}

// Intercept Google (and others) searches
chrome.webNavigation.onBeforeNavigate.addListener(async (details) => {
  try {
    const url = new URL(details.url);

    // Catch Google searches like https://www.google.com/search?q=!g+cats
    if (url.searchParams.has("q")) {
      const query = url.searchParams.get("q");
      if (query.startsWith("!")) {
        const redirectUrl = await processBangQuery(query);
        if (redirectUrl) {
          // details.tabId can be undefined for some navigation events (frames, non-tab navigations).
          // Guard and fall back to creating a new tab if a tabId isn't available.
          if (typeof details.tabId !== 'undefined') {
            try {
              chrome.tabs.update(details.tabId, { url: redirectUrl });
            } catch (updateErr) {
              // If update fails for any reason, open a new tab as a fallback
              chrome.tabs.create({ url: redirectUrl });
            }
          } else {
            chrome.tabs.create({ url: redirectUrl });
          }
        }
      }
    }
  } catch (err) {
    console.error("Intercept error:", err);
  }
});

// Handle omnibox input
chrome.omnibox.onInputChanged.addListener(async (text, suggest) => {
  if (!text.trim()) return;

  // Escape characters that can break the omnibox XML parser (ampersands, <, >, etc.)
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  const result = await chrome.storage.local.get("bangs");
  const bangs = result.bangs || {};
  
  const parts = text.split(" ");
  const bangTrigger = parts[0];
  const searchTerms = parts.slice(1).join(" ");

  const suggestions = [];
  // Show matching bangs (up to 5)
  for (const [trigger, bang] of Object.entries(bangs)) {
    if (trigger.startsWith(bangTrigger) && suggestions.length < 5) {
      const rawDesc = `${bang.trigger} - ${bang.domain}: ${bang.description || ''}`;
      suggestions.push({
        content: `${trigger} ${searchTerms}`,
        // provide an escaped description so omnibox's XML parser doesn't choke on '&' in URLs
        description: escapeHtml(rawDesc)
      });
    }
  }
  suggest(suggestions);
});

// Handle omnibox selection
chrome.omnibox.onInputEntered.addListener(async (text) => {
  const redirectUrl = await processBangQuery(text);
  if (redirectUrl) {
    chrome.tabs.update({ url: redirectUrl });
  }
});

async function processBangQuery(query) {
  const parts = query.split(" ");
  const bangTrigger = parts[0].substring(1);
  const searchTerms = parts.slice(1).join(" ");

  const result = await chrome.storage.local.get("bangs");
  const bangs = result.bangs || {};
  const bang = bangs[bangTrigger];
  
  if (bang && bang.url) {
    return bang.url.replace(/\{\{\{s\}\}\}/g, encodeURIComponent(searchTerms));
  }
  
  // If bang not found, just redirect to duckduckgo's bang search
  return `https://duckduckgo.com/?q=${encodeURIComponent(query)}`;
}
