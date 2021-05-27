const express = require('express');
const chai = require('chai');
const request = require('supertest');

const NEEDS = {
  database: true,
  mailer: true
};

describe('User management', () => {

  it('should not show a list of sessions when not requested', async function() {

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

    const check = await request(app)
      .post('/api/admin/auth/sessions')
      .set('Accept', 'application/json')
      .send({ session: session });
    chai.expect(check.status).to.be.eql(404);
    chai.expect(check.headers).to.have.property('content-type');
    chai.expect(check.headers['content-type']).to.match(/json/);
    chai.expect(check.body.code).to.be.eql('UNEXPECTED');
    chai.expect(check.body.msg).to.be.eql('Endpoint not found');

  });

  it('should show a list of sessions when requested', async function() {

    const support = this.test.helper.initSupport(['adminAuth', 'react'], NEEDS, { adminAuth: { allowSessionsListRoute: true } });
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

    const check = await request(app)
      .post('/api/admin/auth/sessions')
      .set('Accept', 'application/json')
      .send({ session: session });
    chai.expect(check.status).to.be.eql(200);
    chai.expect(check.headers).to.have.property('content-type');
    chai.expect(check.headers['content-type']).to.match(/json/);
    chai.expect(check.body).to.have.property('data');
    chai.expect(check.body.data).to.have.property('all');
    chai.expect(check.body.data.all).to.have.lengthOf(1);
    chai.expect(check.body.data.all[0]).to.have.property('email');
    chai.expect(check.body.data.all[0]).to.have.property('user_id');
    chai.expect(check.body.data.all[0]).to.have.property('session_id');
    chai.expect(check.body.data.all[0]).to.have.property('expires');
    chai.expect(check.body.data.all[0].email).to.be.eql('test@example.com');
    chai.expect(check.body.data.all[0].user_id).to.be.eql(session.uid);
    chai.expect(check.body.data.all[0].session_id).to.be.eql(session.sid);

  });


  // TODO
  it('should provide a list of users');
  // TODO
  it('should show a list of users with disabled if requested');
  // TODO
  it('should show a list of users with custom fields');
  // TODO
  it('should be able to create a user');
  // TODO
  it('should be able to create a user with extra fields');
  // TODO
  it('should be able to disable a user');
  // TODO
  it('should be able to re-enable a user');

});

