const TestHelper = require('./Helper');

const helper = new TestHelper();

function getSuites(level) {
  const suites = [];
  while (level) {
    if (level.title) {
      suites.push(level.title);
    }
    level = level.parent;
  }
  return suites;
}

exports.mochaHooks = {

  beforeAll: async function() {
    this.timeout(helper.getTimeout('beforeAll'));
    await helper.beforeAll();
  },

  afterAll: async function() {
    this.timeout(helper.getTimeout('afterAll'));
    await helper.afterAll();
  },

  beforeEach: async function() {
    this.currentTest.helper = helper;
    const title = this.currentTest.title;
    const suites = getSuites(this.currentTest.parent);
    this.timeout(helper.getTimeout('beforeEach', title, suites));
    await helper.beforeEach(title, suites);
  },

  afterEach: async function() {
    const title = this.currentTest.title;
    const suites = getSuites(this.currentTest.parent);
    this.timeout(helper.getTimeout('afterEach', title, suites));
    await helper.afterEach(title, suites);
  }

};
