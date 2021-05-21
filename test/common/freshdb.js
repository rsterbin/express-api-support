const crypto = require('crypto');
const pgtools = require('pgtools');

const TestHelperBase = require('./base');
const LocalConfig = require('../data/localConfig.json');

TEST_DB_NAMES = {};

class FreshDatabaseTestHelper extends TestHelperBase {

  constructor(opts = {}) {
    super();
    if ('onlyTests' in opts && Array.isArray(opts.onlyTests)) {
        this.onlyTests = opts.onlyTests;
        this.allTests = false;
    } else {
        this.onlyTests = [];
        if ('allTests' in opts) {
            this.allTests = opts.allTests;
        } else {
            this.allTests = true;
        }
    }
    if ('onlyBlocks' in opts && Array.isArray(opts.onlyBlocks)) {
        this.onlyBlocks = opts.onlyBlocks;
        this.allBlocks = false;
    } else {
        this.onlyBlocks = [];
        if ('allBlocks' in opts) {
            this.allBlocks = opts.allBlocks;
        } else {
            this.allBlocks = false;
        }
    }
  }

  testLocalConfig() {
    if (!('database' in LocalConfig) || !('urlBase' in LocalConfig.database)) {
      throw new Error('Missing database URL base (urlBase) in localConfig.json');
    }
  }

  addOptions(options, testData = {}) {
    if (!('dbName' in testData)) {
      throw new Error("Cannot fetch options without a test database name!");
    }
    options.database = { url: LocalConfig.database.urlBase + testData.dbName };
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

  async beforeBlock(data = {}, name = '') {
    if (this.allBlocks || this.onlyBlocks.includes(name)) {
      let newName = getNewDbName();
      await pgtools.createdb(LocalConfig.database.createConfig, newName);
      TEST_DB_NAMES[newName] = 'created';
      data.dbName = newName;
    }
    return data;
  }

  async afterBlock(data = {}, name = '') {
    if (this.allBlocks || this.onlyBlocks.includes(name)) {
      await pgtools.dropdb(LocalConfig.database.createConfig, data.dbName);
      TEST_DB_NAMES[data.dbName] = 'dropped';
      data.dbName = null;
    }
    return data;
  }

  async beforeTest(data = {}, name = '') {
    if (this.allTests || this.onlyTests.includes(name)) {
      let newName = this.getNewDbName();
      await pgtools.createdb(LocalConfig.database.createConfig, newName);
      TEST_DB_NAMES[newName] = 'created';
      data.dbName = newName;
    }
    return data;
  }

  async afterTest(data = {}, name = '') {
    if (this.allTests || this.onlyTests.includes(name)) {
      await pgtools.dropdb(LocalConfig.database.createConfig, data.dbName);
      TEST_DB_NAMES[data.dbName] = 'dropped';
      data.dbName = null;
    }
    return data;
  }

}

module.exports = FreshDatabaseTestHelper;
