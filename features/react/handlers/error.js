
const splitReactFromApi = (context) => {

  const env = context.system.setting('environment');
  const apiUrlPrefix = context.system.setting('apiUrlPrefix');

  const jsonUrls = context.config.get('feature.react.jsonUrls', [ '^' + apiUrlPrefix + '/' ]);
  const viewUrls = context.config.get('feature.react.viewUrls', []);
  const msg404 = context.config.get('feature.react.message404', 'Endpoint not found');
  const logErrors = context.config.get('feature.react.consoleLogErrors', true);
  const expressPath = context.system.setting('expressPath');
  const reactPath = context.config.get('feature.react.docIndex', expressPath + '/public/index.html');

  // If we can't get reactPath, issue a warning -- it's not critical, but
  // this won't work as expected because we don't have a hardcoded doc index
  // and we can't find express
  if (!reactPath) {
    console.log('WARNING: the path to React cannot be detected');
  }

  // error handler
  const middleware = (err, req, res, next) => {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = env === 'development' ? err : {};

    // If this is a backend-managed route, we either send JSON or a view
    let handleWith = 'react';
    for (const vurl of viewUrls) {
      if (req.originalUrl.match(vurl)) {
        handleWith = 'view';
      }
    }
    for (const jurl of jsonUrls) {
      if (req.originalUrl.match(jurl)) {
        handleWith = 'json';
      }
    }

    if (handleWith === 'view') {
      res.status(err.status || 500);
      res.render('error');

    } else if (handleWith === 'json') {
      res.status(err.status || 500);
      if (logErrors) {
        console.log(err);
      }
      let msg = err.status === 404 ? msg404 : err.message;
      res.json({ code: 'UNEXPECTED', msg: msg, original: req.originalUrl });

    } else {
      res.sendFile(reactPath);
    }
  };

  return middleware;
};

module.exports = splitReactFromApi;

