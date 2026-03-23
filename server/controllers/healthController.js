export function createHealthController({ cache }) {
  function health(_req, res) {
    res.json({ ok: true, redis: cache.isRedisEnabled() });
  }

  return { health };
}
