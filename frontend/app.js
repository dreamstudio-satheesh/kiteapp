const interval = 2000; // 2 seconds

function fetchQuotes() {
  fetch('http://138.199.213.241:8000/quote')  // ⬅ updated
    .then(response => response.json())
    .then(data => {
      const quotesDiv = document.getElementById('quotes');
      quotesDiv.innerHTML = '';

      for (const [symbol, tick] of Object.entries(data)) {
        const row = document.createElement('div');
        row.innerText = `${symbol}: ₹${tick.ltp}`;
        quotesDiv.appendChild(row);
      }
    })
    .catch(err => {
      console.error("Fetch failed:", err);
    });
}

setInterval(fetchQuotes, interval);
fetchQuotes();
