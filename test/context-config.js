const express = require('express');
const chai = require('chai');
const request = require('supertest');

const NEED = {};

class MyAppPerson {
  constructor(name) {
    this.name = name;
    this.friend = null;
  }
  setFriend(name) {
    this.friend = name;
  }
  hasValidFriend() {
    return this.friend !== null;
  }
}

const parseMyAppPerson = (val) => {
  const m1 = val.match(/my name is: "([^"]+)"/);
  if (m1 !== null) {
    const done = new MyAppPerson(m1[1]);
    const m2 = val.match(/my friend is: "([^"]+)"/);
    if (m2 !== null) {
      done.setFriend(m2[1]);
    }
    return done;
  } else {
    throw new Error('Not a valid app person');
  }
};

const CUSTOM_SPEC = { myApp: { type: 'parent', children: {
  'customStringEnv': {
    'required': true,
    'type': 'string',
    'from_env': 'MYAPP_CUSTOM_STRING',
    'description': 'My app setting for string, required, from env',
  },
  'customBooleanEnv': {
    'required': true,
    'type': 'boolean',
    'from_env': 'MYAPP_CUSTOM_BOOLEAN',
    'description': 'My app setting for boolean, required, from env',
  },
  'customValidatedEnv': {
    'required': true,
    'type': (val) => val.match(/^123/) && val.match(/789$/),
    'from_env': 'MYAPP_CUSTOM_VALIDATED',
    'description': 'My app setting for type-as-function, required, from env',
  },
  'customParsedEnv': {
    'required': true,
    'type': (val) => val.hasValidFriend(),
    'parse': parseMyAppPerson,
    'from_env': 'MYAPP_CUSTOM_PARSED',
    'description': 'My app setting for type-as-function, required, from env',
  },
  'customStringArg': {
    'required': true,
    'type': 'string',
    'description': 'My app setting for string, required, passed by arg',
  },
} } };

describe('Configuration context module', () => {

  afterEach(function () {
    // delete the vars added to the environment for tests
    for (const newvar of [
      'API_SITE_NAME',
      'ADMIN_AUTH_USER_FIELDS',
      'MYAPP_CUSTOM_STRING',
      'MYAPP_CUSTOM_BOOLEAN',
      'MYAPP_CUSTOM_VALIDATED',
      'MYAPP_CUSTOM_PARSED'
    ]) {
      if (newvar in process.env) {
        delete process.env[newvar];
      }
    }
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

  it('should sucessfully parse a custom config', async function () {

    process.env.MYAPP_CUSTOM_STRING = 'bananas';
    process.env.MYAPP_CUSTOM_BOOLEAN = '1';
    process.env.MYAPP_CUSTOM_VALIDATED = '123456789';
    process.env.MYAPP_CUSTOM_PARSED = 'my name is: "George" / my friend is: "Jane Smith"';

    const config = { myApp: {
      customStringArg: 'grapes'
    } }; // test: passed by arg

    const app = express();
    const support = this.test.helper.initSupport([], NEED, config, CUSTOM_SPEC);
    app.use(express.json());
    support.middleware(app);
    app.use('/api/some-endpoint', function(req, res) {
      const config = support.getContext('config');
      const person = config.get('myApp.customParsedEnv');
      // once it gets sent via json, it's just an object, so grab the type here
      const personclass = person instanceof MyAppPerson ? 'MyAppPerson' : person.constructor.name;
      res.status(200).json({ code: 'SUCCESS', data: {
        customStringEnv: config.get('myApp.customStringEnv'),
        customBooleanEnv: config.get('myApp.customBooleanEnv'),
        customValidatedEnv: config.get('myApp.customValidatedEnv'),
        customParsedEnv: person,
        customParsedEnvClass: personclass,
        customStringArg: config.get('myApp.customStringArg'),
      } });
    });
    support.handlers(app);

    const res = await request(app).post('/api/some-endpoint').send({});

    chai.expect(res.status).to.be.eql(200);
    chai.expect(res.body).to.have.property('code');
    chai.expect(res.body).to.have.property('data');
    chai.expect(res.body.code).to.be.eql('SUCCESS');
    chai.expect(res.body.data).to.have.property('customStringEnv');
    chai.expect(res.body.data.customStringEnv).to.be.eql('bananas');
    chai.expect(res.body.data).to.have.property('customBooleanEnv');
    chai.expect(res.body.data.customBooleanEnv).to.be.eql(true);
    chai.expect(res.body.data).to.have.property('customValidatedEnv');
    chai.expect(res.body.data.customValidatedEnv).to.be.eql('123456789');
    chai.expect(res.body.data).to.have.property('customParsedEnv');
    chai.expect(res.body.data.customParsedEnv.name).to.be.eql('George');
    chai.expect(res.body.data.customParsedEnv.friend).to.be.eql('Jane Smith');
    chai.expect(res.body.data).to.have.property('customParsedEnvClass');
    chai.expect(res.body.data.customParsedEnvClass).to.be.eql('MyAppPerson');
    chai.expect(res.body.data).to.have.property('customStringArg');
    chai.expect(res.body.data.customStringArg).to.be.eql('grapes');

  });

  // TODO: get coverage on a decent chunk of these lines -- 22,69,82,87,92-96,105-107,117,123,126-133,139,144,149,154,160-182,187-190,196,222,229
  // ... arranged in order of how much I care:
  // 69: throw error if required but not found
  it('should throw a bootstrapping error if a custom required key is not found');
  // 82: throw error if parse function did (env var) + confirm a user-defined error caused it
  it('should throw a bootstrapping error if a custom parse function did');
  // NEW: throw error if type check function did
  it('should throw a bootstrapping error if a custom type-checking function did');
  // 117: throw error if type check function returns false
  it('should throw a bootstrapping error if a custom type-checking function returns false');
  // 126-133: check against values_allowed list and throw error if not found
  it('should throw a bootstrapping error if a custom key doesn\'t match one of its allowed values');
  // 123: throw error if not a string
  it('should throw a bootstrapping error if a custom key passed by argument should be a string but isn\'t');
  // 92-96: parse an boolean to false or throw error (env var)
  it('should throw a bootstrapping error if a custom key passed by env var should be a boolean but isn\'t');
  // 139: throw error if not a boolean
  it('should throw a bootstrapping error if a custom key passed by argument should be a boolean but isn\'t');
  // 87: parse an int value (env var)
  it('should throw a bootstrapping error if a custom key passed by env var should be an integer but isn\'t');
  // 144: throw error if not an integer
  it('should throw a bootstrapping error if a custom key passed by argument should be an integer but isn\'t');
  // 149: throw error if not an array
  it('should throw a bootstrapping error if a custom key passed by argument should be an array but isn\'t');
  // 105-107: throw error if json parsing fails (env var)
  it('should throw a bootstrapping error if a custom key passed by env var should be valid json but isn\'t');
  // 154: throw error if not an object
  it('should throw a bootstrapping error if a custom key passed by argument should be an object but isn\'t');
  // 229: return a fallback if the search failed because a parent was missing
  it('should return a fallback when the requested key is not present');
  it('should return a fallback when the parent of the requested key is not present');

  // stuff we can do without because it's super internal
  // 160-182: bootstrapping error logic; will be covered by any of above
  // 196: when overriding, if the new value is undefined, delete the key
  // 187-190: throw error if override failed because it can't be placed in a non-object
  // 22: if bootstrap is called after running once, return (requires a direct call to bootstrap, for no reason I guess)
  // 222: when searching, the key search array is empty (not actually possible when using get, but could happen if _finder was called directly)

});

