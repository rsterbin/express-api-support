const handlebars = require('handlebars');
const fs = require('fs');

class FeatureBase {

  constructor() {
    this.requiredContext = [];
    this.configSpec = {};
    this.name = null;
    const parent = this;
    this.FeatureError = class FeatureError extends Error {
      constructor(message, error) {
        super(message);
        if (parent.getSystemValue('consoleLogErrors')) {
          console.log('API Support feature error: ', message, error);
        }
        this.name = 'FeatureError';
        this.prevErr = error;
      }
    };
  }

  getCustomDefault(name) { // eslint-disable-line no-unused-vars
    return undefined;
  }

  getConfigValue(name) {
    const custom = this.getCustomDefault(name);
    if (name in this.configSpec) {
      const mydefault = custom === undefined ? this.configSpec[name].default : custom;
      return this.parent.context.config.get('feature.' + this.name + '.' + name, mydefault);
    } else {
      return this.parent.context.config.get(name, custom);
    }
  }

  getSystemValue(name) {
    return this.parent.context.system.setting(name);
  }

  middleware(app) {} // eslint-disable-line no-unused-vars

  getRouters(app) { // eslint-disable-line no-unused-vars
    return null;
  }

  handlers(app) {} // eslint-disable-line no-unused-vars

  generateSql() {
    return null;
  }

  getSqlTemplate(basepath) {
    let template = null;
    const tpl = basepath + '/sql.tpl';
    if (fs.existsSync(tpl)) {
      try {
        const source = fs.readFileSync(tpl, 'utf8');
        template = handlebars.compile(source);
      } catch (e) {
        throw new this.FeatureError('Could not read sql file', e);
      }
    }
    return template;
  }

  bootstrapOptions(argsParser) {
    return argsParser;
  }

  async bootstrap(options = {}) {} // eslint-disable-line no-unused-vars

}

module.exports = FeatureBase;
