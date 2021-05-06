const FeatureBase = require('../base');

const restrictions = require('./middleware/restrictions');

const featureConfig = require('./config.json');

class FeatureCors extends FeatureBase {

  constructor () {
    super();
    this.configSpec = featureConfig.spec;
    this.name = featureConfig.name;
  }

  getCustomDefault(name) {

    // prod and dev origins
    if (name === 'prodOrigins' || name === 'devOrigins') {
      const env = this.getSystemValue('environment');
      let d = [];
      const apiUrl = this.getSystemValue('apiUrl');
      if (apiUrl) {
        d.push(apiUrl);
      }
      const clientUrl = this.getSystemValue('clientUrl');
      if (clientUrl) {
        d.push(clientUrl);
      }
      if (name === 'prodOrigins') {
        return (env === 'development') ? [] : d;
      } else {
        return (env === 'development') ? d : [];
      }
    }

    // restrict URLs
    if (name === 'restrictUrls') {
      const apiUrlPrefix = this.getSystemValue('apiUrlPrefix');
      return [ '^' + apiUrlPrefix + '/' ];
    }

    return undefined;
  }

  middleware(app) {
    app.use(restrictions(this));
  }

}

module.exports = new FeatureCors();
