
class TestHelperBase {

  constructor(opts = {}) {
    this.onForHooks(opts);
  }

  onForHooks(opts) {
    this.topLevel = false;
    this.testLevel = false;
    this.onlyTests = [];
    this.skipTests = [];
    this.onlySuites = [];
    this.skipSuites = [];

    if ('topLevel' in opts) {
      this.topLevel = opts.topLevel ? true : false;
    }

    if ('testLevel' in opts) {
      this.testLevel = opts.testLevel ? true : false;
    }

    if (this.testLevel) {
      if ('onlySuites' in opts && Array.isArray(opts.onlySuites)) {
        this.onlySuites = opts.onlySuites;
      }
      if ('skipSuites' in opts && Array.isArray(opts.skipSuites)) {
        this.skipSuites = opts.skipSuites;
      }
      if ('onlyTests' in opts && Array.isArray(opts.onlyTests)) {
        this.onlyTests = opts.onlyTests;
      }
      if ('skipTests' in opts && Array.isArray(opts.skipTests)) {
        this.skipTests = opts.skipTests;
      }
    }
  }

  onForTest(name, suites) {
    if (!this.testLevel) {
      return false;
    }
    if (this.skipSuites.length > 0) {
      for (const suite of (suites)) {
        if (this.skipSuites.includes(suite)) {
          return false;
        }
      }
    }
    if (this.onlySuites.length > 0) {
      let found = false;
      for (const suite of (suites)) {
        if (this.onlySuites.includes(suite)) {
          found = true;
        }
      }
      if (!found) {
        return false;
      }
    }
    if (this.skipTests.length > 0) {
      if (this.skipTests.includes(name)) {
        return false;
      }
    }
    if (this.onlyTests.length > 0) {
      if (!this.onlyTests.includes(name)) {
        return false;
      }
    }
    return true;
  }

  async beforeAllHook() {
    if (this.topLevel) {
      await this.start();
    }
  }

  async afterAllHook() {
    if (this.topLevel) {
      await this.stop();
    }
  }

  async beforeEachHook(name, suites) {
    if (this.onForTest(name, suites)) {
      await this.start();
    }
  }

  async afterEachHook(name, suites) {
    if (this.onForTest(name, suites)) {
      await this.stop();
    }
  }

  // subclass
  addOptions(options) {
    return options;
  }

  // subclass
  testLocalConfig() {}

  // subclass
  async start(data = {}) {
    return data;
  }

  // subclass
  async stop(data = {}) {
    return data;
  }

}

module.exports = TestHelperBase;
