const MailDev = require('maildev');

const TestHelperBase = require('./base');
const LocalConfig = require('../data/localConfig.json');

class MailDevTestHelper extends TestHelperBase {

  constructor(opts = {}) {
    super();
    this.maildev = null;
    this.running = false;
    if ('onlyBlocks' in opts && Array.isArray(opts.onlyBlocks)) {
        this.onlyBlocks = opts.onlyBlocks;
        this.allBlocks = false;
    } else {
        this.onlyBlocks = [];
        if ('allBlocks' in opts) {
            this.allBlocks = opts.allBlocks;
        } else {
            this.allBlocks = true;
        }
    }
  }

  addOptions(options, testData = {}) {
    options.mailer = { templateDir: options.mailer.templateDir, ignoreTLS: true, from: 'info@example.com' };
    return options;
  }

  startMailClient() {
    if (this.running) {
      throw new Error('The MailDev client is already running');
    }
    if (this.maildev === null) {
      this.maildev = new MailDev({ silent: true });
    }
    return new Promise(resolve => this.maildev.listen(() =>{
      this.running = true;
      resolve();
    }));
  }

  waitForOneEmail() {
    if (!this.running) {
      throw new Error('The MailDev client is not running');
    }
    return new Promise(resolve => this.maildev.on('new', resolve));
  }

  stopMailClient() {
    if (!this.running) {
      throw new Error('The MailDev client is not running');
    }
    return new Promise(resolve => this.maildev.close(() => {
      this.running = false;
      resolve();
    }));
  }

  async beforeBlock(data = {}, name = '') {
    if (this.allBlocks || this.onlyBlocks.includes(name)) {
      await this.startMailClient();
    }
    return data;
  }

  async afterBlock(data = {}, name = '') {
    if (this.allBlocks || this.onlyBlocks.includes(name)) {
      await this.stopMailClient();
    }
    return data;
  }

}

module.exports = MailDevTestHelper;
