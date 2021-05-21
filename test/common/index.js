const fs = require('fs');

const support = require('../../index');
const LocalConfig = require('../data/localConfig.json');

class TestHelpers {

  constructor() {
    this.use = {};
    this.need = {
      database: false,
      mailer: false,
      consoleErrors: false
    };
  }

  usesFreshDatabases(opts = {}) {
    const FreshDatabaseTestHelper = require('./freshdb');
    this.use.freshDatabases = new FreshDatabaseTestHelper(opts);
    return this;
  }

  usesMailDev(opts = {}) {
    const MailDevTestHelper = require('./maildev');
    this.use.mailDev = new MailDevTestHelper(opts);
    return this;
  }

  needsDatabase(switchOn) {
    this.need.database = switchOn;
    return this;
  }

  needsMailer(switchOn) {
    this.need.mailer = switchOn;
    return this;
  }

  needsConsoleErrors(switchOn) {
    this.need.consoleErrors = switchOn;
    return this;
  }

  getOptions(testData = {}, custom = {}) {
    // Make sure all the settings we need are present first
    this.testLocalConfig();

    // Set up the elements we need
    let basic = {};
    if (this.need.database) {
      basic.database = { url: LocalConfig.database.urlBase + LocalConfig.database.fallbackDbName };
    }
    if (this.need.mailer) {
      const templatePath = fs.realpathSync(__dirname + '/../data/templates');
      basic.mailer = { templateDir: templatePath };
    }
    if (!this.need.consoleErrors) {
      basic.react = { consoleLogErrors: false };
    }

    // Add any modules we're using
    for (const modName in this.use) {
      basic = this.use[modName].addOptions(basic, testData[modName]);
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

  initSupport(features, testData, custom = {}) {
    support.init(features, this.getOptions(testData, custom));
    return support;
  }

  testLocalConfig() {
    if (typeof LocalConfig !== 'object' || LocalConfig === null) {
      throw new Error('Please copy test/data/localConfig.dist.json to test/data/localConfig.json and set values');
    }
    if (this.need.database) {
      if (!('database' in LocalConfig) || !('urlBase' in LocalConfig.database)) {
        throw new Error('Missing database URL base (urlBase) in localConfig.json');
      }
      if (!('database' in LocalConfig) || !'fallbackDbName' in LocalConfig.database) {
        throw new Error('Missing test database name (fallbackDbName) in localConfig.json');
      }
    }
    for (const modName in this.use) {
      this.use[modName].testLocalConfig();
    }
  }

  async installTables(checkTable = 'admin_users') {
    if (!this.need.database) {
      throw new Error('Cannot install tables with no database');
    }
    try {
      const sql = support.generateSql();
      await support.context.database.query(sql);
      await support.context.database.query('select * from ' + checkTable);
    } catch (e) {
      console.log('database install or check failed: ', e);
      throw new Error("Installing tables, or checking they exist, failed");
    }
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

  async beforeBlock(data = {}, name = '') {
    return await this.mapModPromises((m) => this.use[m].beforeBlock(data[m], name));
  }

  async afterBlock(data = {}, name = '') {
    return await this.mapModPromises((m) => this.use[m].afterBlock(data[m], name));
  }

  async beforeTest(data = {}, name = '') {
    return await this.mapModPromises((m) => this.use[m].beforeTest(data[m], name));
  }

  async afterTest(data = {}, name = '') {
    await support.destroy();
    return await this.mapModPromises((m) => this.use[m].afterTest(data[m], name));
  }

}

module.exports = TestHelpers;
