const express = require('express');
const chai = require('chai');
const request = require('supertest');

const NEEDS = {
  database: true,
  mailer: true
};

describe('Route restrictions', () => {

  it('should allow through non-admin routes', async function() {

    const app = express();
    const support = this.test.helper.initSupport(['adminAuth', 'react'], NEEDS);
    app.use(express.json());
    support.middleware(app);
    const supportRouters = support.getRouters(app);
    app.use('/api/admin/auth', supportRouters.adminAuth.auth);
    app.use('/api/admin/user', supportRouters.adminAuth.user);
    app.use('/api/custom', this.test.helper.basicRoute);
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
    const support = this.test.helper.initSupport(['adminAuth', 'react'], NEEDS);
    app.use(express.json());
    support.middleware(app);
    const supportRouters = support.getRouters(app);
    app.use('/api/admin/auth', supportRouters.adminAuth.auth);
    app.use('/api/admin/user', supportRouters.adminAuth.user);
    support.handlers(app);

    const res = await request(app)
      .post('/api/admin/auth/check')
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
    const support = this.test.helper.initSupport(['adminAuth', 'react'], NEEDS);
    app.use(express.json());
    support.middleware(app);
    const supportRouters = support.getRouters(app);
    app.use('/api/admin/auth', supportRouters.adminAuth.auth);
    app.use('/api/admin/user', supportRouters.adminAuth.user);
    support.handlers(app);

    const res = await request(app)
      .post('/api/admin/auth/check')
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

    const support = this.test.helper.initSupport(['adminAuth', 'react'], NEEDS);
    await this.test.helper.installTables();

    const app = express();
    app.use(express.json());
    support.middleware(app);
    const supportRouters = support.getRouters(app);
    app.use('/api/admin/auth', supportRouters.adminAuth.auth);
    app.use('/api/admin/user', supportRouters.adminAuth.user);
    support.handlers(app);

    const res = await request(app)
      .post('/api/admin/auth/check')
      .set('Accept', 'application/json')
      .send({ session: { sid: 'fake-session-id', uid: 'fake-user-id', token: 'fake-token' } });

    chai.expect(res.status).to.be.eql(403);
    chai.expect(res.headers).to.have.property('content-type');
    chai.expect(res.headers['content-type']).to.match(/json/);
    chai.expect(res.body.code).to.be.eql('TOKEN_INVALID');
    chai.expect(res.body.msg).to.be.eql('Invalid session');

  });

  it('should work with a table prefix', async function() {

    const support = this.test.helper.initSupport(['adminAuth', 'react'], NEEDS, { adminAuth: { tablePrefix: 'pfx_' } });
    await this.test.helper.installTables('pfx_admin_users');

    const app = express();
    app.use(express.json());
    support.middleware(app);
    const supportRouters = support.getRouters(app);
    app.use('/api/admin/auth', supportRouters.adminAuth.auth);
    app.use('/api/admin/user', supportRouters.adminAuth.user);
    support.handlers(app);

    const res = await request(app)
      .post('/api/admin/auth/check')
      .set('Accept', 'application/json')
      .send({ session: { sid: 'fake-session-id', uid: 'fake-user-id', token: 'fake-token' } });

    chai.expect(res.status).to.be.eql(403);
    chai.expect(res.headers).to.have.property('content-type');
    chai.expect(res.headers['content-type']).to.match(/json/);
    chai.expect(res.body.code).to.be.eql('TOKEN_INVALID');
    chai.expect(res.body.msg).to.be.eql('Invalid session');

  });

  it('should allow through forgot requests', async function() {

    const support = this.test.helper.initSupport(['adminAuth', 'react'], NEEDS);
    await this.test.helper.installTables();

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

    chai.expect(res.status).to.be.eql(403);
    chai.expect(res.headers).to.have.property('content-type');
    chai.expect(res.headers['content-type']).to.match(/json/);
    chai.expect(res.body).to.have.property('code');
    chai.expect(res.body.code).to.be.eql('EMAIL_NOT_FOUND');
    chai.expect(res.body).to.have.property('msg');
    chai.expect(res.body.msg).to.be.eql('No such user exists');

  });

  // it should allow through reset attempts
  it('should allow through reset attempts', async function() {

    const support = this.test.helper.initSupport(['adminAuth', 'react'], NEEDS);
    await this.test.helper.installTables();
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

});

