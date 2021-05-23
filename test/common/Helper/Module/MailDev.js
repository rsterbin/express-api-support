const MailDev = require('maildev');

const TestHelperBase = require('./Base');

class MailDevTestHelper extends TestHelperBase {

  constructor(opts = {}) {
    super(opts);
    this.maildev = null;
    this.running = false;
  }

  addOptions(options) {
    if (options.mailer) {
      options.mailer = { templateDir: options.mailer.templateDir, ignoreTLS: true, from: 'info@example.com' };
    }
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

  async start() {
    await this.startMailClient();
  }

  async stop() {
    await this.stopMailClient();
  }

}

module.exports = MailDevTestHelper;
