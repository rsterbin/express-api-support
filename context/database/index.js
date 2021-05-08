const ContextBase = require('../base');

const { Pool } = require('pg');

const contextConfig = require('./config.json');

class DatabaseContext extends ContextBase {

  constructor () {
    super();
    this.configSpec = contextConfig.spec;
    this.name = contextConfig.name;
    this.pool = null;
    this.client = null;
  }

  getPool() {
    if (this.pool === null) {
      this.pool = new Pool({
        connectionString: this.getConfigValue('url')
      });
    }
    return this.pool;
  }

  // If you need to open a transaction, you can't just run queries against the
  // pool, because transactions are per-connection -- you need a single client
  // to work with:
  //   async myTransaction() {
  //     const client = await this.db.getTransactionClient();
  //     await client.query('BEGIN');
  //     ...
  //     await client.query('COMMIT');
  //     this.db.closeTransactionClient(client);
  //   }
  async getTransactionClient() {
    return await this.getPool().connect();
  }

  // ALWAYS close when you're done
  closeTransactionClient(client) {
    client.release();
  }

  // Use this to make a single, non-transactional query
  // It grabs a client from the pool, makes the query, and then puts it back
  // The pool handles the connect/release for you
  // NB: This function returns a promise
  query(text, params) {
    return this.getPool().query(text, params);
  }

  async destroy() {
    if (this.pool !== null) {
      await this.pool.end();
      this.pool = null;
    }
  }

}

module.exports = new DatabaseContext();
