let quotes = JSON.parse(localStorage.getItem('quotes')) || [
  { text: "The best way to get started is to quit talking and begin doing.", category: "Motivation" },
  { text: "Don't let yesterday take up too much of today.", category: "Inspiration" },
  { text: "Success is not final; failure is not fatal.", category: "Wisdom" },
];

document.addEventListener('DOMContentLoaded', () => {
  populateCategories();
  showRandomQuote();
  document.getElementById('newQuote').addEventListener('click', showRandomQuote);
  loadLastFilter();
  syncWithServer();
  setInterval(syncWithServer, 15000); // periodic sync
});

function showRandomQuote() {
  const filter = localStorage.getItem('selectedCategory') || 'all';
  const filteredQuotes = filter === 'all' ? quotes : quotes.filter(q => q.category === filter);
  const quoteDisplay = document.getElementById('quoteDisplay');

  if (filteredQuotes.length === 0) {
    quoteDisplay.textContent = "No quotes available for this category.";
    return;
  }

  const randomQuote = filteredQuotes[Math.floor(Math.random() * filteredQuotes.length)];
  quoteDisplay.innerHTML = `
    <blockquote>"${randomQuote.text}"</blockquote>
    <p><strong>Category:</strong> ${randomQuote.category}</p>`;
}

function addQuote() {
  const text = document.getElementById('newQuoteText').value.trim();
  const category = document.getElementById('newQuoteCategory').value.trim();
  if (!text || !category) {
    alert('Please enter both quote text and category.');
    return;
  }

  quotes.push({ text, category });
  saveQuotes();
  populateCategories();
  showNotification("✅ Quote added successfully!");
  document.getElementById('newQuoteText').value = '';
  document.getElementById('newQuoteCategory').value = '';
}

function saveQuotes() {
  localStorage.setItem('quotes', JSON.stringify(quotes));
}

function populateCategories() {
  const select = document.getElementById('categoryFilter');
  const categories = ['all', ...new Set(quotes.map(q => q.category))];
  select.innerHTML = categories.map(c => `<option value="${c}">${c}</option>`).join('');
}

function filterQuotes() {
  const selectedCategory = document.getElementById('categoryFilter').value;
  localStorage.setItem('selectedCategory', selectedCategory);
  showRandomQuote();
}

function loadLastFilter() {
  const last = localStorage.getItem('selectedCategory');
  if (last) document.getElementById('categoryFilter').value = last;
  filterQuotes();
}

function showNotification(message) {
  const note = document.getElementById('notification');
  note.textContent = message;
  note.style.opacity = 1;
  setTimeout(() => (note.style.opacity = 0), 2500);
}

// ---------- JSON Import/Export ----------
function exportToJsonFile() {
  const blob = new Blob([JSON.stringify(quotes, null, 2)], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'quotes.json';
  link.click();
}
document.getElementById('exportBtn').addEventListener('click', exportToJsonFile);

function importFromJsonFile(event) {
  const fileReader = new FileReader();
  fileReader.onload = function(e) {
    const importedQuotes = JSON.parse(e.target.result);
    quotes.push(...importedQuotes);
    saveQuotes();
    populateCategories();
    showNotification('📥 Quotes imported successfully!');
  };
  fileReader.readAsText(event.target.files[0]);
}

// ---------- Server Sync Simulation ----------
async function syncWithServer() {
  try {
    const response = await fetch('https://jsonplaceholder.typicode.com/posts?_limit=5');
    const serverData = await response.json();

    const serverQuotes = serverData.map(post => ({
      text: post.title,
      category: 'Server'
    }));

    // Conflict resolution: server data takes precedence
    quotes = [...serverQuotes, ...quotes];
    saveQuotes();
    populateCategories();
    showNotification('🔄 Synced with server (Server data prioritized)');
  } catch (error) {
    console.error("Server sync failed:", error);
  }
}
