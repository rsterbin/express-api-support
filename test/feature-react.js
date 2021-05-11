const express = require('express');
const chai = require('chai');
const request = require('supertest');
const fs = require('fs');

const support = require('../index');

describe('Error handling with React passthrough', () => {

  afterEach(async function () {
    await support.destroy();
  });

  it('should send a json 404 message within the API section', async function () {

    const app = express();
    support.init(['react'], { react: { consoleLogErrors: false } });
    support.handlers(app);

    const res = await request(app).post('/api/not-found').send({});
    chai.expect(res.status).to.be.eql(404);
    chai.expect(res.body).to.have.property('code');
    chai.expect(res.body).to.have.property('msg');
    chai.expect(res.body.code).to.be.eql('UNEXPECTED');
    chai.expect(res.body.msg).to.be.eql('Endpoint not found');

  });

  it('should send a user-defined error if the endpoint returns one', async function () {

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

    const res = await request(app).post('/api/custom').send({});
    chai.expect(res.status).to.be.eql(400);
    chai.expect(res.body).to.have.property('code');
    chai.expect(res.body).to.have.property('msg');
    chai.expect(res.body.code).to.be.eql('NOT_AUTHENTICATED');
    chai.expect(res.body.msg).to.be.eql('You are not authenticated here');

  });

  it('should pass through to the react path on non-api requests', async function () {

    const reactPath = __dirname + '/data/fake-react.html';
    const html = fs.readFileSync(reactPath, 'utf8');

    const app = express();
    support.init(['react'], { react: { consoleLogErrors: false, docIndex: reactPath } });
    app.use(express.json());
    support.handlers(app);

    const res = await request(app).post('/some-page').send({});
    chai.expect(res.status).to.be.eql(200);
    chai.expect(res.text).to.be.eql(html);

  });

});
