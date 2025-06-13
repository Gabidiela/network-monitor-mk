const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const MikroTik = require('./mikrotik');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);
const mikrotik = new MikroTik();

app.use(express.static('frontend'));

io.on('connection', (socket) => {
    console.log('Cliente conectado');

    socket.emit('mikrotikIp', mikrotik.host);

    let currentInterface = 'ether1';
    let paused = false;

    socket.on('setInterface', (interfaceName) => {
        currentInterface = interfaceName;
        console.log(`Interface alterada para: ${currentInterface}`);
    });

    socket.on('pausarLeitura', () => {
        paused = true;
        console.log('Leitura pausada');
    });

    socket.on('retomarLeitura', () => {
        paused = false;
        console.log('Leitura retomada');
    });

    const interval = setInterval(async () => {
        if (paused) return;

        try {
            const data = await mikrotik.getBandwidth(currentInterface);
            socket.emit('bandwidth', data);
        } catch (err) {
            console.error('Erro ao buscar dados do MikroTik:', err.message);

            
            mikrotik.connected = false;
            try {
                await mikrotik.connect();
                console.log('Reconectado ao MikroTik');
            } catch (connectErr) {
                console.error('Falha ao reconectar ao MikroTik:', connectErr.message);
            }
        }
    }, 1000);

    socket.on('disconnect', () => {
        clearInterval(interval);
        console.log('Cliente desconectado');
    });
});

const PORT = 3001;
server.listen(PORT, () => {
    console.log(`Servidor iniciado na porta ${PORT}`);
});
