var createError = require('http-errors');

const FeatureBase = require('../base');
const handler = require('./handlers/error');

const featureConfig = require('./config.json');

class FeatureReact extends FeatureBase {

  constructor () {
    super();
    this.configSpec = featureConfig.spec;
    this.name = featureConfig.name;
    // TODO: move consoleLogErrors from this feature to system level
  }

  handlers(app) {
    // catch 404 and forward to error handler
    app.use(function(req, res, next) {
      next(createError(404, '[404] ' + req.originalUrl + ' not found'));
    });
    app.use(handler(this));
  }

  getCustomDefault(name) {

    // doc index
    if (name === 'docIndex') {
      const expressPath = this.getSystemValue('expressPath');
      return expressPath + '/public/index.html';
    }

    // json URLs
    if (name === 'jsonUrls') {
      const apiUrlPrefix = this.getSystemValue('apiUrlPrefix');
      return [ '^' + apiUrlPrefix + '/' ];
    }

    return undefined;
  }

}

module.exports = new FeatureReact();
