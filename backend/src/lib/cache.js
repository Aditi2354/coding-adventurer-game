const cache = new Map();

export function setCache(key, data, ttlMs = 60_000) {
  cache.set(key, { data, expires: Date.now() + ttlMs });
}
export function getCache(key) {
  const v = cache.get(key);
  if (!v) return null;
  if (Date.now() > v.expires) { cache.delete(key); return null; }
  return v.data;
}
