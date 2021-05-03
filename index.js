
const Feature = require('./features/base');
const Context = require('./context/base');

const FEATURES = {
  adminAuth: 'lazy',
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
  }

  init(features = [], options = {}, addSpec = {}) {
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

}

module.exports = new ApiSupport();
