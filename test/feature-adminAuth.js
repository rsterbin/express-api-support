// Tests for the adminAuth feature

const importTest = function(name) {
  require('./adminAuth/' + name);
};

describe('Admin authentication feature', () => {

  importTest('restrictions');
  importTest('bootstrapping');
  importTest('sessions');
  importTest('reset');
  importTest('profile');
  importTest('users');

});

