const express = require('express');
const chai = require('chai');
const request = require('supertest');
const pgtools = require('pgtools');
const crypto = require('crypto');
const MailDev = require('maildev');

const support = require('../index');
const LocalConfig = require('./data/localConfig.json');

const getOptions = function(dbName, custom = {}) {
  const basic = {
    database: { url: LocalConfig.database.urlBase + dbName },
    mailer: { templateDir: __dirname + '/data/templates', ignoreTLS: true, from: 'info@example.com' },
    react: { consoleLogErrors: false },
  };
  // a shallow merge is okay here, because all the things we care about in this text are directly below the first level
  const merged = {};
  for (const sec in basic) {
    const overwrite = sec in custom ? custom[sec] : {};
    merged[sec] = { ...basic[sec], ...overwrite };
  }
  for (const sec in custom) {
    if (!(sec in merged)) {
      merged[sec] = custom[sec];
    }
  }
  return merged;
};

const basicRoute = function(req, res) {
  if (typeof req.body !== 'object' || !('session' in req.body)) {
    res.status(400).json({ code: 'NOT_AUTHENTICATED', msg: 'You are not authenticated here' });
  } else {
    res.status(200).json({ data: { custom: 'Some Value' } });
  }
};

const installTables = async function(support, prefix = '') {
  try {
    const sql = support.generateSql();
    await support.context.database.query(sql);
    await support.context.database.query('select * from ' + prefix + 'admin_users');
  } catch (e) {
    console.log('install or check failed: ', e);
  }
};

const DB_NAMES = {};

const sleep = function(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const newMailClient = function() {
    const maildev = new MailDev({ silent: true });
    maildev.listen();
    return maildev;
}

const getEmailsFromClient = function(maildev) {
  return new Promise(resolve => maildev.getAllEmail((err, emails) => resolve({ err: err, emails: emails })));
}

const waitForOneEmail = function(maildev) {
  return new Promise(resolve => maildev.on('new', resolve));
//    maildev.on('new', function(email){
//      console.log('Received new email with subject: %s', email.subject)
//    })
}

const stopMailClient = function(maildev) {
  return new Promise(resolve => maildev.close(resolve));
}

describe('Admin authentication feature', () => {

  beforeEach(async function () {
    do {
      this.currentTest.dbName = LocalConfig.database.dbNamePrefix + crypto.randomBytes(4).toString('hex');
    } while (this.currentTest.dbName in DB_NAMES);
    DB_NAMES[this.currentTest.dbName] = 1;
    await pgtools.createdb(LocalConfig.database.createConfig, this.currentTest.dbName);
  });

  afterEach(async function () {
    this.timeout(120000);
    await support.destroy();
    await pgtools.dropdb(LocalConfig.database.createConfig, this.currentTest.dbName);
  });

  it('should allow through non-admin routes', async function() {

    const app = express();
    support.init(['adminAuth', 'react'], getOptions(this.test.dbName));
    app.use(express.json());
    support.middleware(app);
    const supportRouters = support.getRouters(app);
    app.use('/api/admin/auth', supportRouters.adminAuth.auth);
    app.use('/api/admin/user', supportRouters.adminAuth.user);
    app.use('/api/custom', basicRoute);
    support.handlers(app);

    const res = await request(app)
      .post('/api/custom')
      .set('Accept', 'application/json')
      .send({ custom: 'some-data' });

    chai.expect(res.status).to.be.eql(400);
    chai.expect(res.headers).to.have.property('content-type');
    chai.expect(res.headers['content-type']).to.match(/json/);
    chai.expect(res.body).to.have.property('code');
    chai.expect(res.body).to.have.property('msg');
    chai.expect(res.body.code).to.be.eql('NOT_AUTHENTICATED');
    chai.expect(res.body.msg).to.be.eql('You are not authenticated here');

  });

  it('should complain if no session info is present', async function() {

    const app = express();
    support.init(['adminAuth', 'react'], getOptions(this.test.dbName));
    app.use(express.json());
    support.middleware(app);
    const supportRouters = support.getRouters(app);
    app.use('/api/admin/auth', supportRouters.adminAuth.auth);
    app.use('/api/admin/user', supportRouters.adminAuth.user);
    app.use('/api/admin/custom', basicRoute);
    support.handlers(app);

    const res = await request(app)
      .post('/api/admin/custom')
      .set('Accept', 'application/json')
      .send({ custom: 'some-data' });

    chai.expect(res.status).to.be.eql(400);
    chai.expect(res.headers).to.have.property('content-type');
    chai.expect(res.headers['content-type']).to.match(/json/);
    chai.expect(res.body).to.have.property('code');
    chai.expect(res.body).to.have.property('msg');
    chai.expect(res.body.code).to.be.eql('NO_SESSION');
    chai.expect(res.body.msg).to.be.eql('No session data was provided');

  });

  it('should complain if the db tables are missing', async function() {

    const app = express();
    support.init(['adminAuth', 'react'], getOptions(this.test.dbName));
    app.use(express.json());
    support.middleware(app);
    const supportRouters = support.getRouters(app);
    app.use('/api/admin/auth', supportRouters.adminAuth.auth);
    app.use('/api/admin/user', supportRouters.adminAuth.user);
    app.use('/api/admin/custom', basicRoute);
    support.handlers(app);

    const res = await request(app)
      .post('/api/admin/custom')
      .set('Accept', 'application/json')
      .send({ session: { sid: 'fake-session-id', uid: 'fake-user-id', token: 'fake-token' } });

    chai.expect(res.status).to.be.eql(500);
    chai.expect(res.headers).to.have.property('content-type');
    chai.expect(res.headers['content-type']).to.match(/json/);
    chai.expect(res.body).to.have.property('code');
    chai.expect(res.body).to.have.property('msg');
    chai.expect(res.body.code).to.be.eql('UNEXPECTED');
    chai.expect(res.body.msg).to.match(/relation "admin_sessions" does not exist/);

  });

  it('should complain if the session is invalid', async function() {

    support.init(['adminAuth', 'react'], getOptions(this.test.dbName));
    await installTables(support);

    const app = express();
    app.use(express.json());
    support.middleware(app);
    const supportRouters = support.getRouters(app);
    app.use('/api/admin/auth', supportRouters.adminAuth.auth);
    app.use('/api/admin/user', supportRouters.adminAuth.user);
    app.use('/api/admin/custom', basicRoute);
    support.handlers(app);

    const res = await request(app)
      .post('/api/admin/custom')
      .set('Accept', 'application/json')
      .send({ session: { sid: 'fake-session-id', uid: 'fake-user-id', token: 'fake-token' } });

    chai.expect(res.status).to.be.eql(403);
    chai.expect(res.headers).to.have.property('content-type');
    chai.expect(res.headers['content-type']).to.match(/json/);
    chai.expect(res.body.code).to.be.eql('TOKEN_INVALID');
    chai.expect(res.body.msg).to.be.eql('Invalid session');

  });

  it('should work with a table prefix', async function() {

    const options = getOptions(this.test.dbName, { adminAuth: { tablePrefix: 'pfx_' } });
    support.init(['adminAuth', 'react'], options);
    await installTables(support, 'pfx_');

    const app = express();
    app.use(express.json());
    support.middleware(app);
    const supportRouters = support.getRouters(app);
    app.use('/api/admin/auth', supportRouters.adminAuth.auth);
    app.use('/api/admin/user', supportRouters.adminAuth.user);
    app.use('/api/admin/custom', basicRoute);
    support.handlers(app);

    const res = await request(app)
      .post('/api/admin/custom')
      .set('Accept', 'application/json')
      .send({ session: { sid: 'fake-session-id', uid: 'fake-user-id', token: 'fake-token' } });

    chai.expect(res.status).to.be.eql(403);
    chai.expect(res.headers).to.have.property('content-type');
    chai.expect(res.headers['content-type']).to.match(/json/);
    chai.expect(res.body.code).to.be.eql('TOKEN_INVALID');
    chai.expect(res.body.msg).to.be.eql('Invalid session');

  });

  it('should bootstrap a root user', async function() {

    support.init(['adminAuth', 'react'], getOptions(this.test.dbName));
    await installTables(support);

    await support.bootstrap({ 'adminAuth-email': 'test@example.com', 'adminAuth-password': '12345' });

    let user = {};
    try {
      const sth = await support.context.database.query('select email from admin_users');
      user = sth.rows[0];
    } catch (e) {
      console.log('checking boostrapped user failed: ', e);
    }
    chai.expect(user).to.have.property('email');
    chai.expect(user.email).to.be.eql('test@example.com');

  });

  it('should reject bootstrapping a second user', async function() {

    support.init(['adminAuth', 'react'], getOptions(this.test.dbName));
    await installTables(support);

    // first should work
    await support.bootstrap({ 'adminAuth-email': 'test@example.com', 'adminAuth-password': '12345' });

    // second should fail
    let ok = true;
    try {
      await support.bootstrap({ 'adminAuth-email': 'test2@example.com', 'adminAuth-password': '12345' });
    } catch (e) {
      ok = false;
      chai.expect(e.name).to.be.eql('AdminAuthError');
      chai.expect(e.message).to.be.eql('[CANNOT_BOOTSTRAP] You cannot bootstrap the admin when there are already users');
    }
    chai.expect(ok).to.be.eql(false);

    let users = [];
    try {
      const sth = await support.context.database.query('select email from admin_users order by user_id');
      users = sth.rows;
    } catch (e) {
      console.log('checking boostrapped users failed: ', e);
    }
    chai.expect(users.length).to.be.eql(1);
    chai.expect(users[0]).to.have.property('email');
    chai.expect(users[0].email).to.be.eql('test@example.com');

  });

  it('should reject bootstrapping if the secret password is set but not matched', async function() {

    support.init(['adminAuth', 'react'], getOptions(this.test.dbName, { adminAuth: { secretBootstrapPassword: '67890' } }));
    await installTables(support);

    // attempt should fail
    let ok = true;
    try {
      await support.bootstrap({ 'adminAuth-email': 'test@example.com', 'adminAuth-password': '12345' });
    } catch (e) {
      ok = false;
      chai.expect(e.name).to.be.eql('AdminAuthError');
      chai.expect(e.message).to.be.eql('[CANNOT_BOOTSTRAP] You cannot bootstrap without the secret code');
    }
    chai.expect(ok).to.be.eql(false);

    let users = [];
    try {
      const sth = await support.context.database.query('select email from admin_users order by user_id');
      users = sth.rows;
    } catch (e) {
      console.log('checking boostrapped users failed: ', e);
    }
    chai.expect(users.length).to.be.eql(0);

  });

  it('should reject a missing user', async function() {

    support.init(['adminAuth', 'react'], getOptions(this.test.dbName));
    await installTables(support);

    const app = express();
    app.use(express.json());
    support.middleware(app);
    const supportRouters = support.getRouters(app);
    app.use('/api/admin/auth', supportRouters.adminAuth.auth);
    app.use('/api/admin/user', supportRouters.adminAuth.user);
    support.handlers(app);

    const res = await request(app)
      .post('/api/admin/auth/login')
      .set('Accept', 'application/json')
      .send({ email: 'test@example.com', password: '12345' });

    chai.expect(res.status).to.be.eql(403);
    chai.expect(res.headers).to.have.property('content-type');
    chai.expect(res.headers['content-type']).to.match(/json/);
    chai.expect(res.body.code).to.be.eql('INVALID_CREDENTIALS');
    chai.expect(res.body.msg).to.be.eql('Invalid credentials');

  });

  it('should reject an incorrect password', async function() {

    support.init(['adminAuth', 'react'], getOptions(this.test.dbName));
    await installTables(support);
    await support.bootstrap({ 'adminAuth-email': 'test@example.com', 'adminAuth-password': '12345' });

    const app = express();
    app.use(express.json());
    support.middleware(app);
    const supportRouters = support.getRouters(app);
    app.use('/api/admin/auth', supportRouters.adminAuth.auth);
    app.use('/api/admin/user', supportRouters.adminAuth.user);
    support.handlers(app);

    const res = await request(app)
      .post('/api/admin/auth/login')
      .set('Accept', 'application/json')
      .send({ email: 'test@example.com', password: '67890' });

    chai.expect(res.status).to.be.eql(403);
    chai.expect(res.headers).to.have.property('content-type');
    chai.expect(res.headers['content-type']).to.match(/json/);
    chai.expect(res.body.code).to.be.eql('INVALID_CREDENTIALS');
    chai.expect(res.body.msg).to.be.eql('Invalid credentials');

  });

  it('should log in a valid user', async function() {

    support.init(['adminAuth', 'react'], getOptions(this.test.dbName));
    await installTables(support);
    await support.bootstrap({ 'adminAuth-email': 'test@example.com', 'adminAuth-password': '12345' });

    const app = express();
    app.use(express.json());
    support.middleware(app);
    const supportRouters = support.getRouters(app);
    app.use('/api/admin/auth', supportRouters.adminAuth.auth);
    app.use('/api/admin/user', supportRouters.adminAuth.user);
    support.handlers(app);

    const res = await request(app)
      .post('/api/admin/auth/login')
      .set('Accept', 'application/json')
      .send({ email: 'test@example.com', password: '12345' });

    chai.expect(res.status).to.be.eql(200);
    chai.expect(res.headers).to.have.property('content-type');
    chai.expect(res.headers['content-type']).to.match(/json/);
    chai.expect(res.body.data).to.have.property('user');
    chai.expect(res.body.data.user.email).to.be.eql('test@example.com');
    chai.expect(res.body.data).to.have.property('session');
    chai.expect(res.body.data.session).to.have.property('sid');
    chai.expect(res.body.data.session).to.have.property('uid');
    chai.expect(res.body.data.session).to.have.property('token');
    chai.expect(res.body.data.session.uid).to.be.eql(res.body.data.user.uid);
    chai.expect(res.body.data).to.have.property('expires');

  });

  it('should allow through a request if logged in', async function() {

    support.init(['adminAuth', 'react'], getOptions(this.test.dbName));
    await installTables(support);
    await support.bootstrap({ 'adminAuth-email': 'test@example.com', 'adminAuth-password': '12345' });

    const app = express();
    app.use(express.json());
    support.middleware(app);
    const supportRouters = support.getRouters(app);
    app.use('/api/admin/auth', supportRouters.adminAuth.auth);
    app.use('/api/admin/user', supportRouters.adminAuth.user);
    app.use('/api/admin/custom', basicRoute);
    support.handlers(app);

    const login = await request(app)
      .post('/api/admin/auth/login')
      .set('Accept', 'application/json')
      .send({ email: 'test@example.com', password: '12345' });
    chai.expect(login.status).to.be.eql(200);
    const session = login.body.data.session;

    const res = await request(app)
      .post('/api/admin/custom')
      .set('Accept', 'application/json')
      .send({ session: session });

    chai.expect(res.status).to.be.eql(200);
    chai.expect(res.headers).to.have.property('content-type');
    chai.expect(res.headers['content-type']).to.match(/json/);
    chai.expect(res.body).to.have.property('data');
    chai.expect(res.body.data).to.have.property('custom');
    chai.expect(res.body.data.custom).to.be.eql('Some Value');

  });

  it('should reject a logged-out session', async function() {

    support.init(['adminAuth', 'react'], getOptions(this.test.dbName));
    await installTables(support);
    await support.bootstrap({ 'adminAuth-email': 'test@example.com', 'adminAuth-password': '12345' });

    const app = express();
    app.use(express.json());
    support.middleware(app);
    const supportRouters = support.getRouters(app);
    app.use('/api/admin/auth', supportRouters.adminAuth.auth);
    app.use('/api/admin/user', supportRouters.adminAuth.user);
    app.use('/api/admin/custom', basicRoute);
    support.handlers(app);

    const login = await request(app)
      .post('/api/admin/auth/login')
      .set('Accept', 'application/json')
      .send({ email: 'test@example.com', password: '12345' });
    chai.expect(login.status).to.be.eql(200);
    const session = login.body.data.session;

    const logout = await request(app)
      .post('/api/admin/auth/logout')
      .set('Accept', 'application/json')
      .send({ session: session });
    chai.expect(logout.status).to.be.eql(200);

    const res = await request(app)
      .post('/api/admin/custom')
      .set('Accept', 'application/json')
      .send({ session: session });
    chai.expect(res.status).to.be.eql(403);
    chai.expect(res.headers).to.have.property('content-type');
    chai.expect(res.headers['content-type']).to.match(/json/);
    chai.expect(res.body.code).to.be.eql('TOKEN_INVALID');
    chai.expect(res.body.msg).to.be.eql('Invalid session');

  });

  it('should reject a timed-out session', async function() {

    // we need to run out the session (min length 1s)
    this.timeout(3000);

    support.init(['adminAuth', 'react'], getOptions(this.test.dbName, { adminAuth: { sessionLength: 1 } }));
    await installTables(support);
    await support.bootstrap({ 'adminAuth-email': 'test@example.com', 'adminAuth-password': '12345' });

    const app = express();
    app.use(express.json());
    support.middleware(app);
    const supportRouters = support.getRouters(app);
    app.use('/api/admin/auth', supportRouters.adminAuth.auth);
    app.use('/api/admin/user', supportRouters.adminAuth.user);
    app.use('/api/admin/custom', basicRoute);
    support.handlers(app);

    const login = await request(app)
      .post('/api/admin/auth/login')
      .set('Accept', 'application/json')
      .send({ email: 'test@example.com', password: '12345' });
    chai.expect(login.status).to.be.eql(200);
    const session = login.body.data.session;

    const check = await request(app)
      .post('/api/admin/custom')
      .set('Accept', 'application/json')
      .send({ session: session });
    chai.expect(check.status).to.be.eql(200);

    await sleep(1500);

    const res = await request(app)
      .post('/api/admin/custom')
      .set('Accept', 'application/json')
      .send({ session: session });
    chai.expect(res.status).to.be.eql(403);
    chai.expect(res.headers).to.have.property('content-type');
    chai.expect(res.headers['content-type']).to.match(/json/);
    chai.expect(res.body.code).to.be.eql('TOKEN_INVALID');
    chai.expect(res.body.msg).to.be.eql('Invalid session');

  });

  it('should refresh a session when used', async function() {

    // we need to refresh and then run out the session (min length 1s)
    this.timeout(50000);

    support.init(['adminAuth', 'react'], getOptions(this.test.dbName, { adminAuth: { sessionLength: 1 } }));
    await installTables(support);
    await support.bootstrap({ 'adminAuth-email': 'test@example.com', 'adminAuth-password': '12345' });

    const app = express();
    app.use(express.json());
    support.middleware(app);
    const supportRouters = support.getRouters(app);
    app.use('/api/admin/auth', supportRouters.adminAuth.auth);
    app.use('/api/admin/user', supportRouters.adminAuth.user);
    app.use('/api/admin/custom', basicRoute);
    support.handlers(app);

    const login = await request(app)
      .post('/api/admin/auth/login')
      .set('Accept', 'application/json')
      .send({ email: 'test@example.com', password: '12345' });
    chai.expect(login.status).to.be.eql(200);
    const session = login.body.data.session;

    const check1 = await request(app)
      .post('/api/admin/custom')
      .set('Accept', 'application/json')
      .send({ session: session });
    chai.expect(check1.status).to.be.eql(200);

    await sleep(300);

    const check2 = await request(app)
      .post('/api/admin/custom')
      .set('Accept', 'application/json')
      .send({ session: session });
    chai.expect(check2.status).to.be.eql(200);

    await sleep(800);

    const check3 = await request(app)
      .post('/api/admin/custom')
      .set('Accept', 'application/json')
      .send({ session: session });
    chai.expect(check3.status).to.be.eql(200);

    await sleep(1500);

    const check4 = await request(app)
      .post('/api/admin/custom')
      .set('Accept', 'application/json')
      .send({ session: session });
    chai.expect(check4.status).to.be.eql(403);
    chai.expect(check4.headers).to.have.property('content-type');
    chai.expect(check4.headers['content-type']).to.match(/json/);
    chai.expect(check4.body.code).to.be.eql('TOKEN_INVALID');
    chai.expect(check4.body.msg).to.be.eql('Invalid session');

  });

  it('should allow through forgot requests', async function() {

    // NB: we need the email to go somewhere, but we don't care about the
    // result right now, so the commented-out email promise stuff is just here
    // as a reminder for when I do the reset tests

    const maildev = newMailClient();
    // const emailPromise = waitForOneEmail(maildev);

    support.init(['adminAuth', 'react'], getOptions(this.test.dbName));
    await installTables(support);
    await support.bootstrap({ 'adminAuth-email': 'test@example.com', 'adminAuth-password': '12345' });

    const app = express();
    app.use(express.json());
    support.middleware(app);
    const supportRouters = support.getRouters(app);
    app.use('/api/admin/auth', supportRouters.adminAuth.auth);
    app.use('/api/admin/user', supportRouters.adminAuth.user);
    support.handlers(app);

    const res = await request(app)
      .post('/api/admin/auth/forgot')
      .set('Accept', 'application/json')
      .send({ email: 'test@example.com' });

//    const email = await emailPromise;
    stopMailClient(maildev);

    chai.expect(res.status).to.be.eql(200);
    chai.expect(res.headers).to.have.property('content-type');
    chai.expect(res.headers['content-type']).to.match(/json/);
    chai.expect(res.body).to.have.property('code');
    chai.expect(res.body.code).to.be.eql('SUCCESS');
    chai.expect(res.body).to.have.property('data');
    chai.expect(res.body.data).to.have.property('sent');
    chai.expect(res.body.data.sent).to.be.eql(true);

  });


  // TODO: it should allow through reset requests
  // TODO: it should bootstrap via the route if turned on
  // TODO: it should not bootstrap via the route if turned off

  // TODO: test pw reset
  // TODO: test users/sessions list

});
