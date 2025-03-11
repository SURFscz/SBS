const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function (app) {
    // Get target URL from environment or use default
    const backend = (process.env.SBS_SERVER || 'localhost:8080').replace(/\/$/, '');
    const logLevel = process.env.SBS_LOG_LEVEL || 'info';

    console.log("Proxy backend:", backend);
    
    app.use(
        createProxyMiddleware({
            pathFilter: ['^/ws'],
            target: `ws://${backend}`,
            changeOrigin: true,
            ws: true,
        }),
        createProxyMiddleware({
            pathFilter: ['/config', '/api', '/health'],
            target: `http://${backend}`,
            changeOrigin: true,
            logLevel: logLevel,
            logger: console,
            ws: false,
            pathRewrite: path => path,
            onProxyRes: (proxyRes, req) => {
                console.log(`[Proxy] Response ${proxyRes.statusCode} for ${req.method} ${req.url}`);
            },
            onError: (err, _req, res) => {
                console.error('[Proxy] Error:', err);
                if (res.writeHead) {
                    res.writeHead(500, {
                        'Content-Type': 'text/plain',
                    });
                    res.end(`Proxy error: ${err.message}`);
                }
            }
        })
    );

    console.log("[Proxy] Middleware setup complete");
};