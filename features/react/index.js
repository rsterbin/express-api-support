var createError = require('http-errors');

const FeatureBase = require('../base');
const handler = require('./handlers/error');

const featureConfig = require('./config.json');

class FeatureReact extends FeatureBase {

  constructor () {
    super();
    this.configSpec = featureConfig.spec;
    this.name = featureConfig.name;
  }

  handlers(app) {
    // catch 404 and forward to error handler
    app.use(function(req, res, next) {
      next(createError(404));
    });
    app.use(handler(this.parent.context));
  }

}

module.exports = new FeatureReact();
