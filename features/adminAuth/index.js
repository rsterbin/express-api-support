
const Feature = require('../base');

const authRouter = require('./routers/auth');
const userRouter = require('./routers/user');
const restrictions = require('./middleware/restrictions');

const featureConfig = require('./config.json');

class FeatureAdminAuth extends Feature {

  constructor() {
    super();
    this.requiredContext = [ 'config', 'database', 'crypt', 'mailer' ];
    this.configSpec = featureConfig.spec;
    this.configSpec.userFields.type = this.validateUserFields;
    this.name = featureConfig.name;
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
    return {
      auth: authRouter(this),
      user: userRouter(this)
    };
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

}

module.exports = new FeatureAdminAuth();
