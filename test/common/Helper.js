const fs = require('fs');

const support = require('../../index');
const Config = require('../data/config.json');
const LocalConfig = require('../data/localConfig.json');

const FreshDatabaseTestHelper = require('./Helper/Module/FreshDB');
const MailDevTestHelper = require('./Helper/Module/mailDev');

const NEED_DEFAULT = {
  database: false,
  mailer: false,
  consoleErrors: false
};

class TestHelpers {

  constructor() {
    this.use = {};
    this.use.freshDatabases = new FreshDatabaseTestHelper(Config.module.freshdb);
    this.use.mailDev = new MailDevTestHelper(Config.module.maildev);
    this.currentlyNeed = NEED_DEFAULT;
  }

  getOptions(custom = {}) {
    // Make sure all the settings we need are present first
    this.testLocalConfig();

    // Set up the elements we need
    let basic = {};
    if (this.currentlyNeed.database) {
      basic.database = { url: LocalConfig.database.urlBase + LocalConfig.database.fallbackDbName };
    }
    if (this.currentlyNeed.mailer) {
      const templatePath = fs.realpathSync(__dirname + '/../data/templates');
      basic.mailer = { templateDir: templatePath };
    }
    if (!this.currentlyNeed.consoleErrors) {
      basic.system = { consoleLogErrors: false };
    }

    // Add any modules we're using
    for (const modName in this.use) {
      basic = this.use[modName].addOptions(basic);
    }

    // Add custom settings for this specific call to support.init()
    // NB: a shallow merge is okay here, because all the things we care about
    // are directly below the first level
    const merged = {};
    for (const sec in basic) {
      const overwrite = sec in custom ? custom[sec] : {};
      merged[sec] = { ...basic[sec], ...overwrite };
    }
    for (const sec in custom) {
      if (!(sec in merged)) {
        merged[sec] = custom[sec];
      }
    }
    return merged;
  }

  initSupport(features, need = {}, custom = {}) {
    this.currentlyNeed = { ...NEED_DEFAULT, ...need };
    support.init(features, this.getOptions(custom));
    return support;
  }

  testLocalConfig() {
    if (typeof LocalConfig !== 'object' || LocalConfig === null) {
      throw new Error('Please copy test/data/localConfig.dist.json to test/data/localConfig.json and set values');
    }
    if (this.currentlyNeed.database) {
      if (!('database' in LocalConfig) || !('urlBase' in LocalConfig.database)) {
        throw new Error('Missing database URL base (urlBase) in localConfig.json');
      }
      if (!('database' in LocalConfig) || !('fallbackDbName' in LocalConfig.database)) {
        throw new Error('Missing test database name (fallbackDbName) in localConfig.json');
      }
    }
    for (const modName in this.use) {
      this.use[modName].testLocalConfig();
    }
  }

  async installTables(checkTable = 'admin_users') {
    try {
      const sql = support.generateSql();
      await support.context.database.query(sql);
      await support.context.database.query('select * from ' + checkTable);
    } catch (e) {
      console.log('database install or check failed: ', e);
      throw new Error('Installing tables, or checking they exist, failed');
    }
  }

  async bootstrapUser(email, password, extra = {}, table = 'admin_users') {
    if (!support.featureNames().includes('adminAuth')) {
      throw new Error('Admin auth feature is not initialized');
    }
    const args = { 'adminAuth-email': email, 'adminAuth-password': password };
    for (const key in extra) {
      args['adminAuth-' + key] = extra[key];
    }
    await support.bootstrap(args);
    const sth = await support.context.database.query('SELECT * FROM ' + table + ' ORDER BY user_id');
    return sth.rows;
  }

  sleep (ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  basicRoute (req, res) {
    if (typeof req.body !== 'object' || !('session' in req.body)) {
      res.status(400).json({ code: 'NOT_AUTHENTICATED', msg: 'You are not authenticated here' });
    } else {
      res.status(200).json({ data: { custom: 'Some Value' } });
    }
  }

  waitForOneEmail() {
    if (!('mailDev' in this.use)) {
      throw new Error('MailDev client module is not turned on');
    }
    return this.use.mailDev.waitForOneEmail();
  }

  // getPromise = function (modName) => promise
  async mapModPromises(getPromise) {
    const promises = [];
    const indexer = [];
    for (const modName in this.use) {
      indexer.push(modName);
      promises.push(getPromise(modName));
    }
    const results = {};
    const returned = await Promise.all(promises);
    for (let j = 0; j < returned.length; j++) {
      results[indexer[j]] = returned[j];
    }
    return results;
  }

  getTimeout(hook, name = '', suites = []) {
    if (hook == 'afterAll') {
      return 120000; // TODO: base on what's on/off
    } else {
      return 500; // TODO: base on what's on/off
    }
  }

  async beforeAll() {
    await this.mapModPromises((m) => this.use[m].beforeAllHook());
  }

  async afterAll() {
    await this.mapModPromises((m) => this.use[m].afterAllHook());
  }

  async beforeEach(name = '', suites = []) {
    await this.mapModPromises((m) => this.use[m].beforeEachHook(name, suites));
  }

  async afterEach(name = '', suites = []) {
    if (support.initialized) {
      this.currentlyNeed = NEED_DEFAULT;
      await support.destroy();
    }
    await this.mapModPromises((m) => this.use[m].afterEachHook(name, suites));
  }

}

module.exports = TestHelpers;
