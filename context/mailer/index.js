const ContextBase = require('../base');

const nodemailer = require('nodemailer');
const handlebars = require('handlebars');
const fs = require('fs');
const path = require('path');

const contextConfig = require('./config.json');

class MailerContext extends ContextBase {

  constructor () {
    super();
    this.configSpec = contextConfig.spec;
    this.name = contextConfig.name;
    this.transport = null;
    this.templates = {};
    this.MailerError = class MailerError extends Error {
      constructor(message, error) {
        super(message);
        console.log('Mailer error: ', error);
        this.name = 'MailerError';
        this.prevErr = error;
      }
    };
  }

  getTransport () {
    if (this.transport === null) {
      let setup = {};
      const url = this.getConfigValue('smtpUrl');
      if (url) {
        setup = url;
      } else {
        for (const key of [ 'host', 'port', 'ignoreTLS' ]) {
          const val = this.getConfigValue(key);
          if (val !== undefined) {
            setup[key] = val;
          }
        }
      }
      this.transport =  nodemailer.createTransport(setup);
    }
    return this.transport;
  }

  loadTemplate (name) {
    if (!(name in this.templates)) {
      const basepath = this.getConfigValue('templateDir');
      const infopath = path.join(basepath, name, 'info.json');
      const htmlpath = path.join(basepath, name, 'html.handlebars');
      const textpath = path.join(basepath, name, 'text.handlebars');
      if (!fs.existsSync(infopath)) {
        throw new this.MailerError('No such template: ' + name);
      }
      const info = require(infopath);
      if (fs.existsSync(htmlpath)) {
        const source = fs.readFileSync(htmlpath, 'utf8');
        try {
          info.html = handlebars.compile(source);
        } catch (e) {
          throw new this.MailerError('Cannot compile template body (html)', e);
        }
      }
      if (fs.existsSync(textpath)) {
        const source = fs.readFileSync(textpath, 'utf8');
        try {
          info.text = handlebars.compile(source);
        } catch (e) {
          throw new this.MailerError('Cannot compile template body (text)', e);
        }
      }
      try {
        info.subject = handlebars.compile(info.subject || '');
      } catch (e) {
        throw new this.MailerError('Cannot compile template subject', e);
      }
      this.templates[name] = info;
    }
    return this.templates[name];
  }

  async send (to, tpl, mvars = {}) {
    let template = null;
    try {
      template = this.loadTemplate(tpl);
    } catch (e) {
      return e;
    }
    let payload = { ...mvars };
    if (this.parent.context.client) {
      payload = { ...payload, client: this.parent.context.client.mailerPayload() };
    }
    const from = template.from + '@' + this.getConfigValue('fromDomain');
    const msg = {
      from: from,
      to: to,
      subject: template.subject(payload)
    };
    if (template.html) {
      msg.html = template.html(payload);
    }
    if (template.text) {
      msg.text = template.text(payload);
    }
    try {
      await this.getTransport().sendMail(msg);
      // console.log('Mailer:send:info', info);
    } catch (e) {
      return new this.MailerError('Mail send failed', e);
    }
    return true;
  }

  destroy() {
    this.transport = null;
  }

}

module.exports = new MailerContext();
