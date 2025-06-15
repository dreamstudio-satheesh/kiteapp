
  const interval = 1000;
  const apiUrl = "http://138.199.213.241:8000/quote";

  function fetchQuotes() {
    fetch(apiUrl)
      .then(res => res.json())
      .then(data => {
        const box = document.getElementById("quotes");
        box.innerHTML = "";
        for (const [symbol, info] of Object.entries(data)) {
          const row = document.createElement("div");
          row.className = "quote";
          row.textContent = `${symbol}: ₹${info.last_price}`;
          box.appendChild(row);
        }
      })
      .catch(err => console.error("Fetch error:", err));
  }

  setInterval(fetchQuotes, interval);
  fetchQuotes();
