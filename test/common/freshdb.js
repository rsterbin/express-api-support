const crypto = require('crypto');
const pgtools = require('pgtools');

const TestHelperBase = require('./base');
const LocalConfig = require('../data/localConfig.json');

const TEST_DB_NAMES = {};

class FreshDatabaseTestHelper extends TestHelperBase {

  constructor(opts = {}) {
    super(opts);
    this.created = false;
  }

  testLocalConfig() {
    if (!('database' in LocalConfig) || !('urlBase' in LocalConfig.database)) {
      throw new Error('Missing database URL base (urlBase) in localConfig.json');
    }
  }

  addOptions(options, testData = {}) {
    if (this.created) {
      if (!('dbName' in testData)) {
        throw new Error('Cannot fetch options without a test database name!');
      }
      options.database = { url: LocalConfig.database.urlBase + testData.dbName };
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

  async start(data = {}) {
    let newName = this.getNewDbName();
    await pgtools.createdb(LocalConfig.database.createConfig, newName);
    TEST_DB_NAMES[newName] = 'created';
    data.dbName = newName;
    this.created = true;
    return data;
  }

  async stop(data = {}) {
    await pgtools.dropdb(LocalConfig.database.createConfig, data.dbName);
    TEST_DB_NAMES[data.dbName] = 'dropped';
    data.dbName = null;
    this.created = false;
    return data;
  }

}

module.exports = FreshDatabaseTestHelper;
