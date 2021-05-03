const ContextBase = require('../base');

const bcrypt = require("bcrypt");
const crypto = require("crypto");
const { v4: uuidv4 } = require('uuid');

const contextConfig = require('./config.json');

class CryptContext extends ContextBase {

  constructor () {
    super();
    this.configSpec = contextConfig.spec;
    this.name = contextConfig.name;
  }

  async hash(clear) {
    return await bcrypt.hash(clear, Number(this.parent.config.get('bcryptSalt')));
  }

  async verify(test, hashed) {
    return await bcrypt.compare(test, hashed);
  }

  createUuid () {
    return uuidv4();
  }

  createHex () {
    return crypto.randomBytes(32).toString("hex");
  }

}

module.exports = new CryptContext();
