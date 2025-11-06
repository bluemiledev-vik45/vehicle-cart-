const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  console.log('🔧 Setting up proxy middleware...');
  console.log('🔧 Proxy will handle: /reet_python/* → https://smartdatalink.com.au/reet_python/*');
  
  // Proxy for smartdatalink.com.au APIs
  app.use(
    '/reet_python',
    createProxyMiddleware({
      target: 'https://smartdatalink.com.au',
      changeOrigin: true,
      secure: true,
      logLevel: 'debug',
      onProxyReq: (proxyReq, req, res) => {
        const targetUrl = 'https://smartdatalink.com.au' + req.url;
        console.log('🔗 [PROXY] Request:', req.method, req.url);
        console.log('🔗 [PROXY] Target:', targetUrl);
        console.log('🔗 [PROXY] Headers:', JSON.stringify(req.headers, null, 2));
      },
      onProxyRes: (proxyRes, req, res) => {
        console.log('✅ [PROXY] Response:', proxyRes.statusCode, req.url);
        console.log('✅ [PROXY] Content-Type:', proxyRes.headers['content-type']);
        // Ensure CORS headers are set
        proxyRes.headers['Access-Control-Allow-Origin'] = '*';
      },
      onError: (err, req, res) => {
        console.error('❌ [PROXY] Error:', err.message);
        console.error('❌ [PROXY] Request URL:', req.url);
        console.error('❌ [PROXY] Error stack:', err.stack);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Proxy error', message: err.message });
        }
      },
    })
  );

  // Proxy for no-reply.com.au APIs (existing)
  app.use(
    '/smart_data_link',
    createProxyMiddleware({
      target: 'https://no-reply.com.au',
      changeOrigin: true,
      secure: true,
      logLevel: 'debug',
      onProxyReq: (proxyReq, req, res) => {
        console.log('🔗 Proxying request:', req.method, req.url, '→', 'https://no-reply.com.au' + req.url);
      },
      onProxyRes: (proxyRes, req, res) => {
        console.log('✅ Proxy response:', proxyRes.statusCode, req.url);
        proxyRes.headers['Access-Control-Allow-Origin'] = '*';
      },
      onError: (err, req, res) => {
        console.error('❌ Proxy error:', err.message);
        res.status(500).json({ error: 'Proxy error', message: err.message });
      },
    })
  );
  
  console.log('✅ Proxy middleware configured');
};

