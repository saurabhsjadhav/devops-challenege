const express = require('express');
const redis = require('redis');

const app = express();
const PORT = process.env.PORT || 3000;
const REDIS_HOST = process.env.REDIS_HOST; // intentionally required, no default

let redisClient;
let redisReady = false;

async function connectRedis() {
  if (!REDIS_HOST) {
    console.error('FATAL: REDIS_HOST environment variable is not set');
    process.exit(1); // fail fast — this is our failure-injection point later
  }
  redisClient = redis.createClient({ url: `redis://${REDIS_HOST}:6379` });
  redisClient.on('error', (err) => console.error('Redis error:', err));
  await redisClient.connect();
  redisReady = true;
  console.log('Connected to Redis at', REDIS_HOST);
}

app.get('/healthz', (req, res) => res.status(200).send('ok')); // liveness
app.get('/readyz', (req, res) => {                              // readiness
  if (redisReady) return res.status(200).send('ready');
  return res.status(503).send('not ready');
});

app.get('/', async (req, res) => {
  try {
    const count = await redisClient.incr('hits');
    res.json({ message: 'DevOps challenge app', hits: count });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.listen(PORT, () => console.log(`Listening on ${PORT}`));
connectRedis();