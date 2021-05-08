const express = require('express');
const chai = require('chai');
const request = require('supertest');

const support = require('../index');

describe('CORS middleware restrictions', () => {

  afterEach(async function () {
    await support.destroy();
  });

  it('should reject requests with no origin header', async function () {

    const app = express();
    support.init(['cors']);
    app.use(express.json());
    support.middleware(app);
    app.use('/api/some-endpoint', function(req, res) {
      res.status(200).json({ code: 'SUCCESS', msg: 'This route does nothing' });
    });

    const res = await request(app).post('/api/some-endpoint').send({});

    chai.expect(res.status).to.be.eql(403);
    chai.expect(res.body).to.have.property('code');
    chai.expect(res.body).to.have.property('msg');
    chai.expect(res.body).to.not.have.property('origin');
    chai.expect(res.body.code).to.be.eql('CORS_AUTH_FAILED');
    chai.expect(res.body.msg).to.be.eql('Access is restricted');

  });

  it('should reject requests with the wrong origin header', async function () {

    const app = express();
    support.init(['cors']);
    app.use(express.json());
    support.middleware(app);
    app.use('/api/some-endpoint', function(req, res) {
      res.status(200).json({ code: 'SUCCESS', msg: 'This route does nothing' });
    });

    const res = await request(app).post('/api/some-endpoint').set('Origin', 'http://www.example.com').send({});

    chai.expect(res.status).to.be.eql(403);
    chai.expect(res.body).to.have.property('code');
    chai.expect(res.body).to.have.property('msg');
    chai.expect(res.body).to.have.property('origin');
    chai.expect(res.body.code).to.be.eql('CORS_AUTH_FAILED');
    chai.expect(res.body.msg).to.be.eql('Access is restricted');
    chai.expect(res.body.origin).to.be.eql('http://www.example.com');

  });

  it('should accept requests with the right origin header', async function () {

    const app = express();
    support.init(['cors']);
    app.use(express.json());
    support.middleware(app);
    app.use('/api/some-endpoint', function(req, res) {
      res.status(200).json({ code: 'SUCCESS', msg: 'This route does nothing' });
    });

    const res = await request(app).post('/api/some-endpoint').set('Origin', 'http://localhost:3000').send({});

    chai.expect(res.status).to.be.eql(200);
    chai.expect(res.body).to.have.property('code');
    chai.expect(res.body).to.have.property('msg');
    chai.expect(res.body.code).to.be.eql('SUCCESS');
    chai.expect(res.body.msg).to.be.eql('This route does nothing');

  });

  it('should reject requests with the wrong origin header when allowed origins are configured', async function () {

    const app = express();
    support.init(['cors'], { cors: {
      devOrigins: [ 'http://localhost:9000', 'http://localhost:9001' ],
      prodOrigins: [ 'https://testprod.example.com' ]
    } });
    app.use(express.json());
    support.middleware(app);
    app.use('/api/some-endpoint', function(req, res) {
      res.status(200).json({ code: 'SUCCESS', msg: 'This route does nothing' });
    });

    const res = await request(app).post('/api/some-endpoint').set('Origin', 'http://localhost:9000').send({});

    chai.expect(res.status).to.be.eql(403);
    chai.expect(res.body).to.have.property('code');
    chai.expect(res.body).to.have.property('msg');
    chai.expect(res.body).to.have.property('origin');
    chai.expect(res.body.code).to.be.eql('CORS_AUTH_FAILED');
    chai.expect(res.body.msg).to.be.eql('Access is restricted');
    chai.expect(res.body.origin).to.be.eql('http://localhost:9000');

  });

  it('should reject requests with the wrong origin header when allowed origins are configured in dev mode', async function () {

    const app = express();
    support.init(['cors'], {
      system: {
        environment: 'development'
      },
      cors: {
        devOrigins: [ 'http://localhost:9000', 'http://localhost:9001' ],
        prodOrigins: [ 'https://testprod.example.com' ]
      }
    });
    app.use(express.json());
    support.middleware(app);
    app.use('/api/some-endpoint', function(req, res) {
      res.status(200).json({ code: 'SUCCESS', msg: 'This route does nothing' });
    });

    const res = await request(app).post('/api/some-endpoint').set('Origin', 'http://www.example.com').send({});

    chai.expect(res.status).to.be.eql(403);
    chai.expect(res.body).to.have.property('code');
    chai.expect(res.body).to.have.property('msg');
    chai.expect(res.body).to.have.property('origin');
    chai.expect(res.body.code).to.be.eql('CORS_AUTH_FAILED');
    chai.expect(res.body.msg).to.be.eql('Access is restricted');
    chai.expect(res.body.origin).to.be.eql('http://www.example.com');

  });

  it('should accept requests with the right origin header', async function () {

    const app = express();
    support.init(['cors']);
    app.use(express.json());
    support.middleware(app);
    app.use('/api/some-endpoint', function(req, res) {
      res.status(200).json({ code: 'SUCCESS', msg: 'This route does nothing' });
    });

    const res = await request(app).post('/api/some-endpoint').set('Origin', 'http://localhost:3000').send({});

    chai.expect(res.status).to.be.eql(200);
    chai.expect(res.body).to.have.property('code');
    chai.expect(res.body).to.have.property('msg');
    chai.expect(res.body.code).to.be.eql('SUCCESS');
    chai.expect(res.body.msg).to.be.eql('This route does nothing');

  });

  it('should accept requests with the right origin header when allowed origins are configured', async function () {

    const app = express();
    support.init(['cors'], { cors: {
      devOrigins: [ 'http://localhost:9000', 'http://localhost:9001' ],
      prodOrigins: [ 'https://testprod.example.com' ]
    } });
    app.use(express.json());
    support.middleware(app);
    app.use('/api/some-endpoint', function(req, res) {
      res.status(200).json({ code: 'SUCCESS', msg: 'This route does nothing' });
    });

    const res = await request(app).post('/api/some-endpoint').set('Origin', 'https://testprod.example.com').send({});

    chai.expect(res.status).to.be.eql(200);
    chai.expect(res.body).to.have.property('code');
    chai.expect(res.body).to.have.property('msg');
    chai.expect(res.body.code).to.be.eql('SUCCESS');
    chai.expect(res.body.msg).to.be.eql('This route does nothing');

  });

  it('should accept requests with the right origin header when allowed origins are configured in dev mode', async function () {

    const app = express();
    support.init(['cors'], {
      system: {
        environment: 'development'
      },
      cors: {
        devOrigins: [ 'http://localhost:9000', 'http://localhost:9001' ],
        prodOrigins: [ 'https://testprod.example.com' ]
      }
    });
    app.use(express.json());
    support.middleware(app);
    app.use('/api/some-endpoint', function(req, res) {
      res.status(200).json({ code: 'SUCCESS', msg: 'This route does nothing' });
    });

    const res = await request(app).post('/api/some-endpoint').set('Origin', 'http://localhost:9001').send({});

    chai.expect(res.status).to.be.eql(200);
    chai.expect(res.body).to.have.property('code');
    chai.expect(res.body).to.have.property('msg');
    chai.expect(res.body.code).to.be.eql('SUCCESS');
    chai.expect(res.body.msg).to.be.eql('This route does nothing');

  });

});
