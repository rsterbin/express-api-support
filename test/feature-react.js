const express = require('express');
const chai = require('chai');
const request = require('supertest');
var fs = require('fs');

const support = require('../index');

describe('Error handling with React passthrough', () => {

  it('should send a json 404 message within the API section', function (done) {

    const app = express();
    support.init(['react'], { react: { consoleLogErrors: false } });
    support.handlers(app);

    request(app)
      .post('/api/not-found')
      .send({})
      .expect(404)
      .end(function (err, res) {
        chai.expect(res.body.code).to.be.eql('UNEXPECTED');
        chai.expect(res.body.msg).to.be.eql('Endpoint not found');
        done();
      });

  });

  it('should send a user-defined error if the endpoint returns one', (done) => {

    const app = express();
    support.init(['react'], { react: { consoleLogErrors: false } });
    app.use(express.json());
    app.use('/api/custom', function(req, res) {
      if (!('session' in req.body)) {
        res.status(400).json({ code: 'NOT_AUTHENTICATED', msg: 'You are not authenticated here' });
      } else {
        res.status(200).json({ code: 'SUCCESS', msg: 'This custom route is complete' });
      }
    });
    support.handlers(app);

    request(app)
      .post('/api/custom')
      .send({})
      .expect(400)
      .end((err, res) => {
        chai.expect(res.body.code).to.be.eql('NOT_AUTHENTICATED');
        chai.expect(res.body.msg).to.be.eql('You are not authenticated here');
        done();
      });

  });

  it('should pass through to the react path on non-api requests', (done) => {

    const reactPath = __dirname + '/fake-react.html';
    const html = fs.readFileSync(reactPath, 'utf8');

    const app = express();
    support.init(['react'], { react: { consoleLogErrors: false, docIndex: reactPath } });
    app.use(express.json());
    support.handlers(app);

    request(app)
      .post('/some-page')
      .send({})
      .expect(200)
      .end((err, res) => {
        if (err) return done(err);
        chai.expect(res.text).to.be.eql(html);
        done();
      });

  });

});
