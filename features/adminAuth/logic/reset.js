const LogicBase = require('./base'); 

class AdminAuthLogicReset extends LogicBase {
  constructor() { super(); }

  setup() {
    const prefix = this.context.config.get('feature.adminAuth.tablePrefix', '');
    this.tableTokens = prefix + 'admin_reset_tokens';
    this.tableUsers = prefix + 'admin_users';
    this.tokenLifetime = this.context.config.get('feature.adminAuth.resetTokenLifetime', 24) + ' hours';
  }

  async clearInactive() {
    const sql = `
      DELETE FROM ${this.tableTokens}
      WHERE expires < NOW()`;
    await this.context.database.query(sql);
  }

  async request(email) {
    await this.clearInactive();
    const token = this.context.crypt.createHex();
    const hashed = await this.context.crypt.hash(token);
    const sql = `
      WITH del AS (
        DELETE
        FROM ${this.tableTokens} r
        USING ${this.tableUsers} u
        WHERE u.user_id = r.user_id AND u.email = $1
      )
      INSERT INTO ${this.tableTokens} (user_id, token, expires)
      SELECT user_id, $2, NOW() + INTERVAL '${this.tokenLifetime}'
      FROM ${this.tableUsers} WHERE email = $1
      RETURNING user_id, reset_id, expires`;
    const sth = await this.context.database.query(sql, [ email, hashed ]);
    if (sth.rows.length < 1) {
      return { ok: false, data: { code: 'EMAIL_NOT_FOUND', status: 403 } };
    }
    const row = sth.rows[0];
    return {
      ok: true,
      data: {
        uid: row.user_id,
        token: token,
        rid: row.reset_id,
        expires: row.expires
      }
    };
  }

  async sendEmail(uid, token, expires) {
    const user = await this.parent.getUser(uid);
    if (!user.ok) {
      return user;
    }

    let link = this.context.system.setting('clientUrl') +
       this.context.config.get('feature.adminAuth.clientResetLink', '/reset');

    // TODO: JSON Web Tokens? need to pass email address alongside token

    const tokenStyle = this.context.config.get('feature.adminAuth.resetTokenStyle', 'query');
    if (tokenStyle == 'slug') {
      link += '/' + token;
    } else {
      link += '?token=' + token;
    }
    console.log('AdminAuthLogicReset.sendEmail:link', link);

    // TODO: remove convenience override once the client half is done
    link = 'http://localhost2:3003/api/v1/admin/auth/reset || token: ' + token +
      ' || email: ' + user.data.user.email;

    // TODO: formatting for expires date
    const payload = { ...this.context.system.mailerPayload,
      link: link,
      short: user.data.short,
      expires: expires
    };
    const sent = await this.context.mailer.send(
      user.data.user.email,
      'resetpw',
      payload
    );
    if (sent instanceof Error) {
      let msg = null;
      let dev = null;
      if (sent instanceof this.context.mailer.MailerError) {
        msg = sent.message;
        if (sent.prevErr) {
          dev = {
            message: sent.prevErr.message,
            stack: sent.prevErr.stack.split(/\n/)
          };
        }
      } else {
        msg = 'Error while sending mail';
        dev = sent.message;
      }
      return { ok: false, data: { code: 'MAIL_NOT_SENT', msg: msg, dev: dev } };
    }
    return { ok: true, data: { sent: true } };
  }

  async checkToken (email, token) {
    const sql1 = `
      DELETE FROM ${this.tableTokens}
      WHERE expires < NOW()`;
    this.context.database.query(sql1);
    const sql2 = `
      SELECT r.reset_id, u.user_id, r.token, r.expires
      FROM ${this.tableTokens} r
      JOIN ${this.tableUsers} u using (user_id)
      WHERE u.email = $1 AND r.expires >= NOW()`;
    const sth2 = await this.context.database.query(sql2, [ email ]);
    if (sth2.rows.length < 1) {
      return { ok: false, data: { code: 'TOKEN_INVALID', status: 403 } };
    }
    const row = sth2.rows[0];
    const valid = await this.context.crypt.verify(token, row.token);
    if (!valid) {
      return { ok: false, data: { code: 'TOKEN_INVALID', status: 403 } };
    }
    return { ok: true, data: { reset_id: row.reset_id, email: row.email, expires: row.expires } };
  }

  async deleteToken (reset_id) {
    const sql = `
      DELETE FROM ${this.tableTokens}
      WHERE reset_id = $1
      RETURNING reset_id`;
    const sth = await this.context.database.query(sql, [ reset_id ]);
    if (sth.rows.length < 1) {
      return { ok: true, data: { rid: null } };
    }
    const row = sth.rows[0];
    return { ok: true, data: { rid: row.reset_id } };
  }

}

module.exports = new AdminAuthLogicReset();
