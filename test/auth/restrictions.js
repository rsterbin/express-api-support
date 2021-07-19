const express = require('express');
const chai = require('chai');
const request = require('supertest');

const NEEDS = {
  database: true,
  mailer: true
};

describe('Route restrictions', () => {

  it('should allow through non-restricted routes', async function() {

    const app = express();
    const support = this.test.helper.initSupport(['auth', 'react'], NEEDS, { auth: { 'matchSection': '/api/protected' } });
    app.use(express.json());
    support.middleware(app);
    const supportRouters = support.getRouters(app);
    app.use('/api/auth', supportRouters.auth.auth);
    app.use('/api/user', supportRouters.auth.user);
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
    const support = this.test.helper.initSupport(['auth', 'react'], NEEDS);
    app.use(express.json());
    support.middleware(app);
    const supportRouters = support.getRouters(app);
    app.use('/api/auth', supportRouters.auth.auth);
    app.use('/api/user', supportRouters.auth.user);
    support.handlers(app);

    const res = await request(app)
      .post('/api/auth/check')
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
    const support = this.test.helper.initSupport(['auth', 'react'], NEEDS);
    app.use(express.json());
    support.middleware(app);
    const supportRouters = support.getRouters(app);
    app.use('/api/auth', supportRouters.auth.auth);
    app.use('/api/user', supportRouters.auth.user);
    support.handlers(app);

    const res = await request(app)
      .post('/api/auth/check')
      .set('Accept', 'application/json')
      .send({ session: { sid: 'fake-session-id', uid: 'fake-user-id', token: 'fake-token' } });

    chai.expect(res.status).to.be.eql(500);
    chai.expect(res.headers).to.have.property('content-type');
    chai.expect(res.headers['content-type']).to.match(/json/);
    chai.expect(res.body).to.have.property('code');
    chai.expect(res.body).to.have.property('msg');
    chai.expect(res.body.code).to.be.eql('UNEXPECTED');
    chai.expect(res.body.msg).to.match(/relation "sessions" does not exist/);

  });

  it('should complain if the session is invalid', async function() {

    const support = this.test.helper.initSupport(['auth', 'react'], NEEDS);
    await this.test.helper.installTables();

    const app = express();
    app.use(express.json());
    support.middleware(app);
    const supportRouters = support.getRouters(app);
    app.use('/api/auth', supportRouters.auth.auth);
    app.use('/api/user', supportRouters.auth.user);
    support.handlers(app);

    const res = await request(app)
      .post('/api/auth/check')
      .set('Accept', 'application/json')
      .send({ session: { sid: 'fake-session-id', uid: 'fake-user-id', token: 'fake-token' } });

    chai.expect(res.status).to.be.eql(403);
    chai.expect(res.headers).to.have.property('content-type');
    chai.expect(res.headers['content-type']).to.match(/json/);
    chai.expect(res.body.code).to.be.eql('TOKEN_INVALID');
    chai.expect(res.body.msg).to.be.eql('Invalid session');

  });

  it('should work with a table prefix', async function() {

    const support = this.test.helper.initSupport(['auth', 'react'], NEEDS, { auth: { tablePrefix: 'pfx_' } });
    await this.test.helper.installTables('pfx_users');

    const app = express();
    app.use(express.json());
    support.middleware(app);
    const supportRouters = support.getRouters(app);
    app.use('/api/auth', supportRouters.auth.auth);
    app.use('/api/user', supportRouters.auth.user);
    support.handlers(app);

    const res = await request(app)
      .post('/api/auth/check')
      .set('Accept', 'application/json')
      .send({ session: { sid: 'fake-session-id', uid: 'fake-user-id', token: 'fake-token' } });

    chai.expect(res.status).to.be.eql(403);
    chai.expect(res.headers).to.have.property('content-type');
    chai.expect(res.headers['content-type']).to.match(/json/);
    chai.expect(res.body.code).to.be.eql('TOKEN_INVALID');
    chai.expect(res.body.msg).to.be.eql('Invalid session');

  });

  it('should allow through forgot requests', async function() {

    const support = this.test.helper.initSupport(['auth', 'react'], NEEDS);
    await this.test.helper.installTables();

    const app = express();
    app.use(express.json());
    support.middleware(app);
    const supportRouters = support.getRouters(app);
    app.use('/api/auth', supportRouters.auth.auth);
    app.use('/api/user', supportRouters.auth.user);
    support.handlers(app);

    const res = await request(app)
      .post('/api/auth/forgot')
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

    const support = this.test.helper.initSupport(['auth', 'react'], NEEDS);
    await this.test.helper.installTables();
    await this.test.helper.bootstrapUser('test@example.com', '12345');

    const app = express();
    app.use(express.json());
    support.middleware(app);
    const supportRouters = support.getRouters(app);
    app.use('/api/auth', supportRouters.auth.auth);
    app.use('/api/user', supportRouters.auth.user);
    support.handlers(app);

    const res = await request(app)
      .post('/api/auth/reset')
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

