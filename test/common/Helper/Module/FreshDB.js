const crypto = require('crypto');
const pgtools = require('pgtools');

const TestHelperBase = require('./Base');
const LocalConfig = require('../../../data/localConfig.json');

const TEST_DB_NAMES = {};

class FreshDatabaseTestHelper extends TestHelperBase {

  constructor(opts = {}) {
    super(opts);
    this.current = null;
  }

  testLocalConfig() {
    if (!('database' in LocalConfig) || !('urlBase' in LocalConfig.database)) {
      throw new Error('Missing database URL base (urlBase) in localConfig.json');
    }
  }

  addOptions(options) {
    if (this.current) {
      options.database = { url: LocalConfig.database.urlBase + this.current };
    }
    return options;
  }

  getNewDbName() {
    let newName = '';
    do {
      newName = LocalConfig.database.dbNamePrefix + crypto.randomBytes(4).toString('hex');
    } while (newName in TEST_DB_NAMES);
    TEST_DB_NAMES[newName] = 'reserved';
    return newName;
  }

  async start() {
    this.current = this.getNewDbName();
    await pgtools.createdb(LocalConfig.database.createConfig, this.current);
    TEST_DB_NAMES[this.current] = 'created';
  }

  async stop() {
    await pgtools.dropdb(LocalConfig.database.createConfig, this.current);
    TEST_DB_NAMES[this.current] = 'dropped';
    this.current = null;
  }

}

module.exports = FreshDatabaseTestHelper;
