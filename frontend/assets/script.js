(() => {
  const socket = io();
  const ifaceSelect = document.getElementById('ifaceSelect');
  const ifaceLabel = document.getElementById('ifaceLabel');
  const statusEl = document.getElementById('status');
  const lastTimeEl = document.getElementById('lastTime');
  const elapsedEl = document.getElementById('elapsed');
  const pauseBtn = document.getElementById('pauseBtn');
  let paused = false;

  // Start time for elapsed counter
  const startTime = Date.now();
  setInterval(() => {
    const diff = Date.now() - startTime;
    const hrs = String(Math.floor(diff / 3600000)).padStart(2,'0');
    const mins = String(Math.floor((diff % 3600000) / 60000)).padStart(2,'0');
    const secs = String(Math.floor((diff % 60000) / 1000)).padStart(2,'0');
    elapsedEl.textContent = `${hrs}:${mins}:${secs}`;
  }, 1000);

  // Chart setup
  const ctx = document.getElementById('bwChart').getContext('2d');
  const data = { labels: [], datasets: [
    { label: 'Rx (Mbps)', data: [], borderColor: '#1E90FF', fill: false, tension: 0 },
    { label: 'Tx (Mbps)', data: [], borderColor: '#32CD32', fill: false, tension: 0 }
  ]};

  const chart = new Chart(ctx, {
    type: 'line',
    data,
    options: {
      animation: { duration: 0 },
      scales: {
        x: {
          type: 'time', time: { unit: 'second', displayFormats: { second: 'HH:mm:ss' } },
          grid: { display: false }
        },
        y: { beginAtZero: true, grid: { display: false } }
      },
      plugins: { tooltip: { enabled: true, mode: 'nearest', intersect: false }, legend: { position: 'top' } },
      layout: { padding: { top: 10, bottom: 10 } }
    }
  });

  // Interface change
  ifaceSelect.addEventListener('change', () => {
    ifaceLabel.textContent = ifaceSelect.value;
    socket.emit('changeInterface', ifaceSelect.value);
  });

  // Pause/resume
  pauseBtn.addEventListener('click', () => {
    paused = !paused;
    pauseBtn.textContent = paused ? 'Retomar' : 'Pausar';
  });

  socket.on('connect', () => { statusEl.textContent = 'Conectado'; });
  socket.on('disconnect', () => { statusEl.textContent = 'Desconectado'; });

  socket.on('bandwidth', ({ download, upload }) => {
    console.log('>> bandwidth:', payload);
    if (paused) return;
    const now = Date.now();
    lastTimeEl.textContent = new Date(now).toLocaleTimeString();
    data.labels.push(now);
    data.datasets[0].data.push(download);
    data.datasets[1].data.push(upload);
    if (data.labels.length > 30) {
      data.labels.shift(); data.datasets.forEach(ds => ds.data.shift());
    }
    chart.update('none');
  });
})();