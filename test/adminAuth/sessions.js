const express = require('express');
const chai = require('chai');
const request = require('supertest');

const TestHelper = require('../common');

const helper = new TestHelper()
  .needsDatabase(true)
  .usesFreshDatabases({
    allTests: true
  })
  .needsMailer(true);

describe('Login and sessions', () => {

  let blockData = {};
  before(async function() {
    await helper.beforeBlock(blockData, this.test.parent.title);
  });
  after(async function() {
    await helper.afterBlock(blockData, this.test.parent.title);
  });
  beforeEach(async function () {
    if (!('testData' in this.currentTest)) {
      this.currentTest.testData = {};
    }
    this.currentTest.testData = await helper.beforeTest({}, this.currentTest.title);
  });
  afterEach(async function () {
    this.timeout(120000);
    this.currentTest.testData = await helper.afterTest(this.currentTest.testData, this.currentTest.title);
  });

  it('should reject a request with no email address', async function() {

    const support = helper.initSupport(['adminAuth', 'react'], this.test.testData);
    await helper.installTables();

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
      .send({});

    chai.expect(res.status).to.be.eql(400);
    chai.expect(res.headers).to.have.property('content-type');
    chai.expect(res.headers['content-type']).to.match(/json/);
    chai.expect(res.body.code).to.be.eql('EMAIL_REQUIRED');
    chai.expect(res.body.msg).to.be.eql('Email is required');

  });

  it('should reject a request with no password', async function() {

    const support = helper.initSupport(['adminAuth', 'react'], this.test.testData);
    await helper.installTables();

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
      .send({ email: 'test@example.com' });

    chai.expect(res.status).to.be.eql(400);
    chai.expect(res.headers).to.have.property('content-type');
    chai.expect(res.headers['content-type']).to.match(/json/);
    chai.expect(res.body.code).to.be.eql('PASSWORD_REQUIRED');
    chai.expect(res.body.msg).to.be.eql('Password is required');

  });

  it('should reject a missing user', async function() {

    const support = helper.initSupport(['adminAuth', 'react'], this.test.testData);
    await helper.installTables();

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

    const support = helper.initSupport(['adminAuth', 'react'], this.test.testData);
    await helper.installTables();
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

    const support = helper.initSupport(['adminAuth', 'react'], this.test.testData);
    await helper.installTables();
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

    const support = helper.initSupport(['adminAuth', 'react'], this.test.testData);
    await helper.installTables();
    await support.bootstrap({ 'adminAuth-email': 'test@example.com', 'adminAuth-password': '12345' });

    const app = express();
    app.use(express.json());
    support.middleware(app);
    const supportRouters = support.getRouters(app);
    app.use('/api/admin/auth', supportRouters.adminAuth.auth);
    app.use('/api/admin/user', supportRouters.adminAuth.user);
    support.handlers(app);

    const login = await request(app)
      .post('/api/admin/auth/login')
      .set('Accept', 'application/json')
      .send({ email: 'test@example.com', password: '12345' });
    chai.expect(login.status).to.be.eql(200);
    const session = login.body.data.session;

    const res = await request(app)
      .post('/api/admin/auth/check')
      .set('Accept', 'application/json')
      .send({ session: session });

    chai.expect(res.status).to.be.eql(200);
    chai.expect(res.headers).to.have.property('content-type');
    chai.expect(res.headers['content-type']).to.match(/json/);
    chai.expect(res.body).to.have.property('data');
    chai.expect(res.body.data).to.have.property('valid');
    chai.expect(res.body.data.valid).to.be.eql(true);

  });

  it('should reject a timed-out session', async function() {

    // we need to run out the session (min length 1s)
    this.timeout(3000);

    const support = helper.initSupport(['adminAuth', 'react'], this.test.testData, { adminAuth: { sessionLength: 1 } });
    await helper.installTables();
    await support.bootstrap({ 'adminAuth-email': 'test@example.com', 'adminAuth-password': '12345' });

    const app = express();
    app.use(express.json());
    support.middleware(app);
    const supportRouters = support.getRouters(app);
    app.use('/api/admin/auth', supportRouters.adminAuth.auth);
    app.use('/api/admin/user', supportRouters.adminAuth.user);
    support.handlers(app);

    const login = await request(app)
      .post('/api/admin/auth/login')
      .set('Accept', 'application/json')
      .send({ email: 'test@example.com', password: '12345' });
    chai.expect(login.status).to.be.eql(200);
    const session = login.body.data.session;

    const check = await request(app)
      .post('/api/admin/auth/check')
      .set('Accept', 'application/json')
      .send({ session: session });
    chai.expect(check.status).to.be.eql(200);

    await helper.sleep(1500);

    const res = await request(app)
      .post('/api/admin/auth/check')
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

    const support = helper.initSupport(['adminAuth', 'react'], this.test.testData, { adminAuth: { sessionLength: 1 } });
    await helper.installTables();
    await support.bootstrap({ 'adminAuth-email': 'test@example.com', 'adminAuth-password': '12345' });

    const app = express();
    app.use(express.json());
    support.middleware(app);
    const supportRouters = support.getRouters(app);
    app.use('/api/admin/auth', supportRouters.adminAuth.auth);
    app.use('/api/admin/user', supportRouters.adminAuth.user);
    support.handlers(app);

    const login = await request(app)
      .post('/api/admin/auth/login')
      .set('Accept', 'application/json')
      .send({ email: 'test@example.com', password: '12345' });
    chai.expect(login.status).to.be.eql(200);
    const session = login.body.data.session;

    const check1 = await request(app)
      .post('/api/admin/auth/check')
      .set('Accept', 'application/json')
      .send({ session: session });
    chai.expect(check1.status).to.be.eql(200);

    await helper.sleep(300);

    const check2 = await request(app)
      .post('/api/admin/auth/check')
      .set('Accept', 'application/json')
      .send({ session: session });
    chai.expect(check2.status).to.be.eql(200);

    await helper.sleep(800);

    const check3 = await request(app)
      .post('/api/admin/auth/check')
      .set('Accept', 'application/json')
      .send({ session: session });
    chai.expect(check3.status).to.be.eql(200);

    await helper.sleep(1500);

    const check4 = await request(app)
      .post('/api/admin/auth/check')
      .set('Accept', 'application/json')
      .send({ session: session });
    chai.expect(check4.status).to.be.eql(403);
    chai.expect(check4.headers).to.have.property('content-type');
    chai.expect(check4.headers['content-type']).to.match(/json/);
    chai.expect(check4.body.code).to.be.eql('TOKEN_INVALID');
    chai.expect(check4.body.msg).to.be.eql('Invalid session');

  });

  it('should reject a logout request with no session', async function() {

    const support = helper.initSupport(['adminAuth', 'react'], this.test.testData);
    await helper.installTables();

    const app = express();
    app.use(express.json());
    support.middleware(app);
    const supportRouters = support.getRouters(app);
    app.use('/api/admin/auth', supportRouters.adminAuth.auth);
    app.use('/api/admin/user', supportRouters.adminAuth.user);
    support.handlers(app);

    const res = await request(app)
      .post('/api/admin/auth/logout')
      .set('Accept', 'application/json')
      .send({});
    chai.expect(res.status).to.be.eql(400);
    chai.expect(res.headers).to.have.property('content-type');
    chai.expect(res.headers['content-type']).to.match(/json/);
    chai.expect(res.body.code).to.be.eql('SESSION_REQUIRED');
    chai.expect(res.body.msg).to.be.eql('Session is required');

  });

  it('should reject a logout request with an invalid session', async function() {

    const support = helper.initSupport(['adminAuth', 'react'], this.test.testData);
    await helper.installTables();
    await support.bootstrap({ 'adminAuth-email': 'test@example.com', 'adminAuth-password': '12345' });

    const app = express();
    app.use(express.json());
    support.middleware(app);
    const supportRouters = support.getRouters(app);
    app.use('/api/admin/auth', supportRouters.adminAuth.auth);
    app.use('/api/admin/user', supportRouters.adminAuth.user);
    support.handlers(app);

    const login = await request(app)
      .post('/api/admin/auth/login')
      .set('Accept', 'application/json')
      .send({ email: 'test@example.com', password: '12345' });
    chai.expect(login.status).to.be.eql(200);
    const session = login.body.data.session;

    const res = await request(app)
      .post('/api/admin/auth/logout')
      .set('Accept', 'application/json')
      .send({ session: { ...session, sid: 'not-a-real-session-id' }});
    chai.expect(res.status).to.be.eql(400);
    chai.expect(res.headers).to.have.property('content-type');
    chai.expect(res.headers['content-type']).to.match(/json/);
    chai.expect(res.body.code).to.be.eql('SESSION_INVALID');
    chai.expect(res.body.msg).to.be.eql('Session is invalid');

  });

  it('should reject a logged-out session', async function() {

    const support = helper.initSupport(['adminAuth', 'react'], this.test.testData);
    await helper.installTables();
    await support.bootstrap({ 'adminAuth-email': 'test@example.com', 'adminAuth-password': '12345' });

    const app = express();
    app.use(express.json());
    support.middleware(app);
    const supportRouters = support.getRouters(app);
    app.use('/api/admin/auth', supportRouters.adminAuth.auth);
    app.use('/api/admin/user', supportRouters.adminAuth.user);
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
      .post('/api/admin/auth/check')
      .set('Accept', 'application/json')
      .send({ session: session });
    chai.expect(res.status).to.be.eql(403);
    chai.expect(res.headers).to.have.property('content-type');
    chai.expect(res.headers['content-type']).to.match(/json/);
    chai.expect(res.body.code).to.be.eql('TOKEN_INVALID');
    chai.expect(res.body.msg).to.be.eql('Invalid session');

  });

});

