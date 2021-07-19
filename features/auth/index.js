
const Feature = require('../base');

const authRouter = require('./routers/auth');
const userRouter = require('./routers/user');
const restrictions = require('./middleware/restrictions');

const featureConfig = require('./config.json');
const logic = require('./logic');

class FeatureAuth extends Feature {

  constructor() {
    super();
    this.requiredContext = [ 'config', 'database', 'crypt', 'mailer' ];
    this.configSpec = featureConfig.spec;
    this.configSpec.userFields.type = this.validateUserFields;
    this.name = featureConfig.name;
    this.AuthError = class AuthError extends this.FeatureError {
      constructor(code, message, error) {
        super('[' + code + '] ' + message, error);
        this.name = 'AuthError';
        this.code = code;
      }
    };
  }

  getCustomDefault(name) {
    if (name === 'matchSection' || name === 'authMountPoint') {
      const apiUrlPrefix = this.getSystemValue('apiUrlPrefix');
      if (name === 'matchSection') {
        return '^' + apiUrlPrefix + '/';
      }
      if (name === 'authMountPoint') {
        return apiUrlPrefix + '/auth';
      }
    }
    return undefined;
  }

  validateUserFields(found) {
    // e.g., [{ key: 'short', column: 'short_name', pgtype: 'text' }]
    if (!Array.isArray(found)) {
      return false;
    }
    for (const field of found) {
      if (typeof(field) !== 'object' || field === null || Array.isArray(field)) {
        return false;
      }
      if (!('key' in field) || typeof field.key !== 'string') {
        return false;
      }
      if (!('column' in field) || typeof field.column !== 'string') {
        // TODO: make sure it's a valid postgres column name?
        return false;
      }
      if (!('pgtype' in field) || typeof field.pgtype !== 'string') {
        // TODO: make sure it's a valid postgres column type?
        return false;
      }
    }
    return true;
  }

  getRouters() {
    const routers = {};
    routers.auth = authRouter(this);
    if (this.getConfigValue('includeUserRoutes')) {
      routers.user = userRouter(this);
    }
    return routers;
  }

  middleware(app) {
    app.use(restrictions(this));
  }

  generateSql() {
    const template = this.getSqlTemplate(__dirname);
    if (template === null) {
      return null;
    }
    const payload = {
      prefix: this.getConfigValue('tablePrefix'),
      userFields: this.getConfigValue('userFields'),
    };
    return template(payload);
  }

  // Adds yargs options for bootstrapping
  bootstrapOptions(argsParser) {
    let secretNote = '';
    if (this.getConfigValue('secretBootstrapPassword')) {
      secretNote = ' (must match your secret bootstrap password!)';
    }
    return argsParser
      .option('auth-email', {
        describe: 'The email address for the first user',
        type: 'string'
      })
      .option('auth-password', {
        describe: 'The password for the first user' + secretNote,
        type: 'string'
      })
      .check((argv) => {
        if (!('auth-email' in argv)) {
          throw new this.AuthError('EMAIL_REQUIRED', 'Email is required');
        }
        if (!('auth-password' in argv)) {
          throw new this.AuthError('PASSWORD_REQUIRED', 'Password is required');
        }
        return true;
      });
  }

  // Creates the first user in the system
  async bootstrap(argv = {}) {
    logic.init(this);
    const options = {};
    for (const key in argv) {
      if (key.match(/^auth-/)) {
        const myname = key.replace(/^auth-/, '');
        options[myname] = argv[key];
      }
    }
    const out = await logic.bootstrap(options.email, options.password, options);
    if (out.ok) {
      return true;
    } else {
      throw new this.AuthError(out.data.code, out.data.msg);
    }
  }

}

module.exports = new FeatureAuth();
