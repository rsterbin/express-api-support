const express = require('express');
const chai = require('chai');
const request = require('supertest');

const support = require('../index');
const testHelpers = require('../utils/testHelpers');

const maildev = testHelpers.newMailClient();

describe('Admin authentication feature', () => {

  before(async function() {
    await testHelpers.startMailClient(maildev);
  });

  after(async function() {
    await testHelpers.stopMailClient(maildev);
  });

  beforeEach(async function () {
    this.currentTest.testData = await testHelpers.spinup({ support: support, perTestDB: {}, mailDev: {} });
  });

  afterEach(async function () {
    this.timeout(120000);
    await testHelpers.winddown(this.currentTest.testData);
  });

  it('should allow through non-admin routes', async function() {

    const app = express();
    support.init(['adminAuth', 'react'], testHelpers.getOptions(this.test.testData));
    app.use(express.json());
    support.middleware(app);
    const supportRouters = support.getRouters(app);
    app.use('/api/admin/auth', supportRouters.adminAuth.auth);
    app.use('/api/admin/user', supportRouters.adminAuth.user);
    app.use('/api/custom', testHelpers.basicRoute);
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
    support.init(['adminAuth', 'react'], testHelpers.getOptions(this.test.testData));
    app.use(express.json());
    support.middleware(app);
    const supportRouters = support.getRouters(app);
    app.use('/api/admin/auth', supportRouters.adminAuth.auth);
    app.use('/api/admin/user', supportRouters.adminAuth.user);
    app.use('/api/admin/custom', testHelpers.basicRoute);
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
    support.init(['adminAuth', 'react'], testHelpers.getOptions(this.test.testData));
    app.use(express.json());
    support.middleware(app);
    const supportRouters = support.getRouters(app);
    app.use('/api/admin/auth', supportRouters.adminAuth.auth);
    app.use('/api/admin/user', supportRouters.adminAuth.user);
    app.use('/api/admin/custom', testHelpers.basicRoute);
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

    support.init(['adminAuth', 'react'], testHelpers.getOptions(this.test.testData));
    await testHelpers.installTables(support);

    const app = express();
    app.use(express.json());
    support.middleware(app);
    const supportRouters = support.getRouters(app);
    app.use('/api/admin/auth', supportRouters.adminAuth.auth);
    app.use('/api/admin/user', supportRouters.adminAuth.user);
    app.use('/api/admin/custom', testHelpers.basicRoute);
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

    const options = testHelpers.getOptions(this.test.testData, { adminAuth: { tablePrefix: 'pfx_' } });
    support.init(['adminAuth', 'react'], options);
    await testHelpers.installTables(support, 'pfx_');

    const app = express();
    app.use(express.json());
    support.middleware(app);
    const supportRouters = support.getRouters(app);
    app.use('/api/admin/auth', supportRouters.adminAuth.auth);
    app.use('/api/admin/user', supportRouters.adminAuth.user);
    app.use('/api/admin/custom', testHelpers.basicRoute);
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

    support.init(['adminAuth', 'react'], testHelpers.getOptions(this.test.testData));
    await testHelpers.installTables(support);

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

    support.init(['adminAuth', 'react'], testHelpers.getOptions(this.test.testData));
    await testHelpers.installTables(support);

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

  it('should bootstrap a user with custom extra fields', async function() {

    support.init(['adminAuth', 'react'], testHelpers.getOptions(this.test.testData, { adminAuth: {
      userFields: [
        { key: 'first', column: 'first_name', pgtype: 'text' },
        { key: 'last', column: 'last_name', pgtype: 'text' },
        { key: 'access', column: 'access_level', pgtype: 'integer' }
      ]
    } }));
    await testHelpers.installTables(support);

    await support.bootstrap({
      'adminAuth-email': 'test@example.com',
      'adminAuth-password': '12345',
      'adminAuth-first': 'Testy',
      'adminAuth-last': 'McTest',
      'adminAuth-access': 3
    });

    let user = {};
    try {
      const sth = await support.context.database.query('select email, first_name, last_name, access_level from admin_users');
      user = sth.rows[0];
    } catch (e) {
      console.log('checking boostrapped user failed: ', e);
    }
    chai.expect(user).to.have.property('email');
    chai.expect(user).to.have.property('first_name');
    chai.expect(user).to.have.property('last_name');
    chai.expect(user).to.have.property('access_level');
    chai.expect(user.email).to.be.eql('test@example.com');
    chai.expect(user.first_name).to.be.eql('Testy');
    chai.expect(user.last_name).to.be.eql('McTest');
    chai.expect(user.access_level).to.be.eql(3);

  });

  it('should reject a missing user', async function() {

    support.init(['adminAuth', 'react'], testHelpers.getOptions(this.test.testData));
    await testHelpers.installTables(support);

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

    support.init(['adminAuth', 'react'], testHelpers.getOptions(this.test.testData));
    await testHelpers.installTables(support);
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

    support.init(['adminAuth', 'react'], testHelpers.getOptions(this.test.testData));
    await testHelpers.installTables(support);
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

    support.init(['adminAuth', 'react'], testHelpers.getOptions(this.test.testData));
    await testHelpers.installTables(support);
    await support.bootstrap({ 'adminAuth-email': 'test@example.com', 'adminAuth-password': '12345' });

    const app = express();
    app.use(express.json());
    support.middleware(app);
    const supportRouters = support.getRouters(app);
    app.use('/api/admin/auth', supportRouters.adminAuth.auth);
    app.use('/api/admin/user', supportRouters.adminAuth.user);
    app.use('/api/admin/custom', testHelpers.basicRoute);
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

    support.init(['adminAuth', 'react'], testHelpers.getOptions(this.test.testData));
    await testHelpers.installTables(support);
    await support.bootstrap({ 'adminAuth-email': 'test@example.com', 'adminAuth-password': '12345' });

    const app = express();
    app.use(express.json());
    support.middleware(app);
    const supportRouters = support.getRouters(app);
    app.use('/api/admin/auth', supportRouters.adminAuth.auth);
    app.use('/api/admin/user', supportRouters.adminAuth.user);
    app.use('/api/admin/custom', testHelpers.basicRoute);
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

    support.init(['adminAuth', 'react'], testHelpers.getOptions(this.test.testData, { adminAuth: { sessionLength: 1 } }));
    await testHelpers.installTables(support);
    await support.bootstrap({ 'adminAuth-email': 'test@example.com', 'adminAuth-password': '12345' });

    const app = express();
    app.use(express.json());
    support.middleware(app);
    const supportRouters = support.getRouters(app);
    app.use('/api/admin/auth', supportRouters.adminAuth.auth);
    app.use('/api/admin/user', supportRouters.adminAuth.user);
    app.use('/api/admin/custom', testHelpers.basicRoute);
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

    await testHelpers.sleep(1500);

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

    support.init(['adminAuth', 'react'], testHelpers.getOptions(this.test.testData, { adminAuth: { sessionLength: 1 } }));
    await testHelpers.installTables(support);
    await support.bootstrap({ 'adminAuth-email': 'test@example.com', 'adminAuth-password': '12345' });

    const app = express();
    app.use(express.json());
    support.middleware(app);
    const supportRouters = support.getRouters(app);
    app.use('/api/admin/auth', supportRouters.adminAuth.auth);
    app.use('/api/admin/user', supportRouters.adminAuth.user);
    app.use('/api/admin/custom', testHelpers.basicRoute);
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

    await testHelpers.sleep(300);

    const check2 = await request(app)
      .post('/api/admin/custom')
      .set('Accept', 'application/json')
      .send({ session: session });
    chai.expect(check2.status).to.be.eql(200);

    await testHelpers.sleep(800);

    const check3 = await request(app)
      .post('/api/admin/custom')
      .set('Accept', 'application/json')
      .send({ session: session });
    chai.expect(check3.status).to.be.eql(200);

    await testHelpers.sleep(1500);

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
    // const emailPromise = waitForOneEmail(maildev);

    support.init(['adminAuth', 'react'], testHelpers.getOptions(this.test.testData));
    await testHelpers.installTables(support);
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

    // const email = await emailPromise;

    chai.expect(res.status).to.be.eql(200);
    chai.expect(res.headers).to.have.property('content-type');
    chai.expect(res.headers['content-type']).to.match(/json/);
    chai.expect(res.body).to.have.property('code');
    chai.expect(res.body.code).to.be.eql('SUCCESS');
    chai.expect(res.body).to.have.property('data');
    chai.expect(res.body.data).to.have.property('sent');
    chai.expect(res.body.data.sent).to.be.eql(true);

  });

  // it should allow through reset attempts
  it('should allow through reset attempts', async function() {

    support.init(['adminAuth', 'react'], testHelpers.getOptions(this.test.testData));
    await testHelpers.installTables(support);
    await support.bootstrap({ 'adminAuth-email': 'test@example.com', 'adminAuth-password': '12345' });

    const app = express();
    app.use(express.json());
    support.middleware(app);
    const supportRouters = support.getRouters(app);
    app.use('/api/admin/auth', supportRouters.adminAuth.auth);
    app.use('/api/admin/user', supportRouters.adminAuth.user);
    support.handlers(app);

    const res = await request(app)
      .post('/api/admin/auth/reset')
      .set('Accept', 'application/json')
      .send({ email: 'test@example.com', token: '12345abcde' });

    chai.expect(res.status).to.be.eql(403);
    chai.expect(res.headers).to.have.property('content-type');
    chai.expect(res.headers['content-type']).to.match(/json/);
    chai.expect(res.body).to.have.property('code');
    chai.expect(res.body.code).to.be.eql('TOKEN_INVALID');
    chai.expect(res.body).to.have.property('msg');
    chai.expect(res.body.msg).to.be.eql('Token is invalid');

  });

  // TODO: it should perform a password reset with a valid token
  // TODO: it should reject a password reset attempt with an expired token

  // TODO: the user routes should not appear if turned off
  // TODO: the user should be able to update personal info
  // TODO: the user should be able to update their password
  // TODO: list of users should be available
  // TODO: list of users should include disabled if requested
  // TODO: list of users should include extra fields
  // TODO: list of sessions should not be available if not turned on
  // TODO: list of sessions should be available if turned on
  // TODO: should be able to create a user
  // TODO: should be able to create a user with extra fields
  // TODO: should be able to disable a user
  // TODO: should be able to re-enable a user

});
