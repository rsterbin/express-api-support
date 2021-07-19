
const Feature = require('./features/base');
const Context = require('./context/base');

const FEATURES = {
  auth: 'lazy',
  cors: 'lazy',
  react: 'lazy',
};

const CONTEXT = {
  system: require('./context/system'),
  config: require('./context/config'),
  crypt: 'lazy',
  database: 'lazy',
  mailer: 'lazy'
};

const CALLED_FROM = module.parent ? module.parent.filename : null;

class ApiSupport {

  constructor() {
    this.context = {};
    this.features = [];
    this.calledFrom = CALLED_FROM;
    this.initialized = false;
  }

  featureNames() {
    return Object.keys(FEATURES).sort();
  }

  getFeature(name) {
    for (const feature of this.features) {
      if (feature.name === name) {
        return feature;
      }
    }
  }

  // TODO: Need a way to request contexts without features
  init(features = [], options = {}, addSpec = {}) {
    if (this.initialized) {
      // TODO: Custom error
      throw new Error('already initialized');
    }

    const requiredContext = {
      system: true,
      config: true,
    };
    const configSpec = {
      ...addSpec,
      feature: {
        type: 'parent',
        children: {}
      },
      context: {
        type: 'parent',
        children: {}
      }
    };
    const splitOptions = {
      feature: {},
      context: {},
    };
    // TODO: add scaffolding for custom spec so apps don't have to send it as part of the options object, eg `{ myApp: {} }`

    for (const ft of features) {
      if (ft in FEATURES) {
        let feature = FEATURES[ft];
        if (feature === 'lazy') {
          feature = require('./features/' + ft);
        }
        if (typeof feature !== 'object' || !(feature instanceof Feature)) {
          continue;
        }
        feature.parent = this;
        for (const cxt of feature.requiredContext) {
          requiredContext[cxt] = true;
        }
        configSpec.feature.children[ft] = {
          type: 'parent',
          children: feature.configSpec
        };
        if (ft in options) {
          splitOptions.feature[ft] = options[ft];
        } else {
          splitOptions.feature[ft] = {};
        }
        delete options[ft];
        this.features.push(feature);
      }
    }

    for (const cxt in requiredContext) {
      if (cxt in CONTEXT) {
        let context = CONTEXT[cxt];
        if (context === 'lazy') {
          context = require('./context/' + cxt);
        }
        if (typeof context !== 'object' || !(context instanceof Context)) {
          continue;
        }
        context.parent = this;
        configSpec.context.children[cxt] = {
          type: 'parent',
          children: context.configSpec
        };
        if (cxt in options) {
          splitOptions.context[cxt] = options[cxt];
          delete options[cxt];
        } else {
          splitOptions.context[cxt] = {};
        }
        this.context[cxt] = context;
      }
    }

    // Any leftover options should be considered application config and accessible as sent
    for (const k in options) {
      splitOptions[k] = options[k];
    }

    this.context.config.invoke(configSpec, splitOptions);

    this.initialized = true;
  }

  reportFeatureSettings() {
    const settings = {};
    for (const feature of this.features) {
      settings[feature.name] = {};
      for (const name in feature.configSpec) {
        settings[feature.name][name] = feature.getConfigValue(name);
      }
    }
    return settings;
  }

  reportContextSettings() {
    const settings = {};
    for (const cxt in this.context) {
      settings[cxt] = {};
      for (const name in this.context[cxt].configSpec) {
        settings[cxt][name] = this.context[cxt].getConfigValue(name);
      }
    }
    return settings;
  }

  middleware(app) {
    for (const feature of this.features) {
      feature.middleware(app);
    }
  }

  getRouters(app) {
    let routers = {};
    for (const feature of this.features) {
      const r = feature.getRouters(app);
      if (r !== null) {
        routers[feature.name] = r;
      }
    }
    return routers;
  }

  handlers(app) {
    for (const feature of this.features) {
      feature.handlers(app);
    }
  }

  getContext(cxt) {
    return this.context[cxt];
  }

  generateSql() {
    let scripts = [];
    for (const feature of this.features) {
      const sql = feature.generateSql();
      if (sql !== null) {
        scripts.push(sql);
      }
    }
    return scripts.join('\n\n');
  }

  bootstrapOptions(argsParser) {
    for (const feature of this.features) {
      argsParser = feature.bootstrapOptions(argsParser);
    }
    return argsParser;
  }

  async bootstrap(options = {}) {
    for (const feature of this.features) {
      await feature.bootstrap(options);
    }
  }

  async destroy() {
    for (const cxt in this.context) {
      await this.context[cxt].destroy();
    }
    this.context = {};
    this.features = [];
    this.initialized = false;
  }

}

module.exports = new ApiSupport();
