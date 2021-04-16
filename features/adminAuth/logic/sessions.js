const LogicBase = require('./base'); 

class AdminAuthLogicSessions extends LogicBase {
    constructor() { super() }

    setup() {
        const prefix = this.context.config.get('feature.adminAuth.tablePrefix', '');
        this.tableSessions = prefix + 'admin_sessions';
        this.tableUsers = prefix + 'admin_users';
        this.sessionLength = this.context.config.get('feature.adminAuth.sessionLength', 60) + ' minutes';
    }

    async start (user_id) {
        const session_id = this.context.crypt.createUuid();
        const token = this.context.crypt.createHex();
        const hashed = await this.context.crypt.hash(token);
        const sth = await this.context.database.query(`
            INSERT INTO ${this.tableSessions} (session_id, user_id, token, expires)
            SELECT $1, $2, $3, NOW() + INTERVAL '${this.sessionLength}'
            RETURNING expires`,
            [ session_id, user_id, hashed ]
        );
        if (sth.rows.length < 1) {
            return { ok: false, data: { code: 'SESSION_START_FAILED', status: 403 } };
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

    async getAllActive () {
        await this.clearInactive();
        const sth = await this.context.database.query(`
            SELECT user_id, email, session_id, expires
            FROM ${this.tableSessions}
            JOIN ${this.tableUsers} USING (user_id)
            WHERE expires >= NOW()
            ORDER BY email, expires`
        );
        return { ok: true, data: { all: sth.rows } };
    }

    async checkToken (session_id, user_id, token) {
        await this.clearInactive();
        const sth1 = await this.context.database.query(`
            SELECT token, expires FROM ${this.tableSessions}
            WHERE session_id = $1 AND user_id = $2 AND expires >= NOW()`,
            [ session_id, user_id ]
        );
        if (sth1.rows.length < 1) {
            return { ok: false, data: { code: 'TOKEN_INVALID', status: 403 } };
        }
        const valid = await this.context.crypt.verify(token, sth1.rows[0].token);
        if (!valid) {
            return { ok: false, data: { code: 'TOKEN_INVALID', status: 403 } };
        }
        let exp = sth1.rows[0].expires;
        const sth2 = await this.context.database.query(`
            UPDATE ${this.tableSessions}
            SET expires = NOW() + INTERVAL '${this.sessionLength}'
            WHERE session_id = $1
            RETURNING expires`,
            [ session_id ]
        );
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
        const sth = await this.context.database.query(`
            DELETE FROM ${this.tableSessions}
            WHERE session_id = $1
            RETURNING session_id`,
            [ session_id ]
        );
        if (sth.rows.length < 1) {
            return { ok: true, data: { sid: null } };
        }
        const sid = sth.rows[0].session_id;
        return { ok: true, data: { sid: sid } };
    }

}

module.exports = new AdminAuthLogicSessions();
