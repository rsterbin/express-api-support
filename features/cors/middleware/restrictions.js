const express = require('express');

const requireCorsHeaders = (context) => {

    const allowAll = context.config.get('feature.cors.allowAll', false);
    const env = context.system.setting('environment');
    const apiUrlPrefix = context.system.setting('apiUrlPrefix');

    let d = [];
    const apiUrl = context.system.setting('apiUrl');
    if (apiUrl) {
        d.push(apiUrl);
    }
    const clientUrl = context.system.setting('clientUrl');
    if (clientUrl) {
        d.push(clientUrl);
    }

    const prodOrigins = context.config.get('feature.cors.prodOrigins',
        (env === 'development') ? [] : d);
    const devOrigins = context.config.get('feature.cors.devOrigins',
        (env === 'development') ? d : []);
    const restrictUrls = context.config.get('feature.cors.restrictUrls', []);
    restrictUrls.push('^' + apiUrlPrefix + '/');

    const middleware = (req, res, next) => {

        let doRestrict = false;
        for (url of restrictUrls) {
            if (req.originalUrl.match(restrictUrls)) {
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
                res.json({ code: 'CORS_AUTH_FAILED', msg: 'Access is restricted', origin: origin });
            }
        }
    };

    return middleware;
}

module.exports = requireCorsHeaders;
