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
    { label: 'Rx (Mbps)', data: [], borderColor: '#E91E63	', fill: false, tension: 0 },
    { label: 'Tx (Mbps)', data: [], borderColor: '#8E24AA', fill: false, tension: 0 }
  ]};

  const maxPoints = 3 * 60;

  const chart = new Chart(ctx, {
    type: 'line',
    data,
    options: {
      animation: { duration: 0 },
      scales: {
        x: {
          type: 'time',
          time: {
            // define que o “unit” é minuto
            unit: 'minute',
            // espaçamento de 1 unidade (1 minuto)
            stepSize: 2,
            // formato de exibição do label
            displayFormats: {
              minute: 'HH:mm'
            }
          },
          ticks: {
            // faz o Chart gerar ticks automaticamente seguindo seu unit/stepSize
            source: 'auto',
            autoSkip: true,
            maxTicksLimit: 50
          },
          grid: { display: true }
        },
        y: {
          beginAtZero: true,
          grid: { display: true }
        }
      },
      plugins: {
        tooltip: { enabled: true, mode: 'nearest', intersect: false },
        legend: { position: 'top' }
      },
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

  socket.on('bandwidth', ({ download, upload, delta_in, delta_out, interval, unit }) => {
    console.log(`bytes in: ${delta_in}, bytes out: ${delta_out}, dt: ${interval}s`);
    if (paused) return;
    const now = Date.now();
    lastTimeEl.textContent = new Date(now).toLocaleTimeString();
    data.labels.push(now);
    data.datasets[0].data.push(download);
    data.datasets[1].data.push(upload);
    if (data.labels.length > maxPoints) {
      data.labels.shift(); data.datasets.forEach(ds => ds.data.shift());
    }
    chart.update('none');
  });
})();