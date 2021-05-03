const FeatureBase = require('../base');

const restrictions = require('./middleware/restrictions');

const featureConfig = require('./config.json');

class FeatureCors extends FeatureBase {

  constructor () {
    super();
    this.configSpec = featureConfig.spec;
    this.name = featureConfig.name;
  }

  middleware(app) {
    app.use(restrictions(this.parent.context));
  }

}

module.exports = new FeatureCors();
