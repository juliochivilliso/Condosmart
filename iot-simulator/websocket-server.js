const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Estado en memoria de los dispositivos (simulado)
const consumoMap = { bomba_agua: 5.5, luminaria: 0.2, termostato: 1.5 };

const devicesState = {
  'bomba-planta-1':     { id: 'bomba-planta-1',     tipo: 'bomba_agua',  estado_actual: false, consumo: 0 },
  'luz-parqueo-a':      { id: 'luz-parqueo-a',      tipo: 'luminaria',   estado_actual: false, consumo: 0 },
  'cerradura-salon':    { id: 'cerradura-salon',    tipo: 'cerradura',   estado_actual: true,  consumo: 0 },
  'bomba-planta-2':     { id: 'bomba-planta-2',     tipo: 'bomba_agua',  estado_actual: false, consumo: 0 },
  'luminaria-lobby':    { id: 'luminaria-lobby',    tipo: 'luminaria',   estado_actual: true,  consumo: 0.2 },
  'cerradura-bloque-b': { id: 'cerradura-bloque-b', tipo: 'cerradura',   estado_actual: false, consumo: 0 },
  'termostato-lobby':   { id: 'termostato-lobby',   tipo: 'termostato',  estado_actual: true,  consumo: 1.5 },
  'termostato-piscina': { id: 'termostato-piscina', tipo: 'termostato',  estado_actual: false, consumo: 0 },
};

io.on('connection', (socket) => {
  console.log('Cliente conectado:', socket.id);

  // Enviar estado inicial
  socket.emit('initial_state', devicesState);

  // Escuchar comandos del Dashboard
  socket.on('toggle_device', (data) => {
    const { id, estado_actual } = data;

    if (devicesState[id]) {
      devicesState[id].estado_actual = estado_actual;
      console.log(`Dispositivo ${id} cambiado a ${estado_actual}`);

      if (estado_actual && devicesState[id].tipo !== 'cerradura') {
        devicesState[id].consumo = consumoMap[devicesState[id].tipo] ?? 0;
      } else {
        devicesState[id].consumo = 0;
      }

      // Notificar a todos los clientes con el formato que espera el frontend
      io.emit('device_updated', { id, estado_actual });
    }
  });

  socket.on('disconnect', () => {
    console.log('Cliente desconectado:', socket.id);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`IoT Simulator corriendo en el puerto ${PORT}`);
});
