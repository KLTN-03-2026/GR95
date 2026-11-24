const buckets = new Map();

setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets) if (bucket.expiresAt <= now) buckets.delete(key);
}, 60 * 1000).unref();

const rateLimit = (name, max, windowMs) => (req, res, next) => {
  const identity = req.user?.id || req.ip || req.socket.remoteAddress || 'unknown';
  const key = `${name}:${identity}`;
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.expiresAt <= now) {
    buckets.set(key, { count: 1, expiresAt: now + windowMs });
    return next();
  }
  if (bucket.count >= max) {
    res.set('Retry-After', String(Math.ceil((bucket.expiresAt - now) / 1000)));
    return res.status(429).json({ message: 'Thao tác quá nhiều lần. Vui lòng thử lại sau.' });
  }
  bucket.count += 1;
  next();
};

module.exports = rateLimit;
