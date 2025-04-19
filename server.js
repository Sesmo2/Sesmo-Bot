const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

let latestCode = '';

io.on('connection', (socket) => {
    socket.emit('code', latestCode);
});

function updateCode(code) {
    latestCode = code;
    io.emit('code', code);
}

app.get('/', (req, res) => {
    res.send(`
        <html>
        <head><title>Sesmo-Bot Code Viewer</title></head>
        <body>
            <h2>QR / Pairing Code</h2>
            <pre id="code">Waiting for code...</pre>
            <script src="/socket.io/socket.io.js"></script>
            <script>
                const socket = io();
                socket.on('code', (code) => {
                    document.getElementById('code').innerText = code;
                });
            </script>
        </body>
        </html>
    `);
});

server.listen(3000, () => console.log('Web Code Interface: http://localhost:3000'));

module.exports = updateCode;