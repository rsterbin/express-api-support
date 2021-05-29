const ContextBase = require('../base');

var path = require('path');

const contextConfig = require('./config.json');

class SystemContext extends ContextBase {

  constructor () {
    super();
    this.configSpec = contextConfig.spec;
    this.name = contextConfig.name;
    this.settingNames = [ 'environment', 'siteName', 'apiUrl', 'clientUrl', 'apiUrlPrefix', 'expressPath', 'matchApi', 'consoleLogErrors' ];
    this.setup = false;
    this.defaultExpressPath = null;
    this.defaultMatchApi = null;
  }

  doSetup() {

    // Parent won't be set in the constructor, so detect here
    if (this.parent.calledFrom.match(/\/app\.js$/)) {
      this.defaultExpressPath = path.dirname(this.parent.calledFrom);
    }

    this.setup = true;

  }

  getCustomDefault(name) {
    if (name === 'environment') {
      return process.env.NODE_ENV || 'production';
    }
    if (name === 'siteName') {
      return process.env.npm_package_name || '';
    }
    if (name === 'expressPath') {
      return this.defaultExpressPath;
    }
    if (name === 'matchApi') {
      return this.defaultMatchApi;
    }
    return undefined;
  }

  getSettings() {
    if (!this.setup) {
      this.doSetup();
    }

    // Loop through and fill settings
    const settings = {};
    for (const name of this.settingNames) {
      settings[name] = this.getConfigValue(name);
      if (name === 'apiUrlPrefix') {
        this.defaultMatchApi = '^' + settings.apiUrlPrefix + '/';
      }
    }

    return settings;
  }

  setting(key) {
    return this.getSettings()[key];
  }

  async destroy() {
    this.setup = false;
    this.defaultExpressPath = null;
    this.defaultMatchApi = null;
  }

}

module.exports = new SystemContext();
