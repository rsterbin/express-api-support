const ContextBase = require('../base');

const { Pool } = require('pg');

const contextConfig = require('./config.json');

class DatabaseContext extends ContextBase {

	constructor () {
        super();
        this.configSpec = contextConfig.spec;
        this.name = contextConfig.name;
        this.pool = null;
	}

    getPool() {
        if (this.pool === null) {
            this.pool = new Pool({
                connectionString: this.parent.context.config.get('context.database.url')
            });
        }
        return this.pool;
    }

    query(text, params) {
        return this.getPool().query(text, params);
    }

}

module.exports = new DatabaseContext();
