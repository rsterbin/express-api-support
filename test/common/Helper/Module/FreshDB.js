const crypto = require('crypto');
const pg = require('pg');

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

  async createDatabase(dbname) {
    const client = new pg.Client(LocalConfig.database.createConfig);
    await client.connect();
    const res = await client.query('CREATE DATABASE ' + dbname);
    await client.end();
  }

  async dropDatabase(dbname) {
    const client = new pg.Client(LocalConfig.database.createConfig);
    await client.connect();
    const res = await client.query('DROP DATABASE ' + dbname);
    await client.end();
  }

  async start() {
    this.current = this.getNewDbName();
    await this.createDatabase(this.current);
    TEST_DB_NAMES[this.current] = 'created';
  }

  async stop() {
    await this.dropDatabase(this.current);
    TEST_DB_NAMES[this.current] = 'dropped';
    this.current = null;
  }

}

module.exports = FreshDatabaseTestHelper;
