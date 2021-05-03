const express = require('express');
const chai = require('chai');
const request = require('supertest');

const support = require('../index');

describe('CORS middleware restrictions', () => {

  it('should reject requests with no origin header', (done) => {

    const app = express();
    support.init(['cors']);
    app.use(express.json());
    support.middleware(app);
    app.use('/api/some-endpoint', function(req, res) {
      res.status(200).json({ code: 'SUCCESS', msg: 'This route does nothing' });
    });

    request(app)
      .post('/api/some-endpoint')
      .send({})
      .expect(403)
      .end((err, res) => {
        chai.expect(res.body.code).to.be.eql('CORS_AUTH_FAILED');
        chai.expect(res.body.msg).to.be.eql('Access is restricted');
        chai.expect(res.body.origin).to.be.eql(undefined);
        done();
      });

  });

  it('should reject requests with the wrong origin header', (done) => {

    const app = express();
    support.init(['cors']);
    app.use(express.json());
    support.middleware(app);
    app.use('/api/some-endpoint', function(req, res) {
      res.status(200).json({ code: 'SUCCESS', msg: 'This route does nothing' });
    });

    request(app)
      .post('/api/some-endpoint')
      .send({})
      .set('Origin', 'http://www.example.com')
      .expect(403)
      .end((err, res) => {
        chai.expect(res.body.code).to.be.eql('CORS_AUTH_FAILED');
        chai.expect(res.body.msg).to.be.eql('Access is restricted');
        chai.expect(res.body.origin).to.be.eql('http://www.example.com');
        done();
      });

  });

  it('should accept requests with the right origin header', (done) => {

    const app = express();
    support.init(['cors']);
    app.use(express.json());
    support.middleware(app);
    app.use('/api/some-endpoint', function(req, res) {
      res.status(200).json({ code: 'SUCCESS', msg: 'This route does nothing' });
    });

    request(app)
      .post('/api/some-endpoint')
      .send({})
      .set('Origin', 'http://localhost:3000')
      .expect(200)
      .end((err, res) => {
        chai.expect(res.body.code).to.be.eql('SUCCESS');
        chai.expect(res.body.msg).to.be.eql('This route does nothing');
        done();
      });

  });

  it('should reject requests with the wrong origin header when allowed origins are configured', (done) => {

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

    request(app)
      .post('/api/some-endpoint')
      .send({})
      .set('Origin', 'http://localhost:9000')
      .expect(403)
      .end((err, res) => {
        chai.expect(res.body.code).to.be.eql('CORS_AUTH_FAILED');
        chai.expect(res.body.msg).to.be.eql('Access is restricted');
        chai.expect(res.body.origin).to.be.eql('http://localhost:9000');
        done();
      });

  });

  it('should reject requests with the wrong origin header when allowed origins are configured in dev mode', (done) => {

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

    request(app)
      .post('/api/some-endpoint')
      .send({})
      .set('Origin', 'http://www.example.com')
      .expect(403)
      .end((err, res) => {
        chai.expect(res.body.code).to.be.eql('CORS_AUTH_FAILED');
        chai.expect(res.body.msg).to.be.eql('Access is restricted');
        chai.expect(res.body.origin).to.be.eql('http://www.example.com');
        done();
      });

  });

  it('should accept requests with the right origin header', (done) => {

    const app = express();
    support.init(['cors']);
    app.use(express.json());
    support.middleware(app);
    app.use('/api/some-endpoint', function(req, res) {
      res.status(200).json({ code: 'SUCCESS', msg: 'This route does nothing' });
    });

    request(app)
      .post('/api/some-endpoint')
      .send({})
      .set('Origin', 'http://localhost:3000')
      .expect(200)
      .end((err, res) => {
        chai.expect(res.body.code).to.be.eql('SUCCESS');
        chai.expect(res.body.msg).to.be.eql('This route does nothing');
        done();
      });

  });

  it('should accept requests with the right origin header when allowed origins are configured', (done) => {

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

    request(app)
      .post('/api/some-endpoint')
      .send({})
      .set('Origin', 'https://testprod.example.com')
      .expect(200)
      .end((err, res) => {
        chai.expect(res.body.code).to.be.eql('SUCCESS');
        chai.expect(res.body.msg).to.be.eql('This route does nothing');
        done();
      });

  });

  it('should accept requests with the right origin header when allowed origins are configured in dev mode', (done) => {

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

    request(app)
      .post('/api/some-endpoint')
      .send({})
      .set('Origin', 'http://localhost:9001')
      .expect(200)
      .end((err, res) => {
        chai.expect(res.body.code).to.be.eql('SUCCESS');
        chai.expect(res.body.msg).to.be.eql('This route does nothing');
        done();
      });

  });

});
