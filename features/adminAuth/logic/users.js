const emailValidator = require("email-validator");

const LogicBase = require('./base'); 

const DEFAULT_USER_FIELDS = [
    { key: 'short', column: 'short_name', pgtype: 'text' },
    { key: 'full', column: 'full_name', pgtype: 'text' },
];

class AdminAuthLogicUsers extends LogicBase {
    constructor() { super() }

    setup() {
        const prefix = this.context.config.get('feature.adminAuth.tablePrefix', '');
        this.tableUsers = prefix + 'admin_users';
        this.userFields = this.context.config.get('feature.adminAuth.userFields', DEFAULT_USER_FIELDS);
    }

    async create (email, password, data = {}) {
        if (!emailValidator.validate(email)) {
            return { ok: false, data: { code: 'INVALID_EMAIL_ADDRESS', status: 400 } };
        }
        const user_id = this.context.crypt.createUuid();
        const hashed = await this.context.crypt.hash(password);
        const cols = [ 'user_id', 'email', 'password' ];
        const vals = [ user_id, email.toLowerCase(), hashed ];
        for (field of this.userFields) {
            if (field.key in data) {
                cols.push(field.column);
                vals.push(data[key]);
            }
        }
        const sth = await this.context.database.query(`
            INSERT INTO ${this.tableUsers} (${cols.join(', ')})
            VALUES (${cols.map((c,i) => '$' + (i + 1)).join(', ')})
            ON CONFLICT (email) DO NOTHING
            RETURNING user_id`,
            vals
        );
        if (sth.rows.length < 1) {
            return { ok: false, data: { code: 'DUPLICATE_EMAIL', status: 400 } };
        }
        const newUser = { uid: sth.rows[0].user_id, email: email };
        for (field of this.userFields) {
            newUser[field.key] = field.key in data ? data[field.key] : null;
        }
        return { ok: true, data: newUser };
    }

    async update (user_id, data) {
        const cols = [];
        const vals = [];
        if ('email' in data) {
            if (!emailValidator.validate(data.email)) {
                return { ok: false, data: { code: 'INVALID_EMAIL_ADDRESS', status: 400 } };
            }
            cols.push('email');
            vals.push(data.email.tolowercase());
        }
        for (field of this.userFields) {
            if (field.key in data) {
                cols.push(field.column);
                vals.push(data[field.key]);
            }
        }
        if (cols.length < 1) {
            return { ok: true, data: { updated: false } };
        }
        const sth = await this.context.database.query(`
            WITH rows AS (
                UPDATE ${this.tableUsers}
                SET ${cols.map((c,i) => c + ' = $' + (i + 1)).join(', ')}
                RETURNING 1
            )
            SELECT count(*) AS affected FROM rows`,
            vals
        );
        if (sth.rows.length < 1) {
            return { ok: false, data: { code: 'UPDATE_FAILED', status: 500 } };
        }
        const upd = sth.rows[0].affected > 0;
        return { ok: true, data: { uid: user_id, updated: upd } };
    }

    async get (user_id) {
        const extra = this.userFields.map(f => f.column).join(', ');
        const sth = await this.context.database.query(`
            SELECT user_id, email, disabled${extra === '' ? '' : ', ' + extra }
            FROM ${this.tableUsers}
            WHERE user_id = $1`,
            [ user_id ]
        );
        if (sth.rows.length < 1) {
            return { ok: false, data: { code: 'USER_NOT_FOUND', status: 404 } };
        }
        const user = this.format(sth.rows[0]);
        return { ok: true, data: { user: user } };
    }

    async getAll (include_disabled = false) {
        const extra = this.userFields.map(f => f.column).join(', ');
        const where = include_disabled ? '1=1' : 'disabled IS FALSE';
        const sth = await this.context.database.query(`
            SELECT user_id, email, disabled${extra === '' ? '' : ', ' + extra }
            FROM ${this.tableUsers}
            WHERE ${where}`
        );
        const users = sth.rows.map(row => this.format(row));
        return { ok: true, data: { users: users } };
    }

    async disable (user_id) {
        const sth = await this.context.database.query(`
            WITH rows AS (
                UPDATE ${this.tableUsers}
                SET disabled = TRUE
                WHERE user_id = $1
                RETURNING 1
            )
            SELECT count(*) AS affected FROM rows`,
            [ user_id ]
        );
        if (sth.rows.length < 1) {
            return { ok: false, data: { code: 'UPDATE_FAILED', status: 500 } };
        }
        const upd = sth.rows[0].affected > 0;
        return { ok: true, data: { uid: user_id, updated: upd } };
    }

    async enable (user_id) {
        const sth = await this.context.database.query(`
            WITH rows AS (
                UPDATE ${this.tableUsers}
                SET disabled = FALSE
                WHERE user_id = $1
                RETURNING 1
            )
            SELECT count(*) AS affected FROM rows`,
            [ user_id ]
        );
        if (sth.rows.length < 1) {
            return { ok: false, data: { code: 'UPDATE_FAILED', status: 500 } };
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
        const sth = await this.context.database.query(`
            SELECT user_id, email, password${extra === '' ? '' : ', ' + extra }
            FROM ${this.tableUsers}
            WHERE email = $1
            AND disabled IS FALSE`,
            [ email ]
        );
        if (sth.rows.length < 1) {
            return { ok: false, data: { code: 'INVALID_CREDENTIALS', status: 403 } };
        }
        const row = sth.rows[0];
        const valid = await this.context.crypt.verify(password, row.password);
        if (!valid) {
            return { ok: false, data: { code: 'INVALID_CREDENTIALS', status: 403 } };
        }
        return { ok: true, data: this.format(row) };
    }

    async updatePassword (email, newPassword) {
        const hashed = await this.context.crypt.hash(newPassword);
        const sth = await this.context.database.query(`
            UPDATE ${this.tableUsers}
            SET password = $1
            WHERE email = $2
            AND disabled IS FALSE
            RETURNING user_id`,
            [ hashed, email ]
        );
        const updated = (sth.rows.length > 0);
        return { ok: true, data: { email: email, updated: updated } };
    }
}

module.exports = new AdminAuthLogicUsers();
