const http = require('http');
const { Server } = require('socket.io');
const { createApp } = require('./app');
const { createMemoryRepo } = require('./repositories/memory');
const { createPostgresRepo } = require('./repositories/postgres');

const PORT = process.env.PORT || 5000;

async function main() {
  const repo = process.env.DATABASE_URL
    ? createPostgresRepo(process.env.DATABASE_URL)
    : createMemoryRepo();
  if (repo.kind === 'postgres') {
    await repo.pool.query('SELECT 1'); // fail-fast si la base est indisponible
    console.log(JSON.stringify({ level: 'info', msg: 'PostGIS connecté' }));
  } else {
    console.log(JSON.stringify({ level: 'warn', msg: 'DATABASE_URL absent → repo mémoire (mode démo)' }));
  }

  const server = http.createServer();
  const io = new Server(server, { cors: { origin: process.env.CORS_ORIGIN || '*' } });

  // rooms géographiques : chaque client rejoint la room de sa zone geohash
  io.on('connection', socket => {
    socket.on('zone:join', zone => {
      [...socket.rooms].filter(r => r.startsWith('zone:')).forEach(r => socket.leave(r));
      socket.join(`zone:${zone}`);
    });
  });
  const broadcast = (zone, event, payload) => io.to(`zone:${zone}`).emit(event, payload);

  const app = createApp({ repo, broadcast });
  server.on('request', app);
  server.listen(PORT, () => console.log(JSON.stringify({ level: 'info', msg: `wheretopark-api sur :${PORT}` })));
}

main().catch(err => { console.error(err); process.exit(1); });
