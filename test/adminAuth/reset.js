const express = require('express');
const chai = require('chai');
const request = require('supertest');
const { decode } = require('html-entities');

const NEEDS = {
  database: true,
  mailer: true
};

describe('Reset password loop', () => {

  it('should reject a forgot-password request with no email address', async function() {

    const support = this.test.helper.initSupport(['adminAuth', 'react'], NEEDS);
    await this.test.helper.installTables();
    await this.test.helper.bootstrapUser('test@example.com', '12345');

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
      .send({});

    chai.expect(res.status).to.be.eql(400);
    chai.expect(res.headers).to.have.property('content-type');
    chai.expect(res.headers['content-type']).to.match(/json/);
    chai.expect(res.body).to.have.property('code');
    chai.expect(res.body.code).to.be.eql('EMAIL_REQUIRED');
    chai.expect(res.body).to.have.property('msg');
    chai.expect(res.body.msg).to.be.eql('Email is required');

  });

  it('should reject a forgot-password request with an unknown user', async function() {

    const support = this.test.helper.initSupport(['adminAuth', 'react'], NEEDS);
    await this.test.helper.installTables();
    await this.test.helper.bootstrapUser('test@example.com', '12345');

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
      .send({ email: 'test2@example.com' });

    chai.expect(res.status).to.be.eql(403);
    chai.expect(res.headers).to.have.property('content-type');
    chai.expect(res.headers['content-type']).to.match(/json/);
    chai.expect(res.body).to.have.property('code');
    chai.expect(res.body.code).to.be.eql('EMAIL_NOT_FOUND');
    chai.expect(res.body).to.have.property('msg');
    chai.expect(res.body.msg).to.be.eql('No such user exists');

  });

  it('should reject a forgot-password request with a disabled user', async function() {

    const support = this.test.helper.initSupport(['adminAuth', 'react'], NEEDS);
    await this.test.helper.installTables();
    await this.test.helper.bootstrapUser('test@example.com', '12345');

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

    const create = await request(app)
      .post('/api/admin/user/create')
      .set('Accept', 'application/json')
      .send({ session: session, email: 'test2@example.com', password: '67890' });
    chai.expect(create.status).to.be.eql(200);
    chai.expect(create.body).to.have.property('data');
    chai.expect(create.body.data).to.have.property('uid');
    const uid = create.body.data.uid;

    const disable = await request(app)
      .post('/api/admin/user/disable/' + uid)
      .set('Accept', 'application/json')
      .send({ session: session });
    chai.expect(disable.status).to.be.eql(200);

    const res = await request(app)
      .post('/api/admin/auth/forgot')
      .set('Accept', 'application/json')
      .send({ email: 'test2@example.com' });

    chai.expect(res.status).to.be.eql(403);
    chai.expect(res.headers).to.have.property('content-type');
    chai.expect(res.headers['content-type']).to.match(/json/);
    chai.expect(res.body).to.have.property('code');
    chai.expect(res.body.code).to.be.eql('EMAIL_NOT_FOUND');
    chai.expect(res.body).to.have.property('msg');
    chai.expect(res.body.msg).to.be.eql('No such user exists');

  });

  it('should reject a password reset with no email address', async function() {

    const support = this.test.helper.initSupport(['adminAuth', 'react'], NEEDS);
    await this.test.helper.installTables();
    await this.test.helper.bootstrapUser('test@example.com', '12345');

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
      .send({});

    chai.expect(res.status).to.be.eql(400);
    chai.expect(res.headers).to.have.property('content-type');
    chai.expect(res.headers['content-type']).to.match(/json/);
    chai.expect(res.body).to.have.property('code');
    chai.expect(res.body.code).to.be.eql('EMAIL_REQUIRED');
    chai.expect(res.body).to.have.property('msg');
    chai.expect(res.body.msg).to.be.eql('Email is required');

  });

  it('should reject a password reset with no token', async function() {

    const support = this.test.helper.initSupport(['adminAuth', 'react'], NEEDS);
    await this.test.helper.installTables();
    await this.test.helper.bootstrapUser('test@example.com', '12345');

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
      .send({ email: 'test@example.com' });

    chai.expect(res.status).to.be.eql(400);
    chai.expect(res.headers).to.have.property('content-type');
    chai.expect(res.headers['content-type']).to.match(/json/);
    chai.expect(res.body).to.have.property('code');
    chai.expect(res.body.code).to.be.eql('RESET_TOKEN_REQUIRED');
    chai.expect(res.body).to.have.property('msg');
    chai.expect(res.body.msg).to.be.eql('Reset token is required');

  });

  it('should reject a password reset attempt with a user who doesn\'t exist', async function() {

    // NB: We need the dev part of the response to distinguish between no
    // session and invalid token, which we care about internally but don't
    // want to actually send to the end user in production

    const support = this.test.helper.initSupport(['adminAuth', 'react'], NEEDS, { system: { environment: 'development' } });
    await this.test.helper.installTables();
    await this.test.helper.bootstrapUser('test@example.com', '12345');

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
      .send({ email: 'test2@example.com', token: 'not-a-real-token-but-should-not-check-anyway', password: 'abcdef' });

    chai.expect(res.status).to.be.eql(403);
    chai.expect(res.headers).to.have.property('content-type');
    chai.expect(res.headers['content-type']).to.match(/json/);
    chai.expect(res.body).to.have.property('code');
    chai.expect(res.body.code).to.be.eql('TOKEN_INVALID');
    chai.expect(res.body).to.have.property('msg');
    chai.expect(res.body.msg).to.be.eql('Token is invalid');
    chai.expect(res.body).to.have.property('dev');
    chai.expect(res.body.dev).to.be.eql('No unexpired tokens for this user');

  });

  it('should reject a password reset attempt with a user who didn\'t request one', async function() {

    // NB: We need the dev part of the response to distinguish between no
    // session and invalid token, which we care about internally but don't
    // want to actually send to the end user in production

    const support = this.test.helper.initSupport(['adminAuth', 'react'], NEEDS, { system: { environment: 'development' } });
    await this.test.helper.installTables();
    await this.test.helper.bootstrapUser('test@example.com', '12345');

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

    const userEmail = 'test2@example.com';
    const create = await request(app)
      .post('/api/admin/user/create')
      .set('Accept', 'application/json')
      .send({ session: session, email: userEmail, password: '67890' });
    chai.expect(create.status).to.be.eql(200);

    const res = await request(app)
      .post('/api/admin/auth/reset')
      .set('Accept', 'application/json')
      .send({ email: userEmail, token: 'not-a-real-token-but-should-not-check-anyway', password: 'abcdef' });

    chai.expect(res.status).to.be.eql(403);
    chai.expect(res.headers).to.have.property('content-type');
    chai.expect(res.headers['content-type']).to.match(/json/);
    chai.expect(res.body).to.have.property('code');
    chai.expect(res.body.code).to.be.eql('TOKEN_INVALID');
    chai.expect(res.body).to.have.property('msg');
    chai.expect(res.body.msg).to.be.eql('Token is invalid');
    chai.expect(res.body).to.have.property('dev');
    chai.expect(res.body.dev).to.be.eql('No unexpired tokens for this user');

  });

  it('should reject a password reset attempt with a valid user and invalid token', async function() {

    // NB: We need the dev part of the response to distinguish between no
    // session and invalid token, which we care about internally but don't
    // want to actually send to the end user in production

    const support = this.test.helper.initSupport(['adminAuth', 'react'], NEEDS, { system: { environment: 'development' } });
    await this.test.helper.installTables();
    await this.test.helper.bootstrapUser('test@example.com', '12345');

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

    const userEmail = 'test2@example.com';
    const create = await request(app)
      .post('/api/admin/user/create')
      .set('Accept', 'application/json')
      .send({ session: session, email: userEmail, password: '67890' });
    chai.expect(create.status).to.be.eql(200);
    chai.expect(create.body).to.have.property('data');
    chai.expect(create.body.data).to.have.property('uid');
    const uid = create.body.data.uid;

    // adds the email on-receive listener as a single-use promise for the one we expect to be sent during the forget request
    const forgotEmailPromise = this.test.helper.waitForOneEmail();

    const forgot = await request(app)
      .post('/api/admin/auth/forgot')
      .set('Accept', 'application/json')
      .send({ email: userEmail });

    chai.expect(forgot.status).to.be.eql(200);
    chai.expect(forgot.headers).to.have.property('content-type');
    chai.expect(forgot.headers['content-type']).to.match(/json/);
    chai.expect(forgot.body).to.have.property('code');
    chai.expect(forgot.body.code).to.be.eql('SUCCESS');
    chai.expect(forgot.body).to.have.property('data');
    chai.expect(forgot.body.data).to.have.property('sent');
    chai.expect(forgot.body.data.sent).to.be.eql(true);

    // We sent the email with html- and json-encoded debug data that we can then parse
    // (see test/data/templates/resetpw/text.handlebars)
    const email = await forgotEmailPromise;
    let data = JSON.parse(decode(email.text));

    chai.expect(data).to.have.property('email');
    chai.expect(data.email).to.be.eql(userEmail);
    chai.expect(data).to.have.property('user');
    chai.expect(data.user).to.have.property('uid');
    chai.expect(data.user.uid).to.be.eql(uid);
    chai.expect(data).to.have.property('token');
    const token = data.token;
    chai.expect(data).to.have.property('link');
    chai.expect(data.link).to.be.eql(`http://localhost:3000/reset?email=${userEmail}&token=${token}`);

    // Use the token we got to reset the password
    const res = await request(app)
      .post('/api/admin/auth/reset')
      .set('Accept', 'application/json')
      .send({ email: userEmail, token: 'not-a-real-token', password: 'abcdef' });

    chai.expect(res.status).to.be.eql(403);
    chai.expect(res.headers).to.have.property('content-type');
    chai.expect(res.headers['content-type']).to.match(/json/);
    chai.expect(res.body).to.have.property('code');
    chai.expect(res.body.code).to.be.eql('TOKEN_INVALID');
    chai.expect(res.body).to.have.property('msg');
    chai.expect(res.body.msg).to.be.eql('Token is invalid');
    chai.expect(res.body).to.have.property('dev');
    chai.expect(res.body.dev).to.be.eql('Token does not match');

  });

  it('should reject a password reset with a valid user and expired token', async function() {

    // we need to run out the reset token lifetime (min length 1s)
    this.timeout(3000);

    // NB: We need the dev part of the response to distinguish between no
    // session and invalid token, which we care about internally but don't
    // want to actually send to the end user in production

    const support = this.test.helper.initSupport(['adminAuth', 'react'], NEEDS, { adminAuth: { 'resetTokenLifetime': 1 }, system: { environment: 'development' } });
    await this.test.helper.installTables();
    await this.test.helper.bootstrapUser('test@example.com', '12345');

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

    const userEmail = 'test2@example.com';
    const create = await request(app)
      .post('/api/admin/user/create')
      .set('Accept', 'application/json')
      .send({ session: session, email: userEmail, password: '67890' });
    chai.expect(create.status).to.be.eql(200);
    chai.expect(create.body).to.have.property('data');
    chai.expect(create.body.data).to.have.property('uid');
    const uid = create.body.data.uid;

    // adds the email on-receive listener as a single-use promise for the one we expect to be sent during the forget request
    const forgotEmailPromise = this.test.helper.waitForOneEmail();

    const forgot = await request(app)
      .post('/api/admin/auth/forgot')
      .set('Accept', 'application/json')
      .send({ email: userEmail });

    chai.expect(forgot.status).to.be.eql(200);
    chai.expect(forgot.headers).to.have.property('content-type');
    chai.expect(forgot.headers['content-type']).to.match(/json/);
    chai.expect(forgot.body).to.have.property('code');
    chai.expect(forgot.body.code).to.be.eql('SUCCESS');
    chai.expect(forgot.body).to.have.property('data');
    chai.expect(forgot.body.data).to.have.property('sent');
    chai.expect(forgot.body.data.sent).to.be.eql(true);

    // We sent the email with html- and json-encoded debug data that we can then parse
    // (see test/data/templates/resetpw/text.handlebars)
    const email = await forgotEmailPromise;
    let data = JSON.parse(decode(email.text));

    chai.expect(data).to.have.property('email');
    chai.expect(data.email).to.be.eql(userEmail);
    chai.expect(data).to.have.property('user');
    chai.expect(data.user).to.have.property('uid');
    chai.expect(data.user.uid).to.be.eql(uid);
    chai.expect(data).to.have.property('token');
    const token = data.token;
    chai.expect(data).to.have.property('link');
    chai.expect(data.link).to.be.eql(`http://localhost:3000/reset?email=${userEmail}&token=${token}`);

    // Wait for the session to expire
    await this.test.helper.sleep(1500);

    // Then attempt to use the token
    const newPassword = 'abcdef';
    const res = await request(app)
      .post('/api/admin/auth/reset')
      .set('Accept', 'application/json')
      .send({ email: userEmail, token: token, password: newPassword });

    chai.expect(res.status).to.be.eql(403);
    chai.expect(res.headers).to.have.property('content-type');
    chai.expect(res.headers['content-type']).to.match(/json/);
    chai.expect(res.body).to.have.property('code');
    chai.expect(res.body.code).to.be.eql('TOKEN_INVALID');
    chai.expect(res.body).to.have.property('msg');
    chai.expect(res.body.msg).to.be.eql('Token is invalid');
    chai.expect(res.body).to.have.property('dev');
    chai.expect(res.body.dev).to.be.eql('No unexpired tokens for this user');

  });

  it('should perform a password reset with a valid user and token', async function() {

    const support = this.test.helper.initSupport(['adminAuth', 'react'], NEEDS);
    await this.test.helper.installTables();
    await this.test.helper.bootstrapUser('test@example.com', '12345');

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

    const userEmail = 'test2@example.com';
    const create = await request(app)
      .post('/api/admin/user/create')
      .set('Accept', 'application/json')
      .send({ session: session, email: userEmail, password: '67890' });
    chai.expect(create.status).to.be.eql(200);
    chai.expect(create.body).to.have.property('data');
    chai.expect(create.body.data).to.have.property('uid');
    const uid = create.body.data.uid;

    // adds the email on-receive listener as a single-use promise for the one we expect to be sent during the forget request
    const forgotEmailPromise = this.test.helper.waitForOneEmail();

    const forgot = await request(app)
      .post('/api/admin/auth/forgot')
      .set('Accept', 'application/json')
      .send({ email: userEmail });

    chai.expect(forgot.status).to.be.eql(200);
    chai.expect(forgot.headers).to.have.property('content-type');
    chai.expect(forgot.headers['content-type']).to.match(/json/);
    chai.expect(forgot.body).to.have.property('code');
    chai.expect(forgot.body.code).to.be.eql('SUCCESS');
    chai.expect(forgot.body).to.have.property('data');
    chai.expect(forgot.body.data).to.have.property('sent');
    chai.expect(forgot.body.data.sent).to.be.eql(true);

    // We sent the email with html- and json-encoded debug data that we can then parse
    // (see test/data/templates/resetpw/text.handlebars)
    const email = await forgotEmailPromise;
    let data = JSON.parse(decode(email.text));

    chai.expect(data).to.have.property('email');
    chai.expect(data.email).to.be.eql(userEmail);
    chai.expect(data).to.have.property('user');
    chai.expect(data.user).to.have.property('uid');
    chai.expect(data.user.uid).to.be.eql(uid);
    chai.expect(data).to.have.property('token');
    const token = data.token;
    chai.expect(data).to.have.property('link');
    chai.expect(data.link).to.be.eql(`http://localhost:3000/reset?email=${userEmail}&token=${token}`);

    // Use the token we got to reset the password
    const newPassword = 'abcdef';
    const reset = await request(app)
      .post('/api/admin/auth/reset')
      .set('Accept', 'application/json')
      .send({ email: userEmail, token: token, password: newPassword });

    chai.expect(reset.status).to.be.eql(200);
    chai.expect(reset.headers).to.have.property('content-type');
    chai.expect(reset.headers['content-type']).to.match(/json/);
    chai.expect(reset.body).to.have.property('code');
    chai.expect(reset.body.code).to.be.eql('SUCCESS');
    chai.expect(reset.body).to.have.property('data');
    chai.expect(reset.body.data).to.have.property('updated');
    chai.expect(reset.body.data.updated).to.be.eql(true);

    // Attempt a login with the new password
    const check = await request(app)
      .post('/api/admin/auth/login')
      .set('Accept', 'application/json')
      .send({ email: userEmail, password: newPassword });
    chai.expect(check.status).to.be.eql(200);

  });

  it('it should send an error when the mailer can\'t run', async function() {

    // fake port = cannot access MailDev
    const support = this.test.helper.initSupport(['adminAuth', 'react'], NEEDS, { mailer: { port: 9999 } });
    await this.test.helper.installTables();
    await this.test.helper.bootstrapUser('test@example.com', '12345');

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

    const userEmail = 'test2@example.com';
    const create = await request(app)
      .post('/api/admin/user/create')
      .set('Accept', 'application/json')
      .send({ session: session, email: userEmail, password: '67890' });
    chai.expect(create.status).to.be.eql(200);
    chai.expect(create.body).to.have.property('data');
    chai.expect(create.body.data).to.have.property('uid');

    const res = await request(app)
      .post('/api/admin/auth/forgot')
      .set('Accept', 'application/json')
      .send({ email: userEmail });

    chai.expect(res.status).to.be.eql(500);
    chai.expect(res.headers).to.have.property('content-type');
    chai.expect(res.headers['content-type']).to.match(/json/);
    chai.expect(res.body).to.have.property('code');
    chai.expect(res.body.code).to.be.eql('MAIL_NOT_SENT');
    chai.expect(res.body).to.have.property('msg');
    chai.expect(res.body.msg).to.be.eql('Mail send failed');

  });

  // TODO
  it('it should reject a password reset attempt with an invalid token');
  // TODO
  it('it should reject a password reset attempt with an expired token');
  // TODO
  it('it should reject a password reset attempt with a deleted token');

});

