const chai = require('chai');

const NEEDS = {
  database: true,
  mailer: true
};

describe('Bootstrapping', () => {

  it('should bootstrap a root user', async function() {

    const support = this.test.helper.initSupport(['adminAuth', 'react'], NEEDS);
    await this.test.helper.installTables();

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

    const support = this.test.helper.initSupport(['adminAuth', 'react'], NEEDS);
    await this.test.helper.installTables();

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

    const support = this.test.helper.initSupport(['adminAuth', 'react'], NEEDS, { adminAuth: {
      userFields: [
        { key: 'first', column: 'first_name', pgtype: 'text' },
        { key: 'last', column: 'last_name', pgtype: 'text' },
        { key: 'access', column: 'access_level', pgtype: 'integer' }
      ]
    } });
    await this.test.helper.installTables();

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

