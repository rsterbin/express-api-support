const LogicBase = require('./base'); 

class AdminAuthLogicSessions extends LogicBase {
  constructor() { super(); }

  setup() {
    const prefix = this.feature.getConfigValue('tablePrefix');
    this.tableSessions = prefix + 'admin_sessions';
    this.tableUsers = prefix + 'admin_users';
    this.sessionLength = this.feature.getConfigValue('sessionLength') + ' seconds';
  }

  async start (user_id) {
    const session_id = this.context.crypt.createUuid();
    const token = this.context.crypt.createHex();
    const hashed = await this.context.crypt.hash(token);
    const sql = `
      INSERT INTO ${this.tableSessions} (session_id, user_id, token, expires)
      SELECT $1, $2, $3, NOW() + INTERVAL '${this.sessionLength}'
      RETURNING expires`;
    const sth = await this.context.database.query(sql, [ session_id, user_id, hashed ]);
    if (sth.rows.length < 1) {
      return { ok: false, data: { code: 'SESSION_START_FAILED', status: 403, msg: 'Session could not be started', dev: 'Insert returned nothing' } };
    }
    return {
      ok: true,
      data: {
        session: {
          sid: session_id,
          token: token,
          uid: user_id,
        },
        expires: sth.rows[0].expires
      }
    };
  }

  async clearInactive () {
    await this.context.database.query(`
      DELETE FROM ${this.tableSessions}
      WHERE expires < NOW()`
    );
  }

 // TODO: return "uid" and "sid" rather than "user_id" and session_id"
  async getAllActive () {
    await this.clearInactive();
    const sql = `
      SELECT user_id, email, session_id, expires
      FROM ${this.tableSessions}
      JOIN ${this.tableUsers} USING (user_id)
      WHERE expires >= NOW()
      ORDER BY email, expires`;
    const sth = await this.context.database.query(sql);
    return { ok: true, data: { all: sth.rows } };
  }

  async checkToken (session_id, user_id, token) {
    await this.clearInactive();
    const sql1 = `
      SELECT token, expires FROM ${this.tableSessions}
      WHERE session_id = $1 AND user_id = $2 AND expires >= NOW()`;
    const sth1 = await this.context.database.query(sql1, [ session_id, user_id ]);
    if (sth1.rows.length < 1) {
      return { ok: false, data: { code: 'TOKEN_INVALID', status: 403, msg: 'Token is invalid', dev: 'No matching unexpired session exists' } };
    }
    const valid = await this.context.crypt.verify(token, sth1.rows[0].token);
    if (!valid) {
      return { ok: false, data: { code: 'TOKEN_INVALID', status: 403, msg: 'Token is invalid', dev: 'Token does not match' } };
    }
    let exp = sth1.rows[0].expires;
    const sql2 = `
      UPDATE ${this.tableSessions}
      SET expires = NOW() + INTERVAL '${this.sessionLength}'
      WHERE session_id = $1
      RETURNING expires`;
    const sth2 = await this.context.database.query(sql2, [ session_id ]);
    if (sth2.rows.length > 0) {
      exp = sth2.rows[0].expires;
    }
    return { ok: true, data: {
      sid: session_id,
      token: token,
      uid: user_id,
      expires: exp
    } };
  }

  async delete (session_id) {
    const sql = `
      DELETE FROM ${this.tableSessions}
      WHERE session_id = $1
      RETURNING session_id`;
    const sth = await this.context.database.query(sql, [ session_id ]);
    if (sth.rows.length < 1) {
      return { ok: false, data: { code: 'SESSION_INVALID', status: 400, msg: 'Session is invalid', dev: 'Lookup for session ID returned nothing' } };
    }
    const sid = sth.rows[0].session_id;
    return { ok: true, data: { sid: sid } };
  }

}

module.exports = new AdminAuthLogicSessions();
