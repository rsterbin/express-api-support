const express = require('express');
const chai = require('chai');
const request = require('supertest');

const NEED = {};

describe('Internals testing', () => {

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

  it('should work as expected when you pass config values via the environment', async function () {

    process.env.API_SITE_NAME = 'Test Site Name';

    const app = express();
    const support = this.test.helper.initSupport([], NEED);
    app.use(express.json());
    support.middleware(app);
    app.use('/api/some-endpoint', function(req, res) {
      res.status(200).json({ code: 'SUCCESS', data: { siteName: support.getContext('system').setting('siteName') } });
    });
    support.handlers(app);

    const res = await request(app).post('/api/some-endpoint').send({});

    chai.expect(res.status).to.be.eql(200);
    chai.expect(res.body).to.have.property('code');
    chai.expect(res.body).to.have.property('data');
    chai.expect(res.body.code).to.be.eql('SUCCESS');
    chai.expect(res.body.data).to.have.property('siteName');
    chai.expect(res.body.data.siteName).to.be.eql('Test Site Name');

  });

});

