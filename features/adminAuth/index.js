
const Feature = require('../base');

const authRouter = require('./routers/auth');
const userRouter = require('./routers/user');
const restrictions = require('./middleware/restrictions');

const featureConfig = require('./config.json');
const logic = require('./logic');

class FeatureAdminAuth extends Feature {

  constructor() {
    super();
    this.requiredContext = [ 'config', 'database', 'crypt', 'mailer' ];
    this.configSpec = featureConfig.spec;
    this.configSpec.userFields.type = this.validateUserFields;
    this.name = featureConfig.name;
    const parent = this;
    this.AdminAuthError = class AdminAuthError extends this.FeatureError {
      constructor(code, message, error) {
        super('[' + code + '] ' + message, error);
        this.name = 'AdminAuthError';
        this.code = code;
      }
    };
  }

  getCustomDefault(name) {
    if (name === 'matchAdmin' || name === 'mountPoint') {
      const apiUrlPrefix = this.getSystemValue('apiUrlPrefix');
      if (name === 'matchAdmin') {
        return '^' + apiUrlPrefix + '/admin/';
      }
      if (name === 'mountPoint') {
        return apiUrlPrefix + '/admin/auth';
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
      .option('adminAuth-email', {
        describe: 'The email address for the first user in the admin',
        type: 'string'
      })
      .option('adminAuth-password', {
        describe: 'The password for the first user in the admin' + secretNote,
        type: 'string'
      })
      .check((argv) => {
        if (!('adminAuth-email' in argv)) {
          throw new this.AdminAuthError('EMAIL_REQUIRED', 'Email is required');
        }
        if (!('adminAuth-password' in argv)) {
          throw new this.AdminAuthError('PASSWORD_REQUIRED', 'Password is required');
        }
      });
  }

  // Creates the first user in the system
  async bootstrap(argv = {}) {
    logic.init(this);
    const options = {};
    for (const key in argv) {
      if (key.match(/^adminAuth-/)) {
        const myname = key.replace(/^adminAuth-/, '');
        options[myname] = argv[key];
      }
    }
    const out = await logic.bootstrap(options.email, options.password, options);
    if (out.ok) {
      return true;
    } else {
      throw new this.AdminAuthError(out.data.code, out.data.msg);
    }
  }

}

module.exports = new FeatureAdminAuth();
