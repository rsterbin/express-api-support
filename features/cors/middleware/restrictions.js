
const requireCorsHeaders = (feature) => {

  const env = feature.getSystemValue('environment');
  const allowAll = feature.getConfigValue('allowAll');
  const prodOrigins = feature.getConfigValue('prodOrigins');
  const devOrigins = feature.getConfigValue('devOrigins');
  const restrictUrls = feature.getConfigValue('restrictUrls');

  const middleware = (req, res, next) => {

    let doRestrict = false;
    for (const url of restrictUrls) {
      if (req.originalUrl.match(url)) {
        doRestrict = true;
      }
    }
    if (!doRestrict) {
      return next();
    }

    let origin = req.get('origin');
    let ok = true;
    if (!allowAll) {
      if (env === 'development') {
        if (devOrigins.length < 1) {
          // can't restrict without origins to use
          return next();
        }
        if (!devOrigins.includes(origin)) {
          ok = false;
        }
      } else {
        if (prodOrigins.length < 1) {
          // can't restrict without origins to use
          return next();
        }
        if (!prodOrigins.includes(origin)) {
          ok = false;
        }
      }
    }

    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With');

    // intercept OPTIONS method
    if ('OPTIONS' == req.method) {
      res.sendStatus(200);
    }
    else {
      if (ok) {
        next();
      } else {
        res.status(403);
        res.json({ code: 'CORS_AUTH_FAILED', msg: 'Access is restricted', origin: origin,
          devOrigins: devOrigins, prodOrigins: prodOrigins, environment: env
        });
      }
    }
  };

  return middleware;
};

module.exports = requireCorsHeaders;
