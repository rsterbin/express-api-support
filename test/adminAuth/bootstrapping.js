var chai = require('chai');
var chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);

const NEEDS = {
  database: true,
  mailer: true
};

describe('Bootstrapping', () => {

  it('should bootstrap a root user', async function() {

    const support = this.test.helper.initSupport(['adminAuth', 'react'], NEEDS);
    await this.test.helper.installTables();

    const users = await this.test.helper.bootstrapUser('test@example.com', '12345');
    chai.expect(users.length).to.be.eql(1);
    chai.expect(users[0]).to.have.property('email');
    chai.expect(users[0].email).to.be.eql('test@example.com');

  });

  it('should reject bootstrapping a second user', async function() {

    const support = this.test.helper.initSupport(['adminAuth', 'react'], NEEDS);
    await this.test.helper.installTables();

    // first should work
    const users = await this.test.helper.bootstrapUser('test@example.com', '12345');

    // second should fail
    const errtype = support.getFeature('adminAuth').AdminAuthError;
    await chai.expect(this.test.helper.bootstrapUser('test2@example.com', '12345')).to.eventually
      .be.rejectedWith("[CANNOT_BOOTSTRAP] You cannot bootstrap the admin when there are already users")
      .and.be.an.instanceOf(errtype)
      .and.have.property('code', 'CANNOT_BOOTSTRAP');

    // test contents of user list
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

    const users = await this.test.helper.bootstrapUser('test@example.com', '12345', { 'first': 'Testy', 'last': 'McTest', 'access': 3 });
    chai.expect(users.length).to.be.eql(1);
    const user = users[0];

    chai.expect(user).to.have.property('email');
    chai.expect(user).to.have.property('first_name');
    chai.expect(user).to.have.property('last_name');
    chai.expect(user).to.have.property('access_level');
    chai.expect(user.email).to.be.eql('test@example.com');
    chai.expect(user.first_name).to.be.eql('Testy');
    chai.expect(user.last_name).to.be.eql('McTest');
    chai.expect(user.access_level).to.be.eql(3);

  });

  it('should bootstrap a user using a table prefix');

});

