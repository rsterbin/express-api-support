
class TestHelperBase {

  constructor(opts = {}) {
    this.setBlockTestSwitches(opts);
  }

  setBlockTestSwitches(opts) {
    if ('onlyTests' in opts && Array.isArray(opts.onlyTests)) {
      this.onlyTests = opts.onlyTests;
      this.allTests = false;
    } else {
      this.onlyTests = [];
      this.allTests = opts.allTests ? true : false;
    }
    if ('onlyBlocks' in opts && Array.isArray(opts.onlyBlocks)) {
      this.onlyBlocks = opts.onlyBlocks;
      this.allBlocks = false;
    } else {
      this.onlyBlocks = [];
      this.allBlocks = opts.allBlocks ? true : false;
    }
  }

  onForBlock(name) {
    return (this.allBlocks || this.onlyBlocks.includes(name));
  }

  onForTest(name) {
    return (this.allTests || this.onlyTests.includes(name));
  }

  async beforeBlock(data = {}, name = '') {
    if (this.onForBlock(name)) {
      return await this.start(data);
    }
    return data;
  }

  async afterBlock(data = {}, name = '') {
    if (this.onForBlock(name)) {
      return await this.stop(data);
    }
    return data;
  }

  async beforeTest(data = {}, name = '') {
    if (this.onForTest(name)) {
      return await this.start(data);
    }
    return data;
  }

  async afterTest(data = {}, name = '') {
    if (this.onForTest(name)) {
      return await this.stop(data);
    }
    return data;
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
