/* script.js - Dynamic Quote Generator
   Features:
   - Quotes array with localStorage persistence
   - showRandomQuote(), createAddQuoteForm (via DOM), addQuote()
   - populateCategories(), filterQuotes(), loadLastFilter()
   - export/import JSON
   - fetchQuotesFromServer(), postQuoteToServer(), syncQuotes()
   - conflict detection & notifications
*/

// ----- Initial data & storage helpers -----
let quotes = JSON.parse(localStorage.getItem('quotes')) || [
  { text: "The best way to get started is to quit talking and begin doing.", category: "Motivation" },
  { text: "Don't let yesterday take up too much of today.", category: "Inspiration" },
  { text: "Success is not final; failure is not fatal.", category: "Wisdom" }
];

const QUOTES_KEY = 'quotes';
const SELECTED_CAT_KEY = 'selectedCategory';
const LAST_QUOTE_KEY = 'lastShownQuote';

// Save quotes to localStorage
function saveQuotes() {
  localStorage.setItem(QUOTES_KEY, JSON.stringify(quotes));
}

// ----- DOM elements -----
const quoteDisplay = document.getElementById('quoteDisplay');
const newQuoteBtn = document.getElementById('newQuote');
const categoryFilter = document.getElementById('categoryFilter');
const exportBtn = document.getElementById('exportBtn');
const importFile = document.getElementById('importFile');
const addQuoteForm = document.getElementById('addQuoteForm');
const newQuoteText = document.getElementById('newQuoteText');
const newQuoteCategory = document.getElementById('newQuoteCategory');
const notification = document.getElementById('notification');

// Utility: show transient notification
function showNotification(message, ms = 2500) {
  if (!notification) return;
  notification.textContent = message;
  notification.style.opacity = 1;
  setTimeout(() => (notification.style.opacity = 0), ms);
}

// ----- Quote display & interactions -----

// Display a random quote (based on current filter)
function showRandomQuote() {
  try {
    const filter = localStorage.getItem(SELECTED_CAT_KEY) || 'all';
    const filtered = filter === 'all'
      ? quotes
      : quotes.filter(q => q.category === filter);

    if (filtered.length === 0) {
      quoteDisplay.textContent = "No quotes available for this category.";
      sessionStorage.setItem(LAST_QUOTE_KEY, JSON.stringify(null));
      return;
    }

    const random = filtered[Math.floor(Math.random() * filtered.length)];
    quoteDisplay.innerHTML = `<blockquote>"${escapeHtml(random.text)}"</blockquote>
                              <p><strong>Category:</strong> ${escapeHtml(random.category)}</p>`;
    // store last shown quote in sessionStorage (example usage of session storage)
    sessionStorage.setItem(LAST_QUOTE_KEY, JSON.stringify(random));
  } catch (err) {
    console.error('showRandomQuote failed:', err);
  }
}

// small helper to avoid HTML injection in displayed text
function escapeHtml(str) {
  if (typeof str !== 'string') return str;
  return str.replace(/[&<>"']/g, function(m) {
    return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]);
  });
}

// ----- Add quote -----
function addQuote(newQ) {
  try {
    // accepts either (text, category) via inputs or an object
    let quoteObj;
    if (typeof newQ === 'object' && newQ !== null) {
      quoteObj = newQ;
    } else {
      const text = newQuoteText.value.trim();
      const category = newQuoteCategory.value.trim();
      if (!text || !category) {
        alert('Please enter both quote text and category.');
        return;
      }
      quoteObj = { text, category };
    }

    // Add and persist
    quotes.push(quoteObj);
    saveQuotes();

    // Update UI
    populateCategories();
    showNotification('✅ Quote added locally!');
    // attempt to post to server (non-blocking)
    postQuoteToServer(quoteObj);

    // clear form inputs if used
    if (newQuoteText) newQuoteText.value = '';
    if (newQuoteCategory) newQuoteCategory.value = '';
  } catch (err) {
    console.error('addQuote failed:', err);
  }
}

// wire add form submit
if (addQuoteForm) {
  addQuoteForm.addEventListener('submit', function (e) {
    e.preventDefault();
    addQuote();
  });
}

// ----- Categories & Filtering -----
// Extract unique categories and populate dropdown menu
function populateCategories() {
  try {
    const select = categoryFilter;
    if (!select) {
      console.warn("categoryFilter element not found.");
      return;
    }
    const unique = ['all', ...new Set(quotes.map(q => q.category))];
    // Clear and repopulate
    select.innerHTML = '';
    unique.forEach(c => {
      const option = document.createElement('option');
      option.value = c;
      option.textContent = c;
      select.appendChild(option);
    });

    // restore selected category if valid
    const last = localStorage.getItem(SELECTED_CAT_KEY);
    if (last && unique.includes(last)) {
      select.value = last;
    }
  } catch (err) {
    console.error('populateCategories failed:', err);
  }
}

// Called when category changes
function filterQuotes() {
  try {
    if (!categoryFilter) return;
    const selected = categoryFilter.value;
    localStorage.setItem(SELECTED_CAT_KEY, selected);
    showRandomQuote();
  } catch (err) {
    console.error('filterQuotes failed:', err);
  }
}

// restore last selected filter on load
function loadLastFilter() {
  try {
    const last = localStorage.getItem(SELECTED_CAT_KEY);
    if (last && categoryFilter) {
      // ensure categories are populated first
      populateCategories();
      if ([...categoryFilter.options].some(o => o.value === last)) {
        categoryFilter.value = last;
      }
    } else {
      // ensure default is 'all'
      if (categoryFilter) categoryFilter.value = 'all';
    }
    filterQuotes();
  } catch (err) {
    console.error('loadLastFilter failed:', err);
  }
}

// wire category change event
if (categoryFilter) {
  categoryFilter.addEventListener('change', filterQuotes);
}

// ----- Import / Export JSON -----
function exportToJsonFile() {
  try {
    const blob = new Blob([JSON.stringify(quotes, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'quotes.json';
    document.body.appendChild(link);
    link.click();
    link.remove();
    showNotification('📤 Quotes exported');
  } catch (err) {
    console.error('exportToJsonFile failed:', err);
  }
}

if (exportBtn) exportBtn.addEventListener('click', exportToJsonFile);

function importFromJsonFile(event) {
  try {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
      try {
        const imported = JSON.parse(e.target.result);
        if (!Array.isArray(imported)) throw new Error('Imported JSON must be an array');
        // basic validation: ensure objects have text and category
        const filteredImported = imported.filter(i => i && i.text && i.category);
        if (filteredImported.length === 0) throw new Error('No valid quotes in file');
        quotes.push(...filteredImported);
        saveQuotes();
        populateCategories();
        showNotification('📥 Quotes imported successfully!');
      } catch (errInner) {
        alert('Failed to import: ' + errInner.message);
        console.error('importFromJsonFile parse error:', errInner);
      }
    };
    reader.readAsText(file);
    // reset file input so same file can be re-imported later if needed
    event.target.value = '';
  } catch (err) {
    console.error('importFromJsonFile failed:', err);
  }
}

if (importFile) importFile.addEventListener('change', importFromJsonFile);

// ----- Mock Server Sync & Conflict Resolution -----
// Fetch quotes from server (mocked via jsonplaceholder)
async function fetchQuotesFromServer() {
  try {
    const res = await fetch('https://jsonplaceholder.typicode.com/posts?_limit=5');
    if (!res.ok) throw new Error('Network response not ok');
    const data = await res.json();
    return data.map(post => ({ text: post.title, category: 'Server' }));
  } catch (err) {
    console.error('fetchQuotesFromServer failed:', err);
    return [];
  }
}

// Post a quote to server (mock)
async function postQuoteToServer(quote) {
  try {
    // Keep non-blocking: just attempt and log
    const res = await fetch('https://jsonplaceholder.typicode.com/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(quote)
    });
    if (!res.ok) throw new Error('Post failed');
    const result = await res.json();
    console.log('posted to server (mock):', result);
  } catch (err) {
    console.warn('postQuoteToServer failed (mock):', err);
  }
}

// Merge strategy: server data takes precedence. Provide conflict report.
function mergeServerLocal(serverQuotes, localQuotes) {
  // build by text identity
  const merged = [];
  const seen = new Set();

  // server first (precedence)
  serverQuotes.forEach(sq => {
    merged.push(sq);
    seen.add(sq.text);
  });

  // add local quotes that server doesn't have
  localQuotes.forEach(lq => {
    if (!seen.has(lq.text)) {
      merged.push(lq);
    }
  });

  // return merged and list of conflicts (texts present both places)
  const conflicts = localQuotes.filter(lq => serverQuotes.some(sq => sq.text === lq.text));
  return { merged, conflicts };
}

async function syncQuotes() {
  showNotification('🔄 Syncing with server...');
  try {
    const serverData = await fetchQuotesFromServer();
    const local = JSON.parse(localStorage.getItem(QUOTES_KEY)) || [];
    const { merged, conflicts } = mergeServerLocal(serverData, local);

    // if conflicts found, notify; server takes precedence by design
    if (conflicts.length > 0) {
      showNotification(`⚠️ Conflicts resolved: ${conflicts.length}. Server data prioritized.`);
      console.info('Conflicts resolved (server precedence):', conflicts);
    } else {
      showNotification('✅ Synced with server (no conflicts).');
    }

    quotes = merged;
    saveQuotes();
    populateCategories();
  } catch (err) {
    console.error('syncQuotes failed:', err);
    showNotification('⚠️ Sync failed (see console).');
  }
}

// Periodic sync: run once at start and every N ms
const SYNC_INTERVAL_MS = 15000; // 15s
async function startSyncing() {
  await syncQuotes();
  setInterval(syncQuotes, SYNC_INTERVAL_MS);
}

// ----- Page initialization -----
document.addEventListener('DOMContentLoaded', () => {
  populateCategories();
  loadLastFilter();
  showRandomQuote();

  if (newQuoteBtn) newQuoteBtn.addEventListener('click', showRandomQuote);

  // start background sync
  startSyncing().catch(err => console.error('startSyncing error', err));
});

// ----- Export functions for Node tests if present -----
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    populateCategories,
    filterQuotes,
    loadLastFilter,
    addQuote,
    saveQuotes,
    fetchQuotesFromServer,
    postQuoteToServer,
    syncQuotes,
    showRandomQuote
  };
}

