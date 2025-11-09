# Bang Bar

Make searches and site lookups faster using short commands called "bangs" directly from your browser. Inspired by the bangs feature of DuckDuckGo, Bang Bar allows you to jump straight to sites or search results in one keystroke.

Supports all bangs(13k+) in DuckDuckGo but fully offline, private and lightning fast.

Type a bang trigger followed by your search terms to go directly to the right site or search.

---

## Installation

### Manual Installation

1. Download the latest release from the [Releases page](https://github.com/harishphk/bang-bar/releases)
2. Extract the zip file to a folder
3. Open your browser and navigate to:
   - Chrome/Edge/Brave: `chrome://extensions/`
   - Opera: `opera://extensions/`
   - Vivaldi: `vivaldi://extensions/`
4. Enable "Developer mode" (toggle in the top right)
5. Click "Load unpacked" and select the extracted folder
6. Bang Bar is now installed and ready to use!

---

## Features

- **Offline and private**: Fully offline and private.
- **Omnibox Bangs**: Type `! + trigger + search terms` in the browser address bar and press Enter.
- **OmniSearch**: Type `!!<space>`, then enter `trigger + search term` to activate suggestions and search directly from the omnibox; the extension redirects automatically.
- **Smart Suggestions**: As you type, matching bangs appear for quick selection.
- **Fallback Search**: If the bang isn’t recognized, Bang Bar performs a normal web search with DuckDuckGo.

### Common Bang Examples

| Trigger | Action           | Example           |
| ------- | ---------------- | ----------------- |
| `!g`    | Google search    | `!g weather`      |
| `!w`    | Wikipedia search | `!w nodejs`       |
| `!gh`   | GitHub search    | `!gh copilot`     |
| `!yt`   | YouTube search   | `!yt lo-fi beats` |

---

## How to Use

<https://github.com/user-attachments/assets/412e2aeb-710d-4662-9568-ba4d8137331b>

### Activate Omnibox Bangs

1. Click on the address bar.
2. Type `!` followed by a bang trigger and your search terms.
3. Press Enter to go directly to the site or search.

**Examples:**

- `!g cats` → Google search
- `!w JavaScript` → Wikipedia search
- `!yt lo-fi beats` → YouTube search

### Activate OmniSearch

1. Click on the address bar.
2. Type `!! + <space> + your query`.
3. Bang Bar shows suggestions for matching bangs.
4. Select a suggestion or press Enter to search.

> Tip: Using `!!` + space in the omnibox is the easiest and most reliable way to activate OmniSearch.

---

## Tips

- Start with `!!<space>` in the address bar to see suggestions.
- Use arrow keys to select suggestions before pressing Enter.

---

## Supported Browsers

| Browser | Notes          |
| ------- | -------------- |
| Chrome  | ✅ Full support |
| Edge    | ✅ Full support |
| Brave   | ✅ Full support |
| Opera   | ✅ Full support |
| Vivaldi | ✅ Full support |

> Firefox is not supported yet due to differences in omnibox APIs.

---

## Need Help?

- Reinstall or update the extension if something doesn’t work.
- Open a GitHub issue with your **browser version** and a short description of the problem.
