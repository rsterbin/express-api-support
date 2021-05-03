
class FeatureBase {

  constructor() {
    this.requiredContext = [];
    this.configSpec = {};
    this.name = null;
  }

  middleware(app) {} // eslint-disable-line no-unused-vars

  getRouters(app) { // eslint-disable-line no-unused-vars
    return null;
  }

  handlers(app) {} // eslint-disable-line no-unused-vars

}

module.exports = FeatureBase;
