
class TestHelperBase {

  addOptions(options) {
    return options;
  }

  testLocalConfig() {}

  async beforeBlock(data = {}, name = '') { // eslint-disable-line no-unused-vars
    return data;
  }

  async afterBlock(data = {}, name = '') { // eslint-disable-line no-unused-vars
    return data;
  }

  async beforeTest(data = {}, name = '') { // eslint-disable-line no-unused-vars
    return data;
  }

  async afterTest(data = {}, name = '') { // eslint-disable-line no-unused-vars
    return data;
  }

}

module.exports = TestHelperBase;
