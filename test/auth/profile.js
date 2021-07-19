const express = require('express');
const chai = require('chai');
const request = require('supertest');

const NEEDS = {
  database: true,
  mailer: true
};

describe('User profile changes', () => {

  it('should not show the user routes if turned off', async function() {

    const support = this.test.helper.initSupport(['auth', 'react'], NEEDS, { auth: { includeUserRoutes: false } });
    await this.test.helper.installTables();
    await this.test.helper.bootstrapUser('test@example.com', '12345');

    const app = express();
    app.use(express.json());
    support.middleware(app);
    const supportRouters = support.getRouters(app);
    app.use('/api/auth', supportRouters.auth.auth);
    support.handlers(app);

    const login = await request(app)
      .post('/api/auth/login')
      .set('Accept', 'application/json')
      .send({ email: 'test@example.com', password: '12345' });
    chai.expect(login.status).to.be.eql(200);
    const session = login.body.data.session;

    const check = await request(app)
      .post('/api/user')
      .set('Accept', 'application/json')
      .send({ session: session });
    chai.expect(check.status).to.be.eql(404);
    chai.expect(check.headers).to.have.property('content-type');
    chai.expect(check.headers['content-type']).to.match(/json/);
    chai.expect(check.body.code).to.be.eql('UNEXPECTED');
    chai.expect(check.body.msg).to.be.eql('Endpoint not found');

  });

  // TODO
  it('should allow the user to update their personal info');
  // TODO
  it('should allow the user to update their custom personal info');
  // TODO
  it('should allow the user to update their password');

});

