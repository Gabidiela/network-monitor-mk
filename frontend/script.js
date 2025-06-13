const socket = io();
const ctx = document.getElementById('chart').getContext('2d');
const interfaceSelect = document.getElementById('interface-select');
const pauseBtn = document.getElementById('pause-btn');

let currentInterface = interfaceSelect.value;
let paused = false;

const chart = new Chart(ctx, {
    type: 'line',
    data: {
        labels: [],
        datasets: [
            { label: 'Rx (Mbps)', data: [], borderColor: '#ee0290', fill: false },
            { label: 'Tx (Mbps)', data: [], borderColor: '#ee6002', fill: false },
        ],
    },
    options: {
        responsive: false,
        maintainAspectRatio: false,
        scales: {
            x: { title: { display: true, text: 'Tempo' } },
            y: { title: { display: true, text: 'Mbps' }, beginAtZero: true },
        },
    },
});

socket.on('connect', () => {
    socket.emit('setInterface', currentInterface);
    document.getElementById('interface-atual').textContent = currentInterface;
});

interfaceSelect.addEventListener('change', () => {
    currentInterface = interfaceSelect.value;
    socket.emit('setInterface', currentInterface);


    document.getElementById('interface-atual').textContent = currentInterface;


    chart.data.labels = [];
    chart.data.datasets[0].data = [];
    chart.data.datasets[1].data = [];
    chart.update();
});

pauseBtn.addEventListener('click', () => {
    paused = !paused;
    pauseBtn.textContent = paused ? 'Retomar' : 'Pausar';
    socket.emit(paused ? 'pausarLeitura' : 'retomarLeitura');
});

socket.on('bandwidth', (data) => {
    if (paused) return;

    if (chart.data.labels.length > 30) {
        chart.data.labels.shift();
        chart.data.datasets[0].data.shift();
        chart.data.datasets[1].data.shift();
    }

    chart.data.labels.push(data.timestamp);
    chart.data.datasets[0].data.push(data.rx);
    chart.data.datasets[1].data.push(data.tx);
    chart.update();

    document.getElementById('last-read').textContent = data.timestamp;
});

socket.on('mikrotikIp', (ip) => {
    document.getElementById('mikrotik-ip').textContent = ip;
});

const statusSpan = document.querySelector('.status-span'); // Referência ao span do status

socket.on('connect', () => {
    statusSpan.textContent = 'Conectado';
    statusSpan.classList.remove('text-red-600');
    statusSpan.classList.add('text-green-600');
});

socket.on('disconnect', () => {
    statusSpan.textContent = 'Desconectado';
    statusSpan.classList.remove('text-green-600');
    statusSpan.classList.add('text-red-600');
});
