// Tests for the auth feature

const importTest = function(name) {
  require('./auth/' + name);
};

describe('Authentication feature', () => {

  importTest('restrictions');
  importTest('bootstrapping');
  importTest('sessions');
  importTest('reset');
  importTest('profile');
  importTest('users');

});

