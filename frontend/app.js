const interval = 2000; // 2 seconds
const symbols = ['SBIN', 'INFY', 'RELIANCE']; // sample

function fetchQuotes() {
  fetch('http://localhost:8000/quote')
    .then(response => response.json())
    .then(data => {
      const quotesDiv = document.getElementById('quotes');
      quotesDiv.innerHTML = '';

      for (const [symbol, ltp] of Object.entries(data)) {
        const row = document.createElement('div');
        row.innerText = `${symbol}: ₹${ltp}`;
        quotesDiv.appendChild(row);
      }
    });
}

setInterval(fetchQuotes, interval);
fetchQuotes();
