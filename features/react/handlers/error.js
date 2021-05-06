
const splitReactFromApi = (feature) => {

  const env = feature.getSystemValue('environment');
  const jsonUrls = feature.getConfigValue('jsonUrls');
  const viewUrls = feature.getConfigValue('viewUrls');
  const msg404 = feature.getConfigValue('message404');
  const logErrors = feature.getConfigValue('consoleLogErrors');
  const reactPath = feature.getConfigValue('docIndex');

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

