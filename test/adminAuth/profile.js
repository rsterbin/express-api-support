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

describe('User profile changes', () => {

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

  it('the user routes should not appear if turned off', async function() {

    const support = helper.initSupport(['adminAuth', 'react'], this.test.testData, { adminAuth: { includeUserRoutes: false } });
    await helper.installTables();
    await support.bootstrap({ 'adminAuth-email': 'test@example.com', 'adminAuth-password': '12345' });

    const app = express();
    app.use(express.json());
    support.middleware(app);
    const supportRouters = support.getRouters(app);
    app.use('/api/admin/auth', supportRouters.adminAuth.auth);
    support.handlers(app);

    const login = await request(app)
      .post('/api/admin/auth/login')
      .set('Accept', 'application/json')
      .send({ email: 'test@example.com', password: '12345' });
    chai.expect(login.status).to.be.eql(200);
    const session = login.body.data.session;

    const check = await request(app)
      .post('/api/admin/user')
      .set('Accept', 'application/json')
      .send({ session: session });
    chai.expect(check.status).to.be.eql(404);
    chai.expect(check.headers).to.have.property('content-type');
    chai.expect(check.headers['content-type']).to.match(/json/);
    chai.expect(check.body.code).to.be.eql('UNEXPECTED');
    chai.expect(check.body.msg).to.be.eql('Endpoint not found');

  });


  // TODO: the user routes should not appear if turned off
  // TODO: the user should be able to update personal info
  // TODO: the user should be able to update their password

});

