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

describe('Bootstrapping', () => {

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

  it('should bootstrap a root user', async function() {

    const support = helper.initSupport(['adminAuth', 'react'], this.test.testData);
    await helper.installTables();

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

    const support = helper.initSupport(['adminAuth', 'react'], this.test.testData);
    await helper.installTables();

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

    const support = helper.initSupport(['adminAuth', 'react'], this.test.testData, { adminAuth: {
      userFields: [
        { key: 'first', column: 'first_name', pgtype: 'text' },
        { key: 'last', column: 'last_name', pgtype: 'text' },
        { key: 'access', column: 'access_level', pgtype: 'integer' }
      ]
    } });
    await helper.installTables();

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

});

