const ContextBase = require('../base');

var path = require('path');

const contextConfig = require('./config.json');

class SystemContext extends ContextBase {

  constructor () {
    super();
    this.configSpec = contextConfig.spec;
    this.name = contextConfig.name;
    this.defaults = {
      environment: process.env.NODE_ENV || 'production',
      siteName: process.env.npm_package_name || '',
      apiUrl: 'http://localhost:3000',
      clientUrl: 'http://localhost:3000',
      apiUrlPrefix: '/api'
    };
    this.setup = false;
  }

  doSetup() {

    // Parent won't be set in the constructor, so detect here
    if (this.parent.calledFrom.match(/\/app\.js$/)) {
      this.defaults.expressPath = path.dirname(this.parent.calledFrom);
    }

    this.setup = true;

  }

  getSettings() {
    if (!this.setup) {
      this.doSetup();
    }

    // Loop through and fill settings
    const settings = {};
    for (const name in this.defaults) {
      settings[name] = this.parent.context.config.get('context.system.' + name, this.defaults[name]);
    }

    // Match API uses the value of apiUrlPrefix for its default value, so
    // fetch it and build the default every time
    settings.matchApi = this.parent.context.config.get('context.system.matchApi', '^' + settings.apiUrlPrefix + '/');

    return settings;
  }

  setting(key) {
    return this.getSettings()[key];
  }

  mailerPayload() {
    return {
      clientUrl: this.setting('clientUrl'),
      siteName: this.setting('siteName')
    };
  }

}

module.exports = new SystemContext();
