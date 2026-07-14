function handler(event) {
  var response = event.response;
  var headers = response.headers;

  headers['strict-transport-security'] = {
    value: 'max-age=31536000; includeSubDomains; preload',
  };

  headers['content-security-policy'] = {
    value: [
      "default-src 'none'",
      "script-src 'self'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https://*.basemaps.cartocdn.com",
      "font-src 'self'",
      "connect-src 'self' https://api.postcodes.io https://basemaps.cartocdn.com https://*.basemaps.cartocdn.com",
      "worker-src blob:",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; '),
  };

  headers['x-content-type-options'] = { value: 'nosniff' };
  headers['x-frame-options'] = { value: 'DENY' };
  headers['referrer-policy'] = { value: 'strict-origin-when-cross-origin' };
  headers['permissions-policy'] = {
    value: 'geolocation=(), microphone=(), camera=()',
  };

  delete headers['x-powered-by'];
  delete headers['server'];

  return response;
}
