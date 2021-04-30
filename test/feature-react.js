const express = require('express');
const chai = require('chai');
const request = require('supertest');
var fs = require('fs');

const support = require('../index');

describe('Error handling with React passthrough', () => {

    it('should send a json 404 message within the API section', () => {

        const app = express();
        support.init(['react'], { react: { consoleLogErrors: false } });
        support.handlers(app);

        request(app)
			.post('/api/not-found')
			.send({})
			.expect(404)
			.then((res) => {
                 expect(res.headers.location).to.be.eql('/api/not-found');
                 expect(res.body.code).to.be.eql('UNEXPECTED');
                 expect(res.body.msg).to.be.eql('Endpoint not found');
            });

    });

    it('should send a user-defined error if the endpoint returns one', () => {

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
			.then((res) => {
                 expect(res.headers.location).to.be.eql('/api/custom');
                 expect(res.body.code).to.be.eql('NOT_AUTHENTICATED');
                 expect(res.body.msg).to.be.eql('You are not authenticated here');
            });

    });

    it('should pass through to the react path on non-api requests', () => {

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
			.then((res) => {
                 expect(res.headers.location).to.be.eql('/some-page');
                 expect(res.text).to.be.eql(html);
            });

    });

});
