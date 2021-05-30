const express = require('express');
const chai = require('chai');
const request = require('supertest');

const NEED = {};

describe('Internals testing', () => {

  afterEach(function () {
    // delete the vars added to the environment for tests
    for (const newvar of ['API_SITE_NAME', 'ADMIN_AUTH_USER_FIELDS']) {
      if (newvar in process.env) {
        delete process.env[newvar];
      }
    }
  });

  it('should work as expected with no features added', async function () {

    const app = express();
    const support = this.test.helper.initSupport([], NEED);
    app.use(express.json());
    support.middleware(app);
    app.use('/api/some-endpoint', function(req, res) {
      res.status(200).json({ code: 'SUCCESS', msg: 'This route does nothing' });
    });
    support.handlers(app);

    const res = await request(app).post('/api/some-endpoint').send({});

    chai.expect(res.status).to.be.eql(200);
    chai.expect(res.body).to.have.property('code');
    chai.expect(res.body).to.have.property('msg');
    chai.expect(res.body.code).to.be.eql('SUCCESS');
    chai.expect(res.body.msg).to.be.eql('This route does nothing');

  });

  it('should pick up config values via the environment', async function () {

    process.env.API_SITE_NAME = 'Test Site Name';
    process.env.ADMIN_AUTH_USER_FIELDS = '[{"key":"testKey","column":"test_col","pgtype":"text"}]';

    const app = express();
    const support = this.test.helper.initSupport([ 'adminAuth' ], { ...NEED, database: true, mailer: true });
    app.use(express.json());
    support.middleware(app);
    app.use('/api/some-endpoint', function(req, res) {
      res.status(200).json({ code: 'SUCCESS', data: {
        siteName: support.getContext('system').setting('siteName'),
        userFields: support.getFeature('adminAuth').getConfigValue('userFields'),
      } });
    });
    support.handlers(app);

    const res = await request(app).post('/api/some-endpoint').send({});

    chai.expect(res.status).to.be.eql(200);
    chai.expect(res.body).to.have.property('code');
    chai.expect(res.body).to.have.property('data');
    chai.expect(res.body.code).to.be.eql('SUCCESS');
    chai.expect(res.body.data).to.have.property('siteName');
    chai.expect(res.body.data.siteName).to.be.eql('Test Site Name');
    chai.expect(res.body.data).to.have.property('userFields');
    chai.expect(res.body.data.userFields.length).to.be.eql(1);
    chai.expect(res.body.data.userFields[0]).to.have.property('key');
    chai.expect(res.body.data.userFields[0].key).to.be.eql('testKey');
    chai.expect(res.body.data.userFields[0]).to.have.property('column');
    chai.expect(res.body.data.userFields[0].column).to.be.eql('test_col');
    chai.expect(res.body.data.userFields[0]).to.have.property('pgtype');
    chai.expect(res.body.data.userFields[0].pgtype).to.be.eql('text');

  });

  it('should parse a custom config spec');

});

