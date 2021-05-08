const express = require('express');
const chai = require('chai');
const request = require('supertest');
const pgtools = require('pgtools');
const crypto = require('crypto');

const support = require('../index');
const LocalConfig = require('./data/localConfig.json');

const basicOptions = function(dbName) {
  return  {
    database: { url: LocalConfig.database.urlBase + dbName },
    mailer: { templateDir: __dirname + '/data/templates' },
    react: { consoleLogErrors: false }
  };
};

const basicRoute = function(req, res) {
  if (typeof req.body !== 'object' || !('session' in req.body)) {
    res.status(400).json({ code: 'NOT_AUTHENTICATED', msg: 'You are not authenticated here' });
  } else {
    res.status(200).json({ code: 'SUCCESS', msg: 'This custom route is complete' });
  }
};

const installTables = async function(support) {
  try {
    const sql = support.generateSql();
    await support.context.database.query(sql);
    await support.context.database.query('select * from admin_users');
  } catch (e) {
    console.log('install or check failed: ', e);
  }
};

const DB_NAMES = {};

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
    support.init(['adminAuth', 'react'], basicOptions(this.test.dbName));
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
    support.init(['adminAuth', 'react'], basicOptions(this.test.dbName));
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
    support.init(['adminAuth', 'react'], basicOptions(this.test.dbName));
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

    support.init(['adminAuth', 'react'], basicOptions(this.test.dbName));
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

});
