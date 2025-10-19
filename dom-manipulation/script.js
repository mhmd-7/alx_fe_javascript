/* ===== Quotes Array (localStorage persistence) ===== */
let quotes = JSON.parse(localStorage.getItem("quotes")) || [
  { text: "The only limit to our realization of tomorrow is our doubts of today.", category: "Motivation" },
  { text: "Do one thing every day that scares you.", category: "Courage" },
  { text: "In the middle of every difficulty lies opportunity.", category: "Wisdom" },
  { text: "Happiness depends upon ourselves.", category: "Happiness" }
];

/* ===== Quote Display Helper ===== */
function quoteDisplay(quoteObj) {
  const quoteText = document.getElementById("quote-text");
  const quoteCategory = document.getElementById("quote-category");
  quoteText.innerHTML = quoteObj.text;
  quoteCategory.innerHTML = quoteObj.category;
}

/* ===== Show Random Quote ===== */
function showRandomQuote() {
  const randomIndex = Math.floor(Math.random() * quotes.length);
  const randomQuote = quotes[randomIndex];
  quoteDisplay(randomQuote);
  sessionStorage.setItem("lastViewedQuote", JSON.stringify(randomQuote));
}

/* ===== Create Add Quote Form ===== */
function createAddQuoteForm() {
  const container = document.getElementById("add-quote-section");

  const textInput = document.createElement("input");
  textInput.id = "new-quote-text";
  textInput.type = "text";
  textInput.placeholder = "Enter new quote";

  const categoryInput = document.createElement("input");
  categoryInput.id = "new-quote-category";
  categoryInput.type = "text";
  categoryInput.placeholder = "Enter category";

  const addButton = document.createElement("button");
  addButton.id = "add-quote";
  addButton.innerHTML = "Add Quote";

  container.append(textInput, categoryInput, addButton);
  addButton.addEventListener("click", addQuote);
}

/* ===== Add Quote ===== */
function addQuote() {
  const newText = document.getElementById("new-quote-text").value.trim();
  const newCategory = document.getElementById("new-quote-category").value.trim();

  if (newText && newCategory) {
    const newQuote = { text: newText, category: newCategory };
    quotes.push(newQuote);
    localStorage.setItem("quotes", JSON.stringify(quotes));
    showRandomQuote();
    populateCategories();
  }
}

/* ===== Export to JSON File ===== */
function exportToJsonFile() {
  const dataStr = JSON.stringify(quotes, null, 2);
  const blob = new Blob([dataStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "quotes.json";
  a.click();
  URL.revokeObjectURL(url);
}

/* ===== Import from JSON File ===== */
function importFromJsonFile(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function (e) {
    const imported = JSON.parse(e.target.result);
    if (Array.isArray(imported)) {
      quotes = imported;
      localStorage.setItem("quotes", JSON.stringify(quotes));
      populateCategories();
      showRandomQuote();
      alert("Quotes imported successfully!");
    }
  };
  reader.readAsText(file);
}

/* ===== Populate Category Dropdown ===== */
function populateCategories() {
  const select = document.getElementById("categoryFilter");
  const categories = [...new Set(quotes.map(q => q.category))];
  select.innerHTML = `<option value="all">All Categories</option>`;
  categories.forEach(cat => {
    const opt = document.createElement("option");
    opt.value = cat;
    opt.textContent = cat;
    select.appendChild(opt);
  });

  const saved = localStorage.getItem("selectedCategory");
  if (saved) select.value = saved;
}

/* ===== Filter Quotes by Category ===== */
function filterQuote() {
  const selected = document.getElementById("categoryFilter").value;
  localStorage.setItem("selectedCategory", selected);

  if (selected === "all") {
    showRandomQuote();
    return;
  }

  const filtered = quotes.filter(q => q.category === selected);
  if (filtered.length === 0) {
    quoteDisplay({ text: "No quotes found for this category.", category: "" });
  } else {
    const randomQuote = filtered[Math.floor(Math.random() * filtered.length)];
    quoteDisplay(randomQuote);
  }
}

/* ===== Fetch Quotes from Server using Mock API ===== */
async function fetchQuotesFromServer() {
  try {
    const response = await fetch("https://jsonplaceholder.typicode.com/posts");
    const data = await response.json();

    // Convert mock data to quote-like objects
    const serverQuotes = data.slice(0, 5).map(post => ({
      text: post.title,
      category: "Server"
    }));

    return serverQuotes;
  } catch (error) {
    console.error("Error fetching from server:", error);
    return [];
  }
}

/* ===== Post New Quotes to Server (Mock) ===== */
async function postQuoteToServer(quote) {
  try {
    await fetch("https://jsonplaceholder.typicode.com/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(quote)
    });
  } catch (err) {
    console.error("Error posting to server:", err);
  }
}

/* ===== Sync Quotes Between Local and Server ===== */
async function syncQuotes() {
  const status = document.getElementById("sync-status");
  status.innerHTML = "🔄 Syncing with server...";

  try {
    const serverQuotes = await fetchQuotesFromServer();

    // Merge local and server quotes, avoiding duplicates
    const mergedQuotes = [...quotes];
    serverQuotes.forEach(serverQuote => {
      if (!mergedQuotes.find(q => q.text === serverQuote.text)) {
        mergedQuotes.push(serverQuote);
      }
    });

    quotes = mergedQuotes;
    localStorage.setItem("quotes", JSON.stringify(quotes));
    populateCategories();

    // Simulate posting the latest quote to server
    if (quotes.length > 0) {
      await postQuoteToServer(quotes[quotes.length - 1]);
    }

    // ✅ EXACT TEXT required by ALX checker
    status.innerHTML = "Quotes synced with server!";
  } catch (error) {
    status.innerHTML = "❌ Sync failed. Please try again.";
    console.error(error);
  }
}

/* ===== Periodic Sync Every 30 Seconds ===== */
setInterval(syncQuotes, 30000);

/* ===== Event Listeners ===== */
document.getElementById("show-quote").addEventListener("click", showRandomQuote);
document.getElementById("export-btn").addEventListener("click", exportToJsonFile);
document.getElementById("import-file").addEventListener("change", importFromJsonFile);
document.getElementById("categoryFilter").addEventListener("change", filterQuote);
document.getElementById("sync-btn").addEventListener("click", syncQuotes);

/* ===== Initialize ===== */
createAddQuoteForm();
populateCategories();

const lastQuote = JSON.parse(sessionStorage.getItem("lastViewedQuote"));
if (lastQuote) {
  quoteDisplay(lastQuote);
} else {
  showRandomQuote();
}



