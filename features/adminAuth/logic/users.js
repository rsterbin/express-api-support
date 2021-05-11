const emailValidator = require('email-validator');

const LogicBase = require('./base'); 

class AdminAuthLogicUsers extends LogicBase {
  constructor() { super(); }

  setup() {
    const prefix = this.feature.getConfigValue('tablePrefix');
    this.tableUsers = prefix + 'admin_users';
    this.userFields = this.feature.getConfigValue('userFields');
  }

  async create (email, password, data = {}) {
    if (!emailValidator.validate(email)) {
      return { ok: false, data: { code: 'INVALID_EMAIL_ADDRESS', status: 400, msg: 'Email address is invalid' } };
    }
    const user_id = this.context.crypt.createUuid();
    const hashed = await this.context.crypt.hash(password);
    const cols = [ 'user_id', 'email', 'password' ];
    const vals = [ user_id, email.toLowerCase(), hashed ];
    for (const field of this.userFields) {
      if (field.key in data) {
        cols.push(field.column);
        vals.push(data[field.key]);
      }
    }
    const sql = `
      INSERT INTO ${this.tableUsers} (${cols.join(', ')})
      VALUES (${cols.map((c,i) => '$' + (i + 1)).join(', ')})
      ON CONFLICT (email) DO NOTHING
      RETURNING user_id`;
    const sth = await this.context.database.query(sql, vals);
    if (sth.rows.length < 1) {
      return { ok: false, data: { code: 'DUPLICATE_EMAIL', status: 400, msg: 'Email address already exists' } };
    }
    const newUser = { uid: sth.rows[0].user_id, email: email };
    for (const field of this.userFields) {
      newUser[field.key] = field.key in data ? data[field.key] : null;
    }
    return { ok: true, data: newUser };
  }

  async update (user_id, data) {
    const cols = [];
    const vals = [];
    if ('email' in data) {
      if (!emailValidator.validate(data.email)) {
        return { ok: false, data: { code: 'INVALID_EMAIL_ADDRESS', status: 400, msg: 'Email address is invalid' } };
      }
      cols.push('email');
      vals.push(data.email.tolowercase());
    }
    for (const field of this.userFields) {
      if (field.key in data) {
        cols.push(field.column);
        vals.push(data[field.key]);
      }
    }
    if (cols.length < 1) {
      return { ok: true, data: { updated: false } };
    }
    const sql = `
      WITH rows AS (
        UPDATE ${this.tableUsers}
        SET ${cols.map((c,i) => c + ' = $' + (i + 1)).join(', ')}
        RETURNING 1
      )
      SELECT count(*) AS affected FROM rows`;
    const sth = await this.context.database.query(sql, vals);
    if (sth.rows.length < 1) {
      return { ok: false, data: { code: 'UPDATE_FAILED', status: 500, msg: 'Could not update user info', dev: 'Nothing returned from update statement' } };
    }
    const upd = sth.rows[0].affected > 0;
    return { ok: true, data: { uid: user_id, updated: upd } };
  }

  async get (user_id) {
    const extra = this.userFields.map(f => f.column).join(', ');
    const sql = `
      SELECT user_id, email, disabled${extra === '' ? '' : ', ' + extra }
      FROM ${this.tableUsers}
      WHERE user_id = $1`;
    const sth = await this.context.database.query(sql, [ user_id ]);
    if (sth.rows.length < 1) {
      return { ok: false, data: { code: 'USER_NOT_FOUND', status: 404, msg: 'No such user was found' } };
    }
    const user = this.format(sth.rows[0]);
    return { ok: true, data: { user: user } };
  }

  async getAll (include_disabled = false) {
    const extra = this.userFields.map(f => f.column).join(', ');
    const where = include_disabled ? '1=1' : 'disabled IS FALSE';
    const sql = `
      SELECT user_id, email, disabled${extra === '' ? '' : ', ' + extra }
      FROM ${this.tableUsers}
      WHERE ${where}`;
    const sth = await this.context.database.query(sql);
    const users = sth.rows.map(row => this.format(row));
    return { ok: true, data: { users: users } };
  }

  async disable (user_id) {
    const sql = `
      WITH rows AS (
        UPDATE ${this.tableUsers}
        SET disabled = TRUE
        WHERE user_id = $1
        RETURNING 1
      )
      SELECT count(*) AS affected FROM rows`;
    const sth = await this.context.database.query(sql, [ user_id ]);
    if (sth.rows.length < 1) {
      return { ok: false, data: { code: 'UPDATE_FAILED', status: 500, msg: 'Could not disable user', dev: 'Nothing returned from update statement' } };
    }
    const upd = sth.rows[0].affected > 0;
    return { ok: true, data: { uid: user_id, updated: upd } };
  }

  async enable (user_id) {
    const sql = `
      WITH rows AS (
        UPDATE ${this.tableUsers}
        SET disabled = FALSE
        WHERE user_id = $1
        RETURNING 1
      )
      SELECT count(*) AS affected FROM rows`;
    const sth = await this.context.database.query(sql, [ user_id ]);
    if (sth.rows.length < 1) {
      return { ok: false, data: { code: 'UPDATE_FAILED', status: 500, msg: 'Could not disable user', dev: 'Nothing returned from update statement' } };
    }
    const upd = sth.rows[0].affected > 0;
    return { ok: true, data: { uid: user_id, updated: upd } };
  }

  format (row) {
    const user = {
      uid: row.user_id,
      email: row.email,
    };
    if ('disabled' in row) {
      user.disabled = row.disabled;
    }
    for (const field of this.userFields) {
      user[field.key] = field.column in row ? row[field.column] : null;
    }
    return user;
  }

  async auth (email, password) {
    const extra = this.userFields.map(f => f.column).join(', ');
    const sql = `
      SELECT user_id, email, password${extra === '' ? '' : ', ' + extra }
      FROM ${this.tableUsers}
      WHERE email = $1
      AND disabled IS FALSE`;
    const sth = await this.context.database.query(sql, [ email ]);
    if (sth.rows.length < 1) {
      return { ok: false, data: { code: 'INVALID_CREDENTIALS', status: 403, msg: 'Invalid credentials', dev: 'Email not found' } };
    }
    const row = sth.rows[0];
    const valid = await this.context.crypt.verify(password, row.password);
    if (!valid) {
      return { ok: false, data: { code: 'INVALID_CREDENTIALS', status: 403, msg: 'Invalid credentials', dev: 'Password does not match' } };
    }
    return { ok: true, data: this.format(row) };
  }

  async updatePassword (email, newPassword) {
    const hashed = await this.context.crypt.hash(newPassword);
    const sql = `
      UPDATE ${this.tableUsers}
      SET password = $1
      WHERE email = $2
      AND disabled IS FALSE
      RETURNING user_id`;
    const sth = await this.context.database.query(sql, [ hashed, email ]);
    if (sth.rows.length < 1) {
      return { ok: false, data: { code: 'UPDATE_FAILED', status: 500, msg: 'Could not change password', dev: 'Nothing returned from update statement' } };
    }
    return { ok: true, data: { email: email, updated: true } };
  }
}

module.exports = new AdminAuthLogicUsers();
