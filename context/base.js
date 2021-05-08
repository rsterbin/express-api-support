
class ContextBase {

  constructor() {
    this.configSpec = {};
  }

  getCustomDefault(name) { // eslint-disable-line no-unused-vars
    return undefined;
  }

  getConfigValue(name) {
    const custom = this.getCustomDefault(name);
    if (name in this.configSpec) {
      const mydefault = custom === undefined ? this.configSpec[name].default : custom;
      return this.parent.context.config.get('context.' + this.name + '.' + name, mydefault);
    } else {
      return this.parent.context.config.get(name, custom);
    }
  }

  getSystemValue(name) {
    return this.parent.context.system.setting(name);
  }

  async destroy() {}

}

module.exports = ContextBase;
