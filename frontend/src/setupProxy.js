const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function (app) {
  const proxy = createProxyMiddleware({
    target: 'http://localhost:8000',
    changeOrigin: true,
  });

  // Only proxy API calls and static reference photos — nothing else
  app.use('/api', proxy);
  app.use('/reference_photos', proxy);
};
