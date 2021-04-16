
const sessionsLogic = require('./sessions');
const resetLogic = require('./reset');
const usersLogic = require('./users');

class AdminAuthLogic {

    constructor() {
        this.sessions = this.wrap(sessionsLogic);
        this.reset = this.wrap(resetLogic);
        this.users = this.wrap(usersLogic);
    }

    wrap(submodule) {
        submodule.parent = this;
        return submodule;
    }

    init(context) {
        this.sessions.init(context);
        this.reset.init(context);
        this.users.init(context);
    }

    // user management
    async createUser (email, password, data = {}) {
        return await this.users.create(email, password, data);
    }
    async updateUser (user_id, data) {
        const upd = await this.users.update(user_id, data);
        if (!upd.ok || !('newPassword' in data)) {
            return upd;
        }
        const res = await this.users.updatePassword(data.email, data.newPassword);
        if (!res.ok) {
            return res;
        }
        upd.data.password = '<CHANGED>';
        return upd;
    }
    async getAllUsers (include_disabled = false) {
        return await this.users.getAll(include_disabled);
    }
    async getUser (user_id) {
        return await this.users.get(user_id);
    }
    async disableUser (user_id) {
        return await this.users.disable(user_id);
    }
    async enableUser (user_id) {
        return await this.users.enable(user_id);
    }

    // login / session handling
    async login (email, password) {
        const user = await this.users.auth(email, password);
        if (!user.ok) {
            return user;
        }
        const session = await this.sessions.start(user.data.uid);
        if (!session.ok) {
            return { ok: false, data: { code: 'SESSION_START_FAILED', status: 500 } };
        }
        return { ok: true, data: {
            user: user.data,
            session: session.data.session,
            expires: session.data.expires
        } };
    }
    async authOnly (email, password) {
        return await this.users.auth(email, password);
    }
    async getAllActiveSessions () {
        return await this.sessions.getAllActive();
    }
    async checkSessionToken (session_id, user_id, token) {
        return await this.sessions.checkToken(session_id, user_id, token);
    }
    async logout (session_id) {
        return await this.sessions.delete(session_id);
    }
    async getCurrentSession (sid) {
        return await this.sessions.get(sid);
    }

    // password reset
    async requestPasswordReset (email) {
        const req = await this.reset.request(email);
        if (!req.ok) {
            return req;
        }
        return await this.reset.sendEmail(req.data.uid, req.data.token, req.data.expires);
    }
    async checkResetToken (email, token) {
        return await this.reset.checkToken(email, token);
    }
    async resetPassword (email, token, newPassword) {
        const chk = await this.reset.checkToken(email, token);
        if (!chk.ok) {
            return chk;
        }
        const upd = await this.users.updatePassword(email, newPassword);
        if (!upd.ok) {
            return done;
        }
        const del = await this.reset.deleteToken(chk.data.reset_id);
        return upd;
    }

    // bootstrap
    async bootstrap (email, password, data = {}) {
        const all = await this.users.getAll(true);
        if (!all.ok) {
            return all;
        }
        if (all.data.users.length > 0) {
            return { ok: false, data: { status: 409, code: 'CANNOT_BOOTSTRAP', msg: 'You cannot bootstrap the admin when there are already users' } };
        }
        const secretCode = this.context.config.get('feature.adminAuth.secretBootstrapPassword', '');
        if (secretCode) {
            if (!('secretCode' in data) || data.secretCode !== secretCode) {
                return { ok: false, data: { status: 403, code: 'CANNOT_BOOTSTRAP', msg: 'You cannot bootstrap without the secret code' } };
            }
        }
        const finalPass = 'newPassword' in data ? data.newPassword : password;
        return await this.users.create(email, finalPass, data);
    }

}

module.exports = new AdminAuthLogic();
