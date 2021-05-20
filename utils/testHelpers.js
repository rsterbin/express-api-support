const pgtools = require('pgtools');
const crypto = require('crypto');
const MailDev = require('maildev');
const fs = require('fs');

const LocalConfig = require('../test/data/localConfig.json');

const getOptions = function(testData, custom = {}) {
  let dbName = LocalConfig.database.fallbackDbName;
  if ('perTestDB' in testData) {
    dbName = testData.perTestDB.dbName;
  }
  const templatePath = fs.realpathSync(__dirname + '/../test/data/templates');
  const basic = {
    database: { url: LocalConfig.database.urlBase + dbName },
    mailer: { templateDir: templatePath, ignoreTLS: true, from: 'info@example.com' },
    react: { consoleLogErrors: false },
  };
  // a shallow merge is okay here, because all the things we care about in this text are directly below the first level
  const merged = {};
  for (const sec in basic) {
    const overwrite = sec in custom ? custom[sec] : {};
    merged[sec] = { ...basic[sec], ...overwrite };
  }
  for (const sec in custom) {
    if (!(sec in merged)) {
      merged[sec] = custom[sec];
    }
  }
  return merged;
};

const basicRoute = function(req, res) {
  if (typeof req.body !== 'object' || !('session' in req.body)) {
    res.status(400).json({ code: 'NOT_AUTHENTICATED', msg: 'You are not authenticated here' });
  } else {
    res.status(200).json({ data: { custom: 'Some Value' } });
  }
};

const sleep = function(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
};

const DB_NAMES = {};
const getNewDbName = function() {
  let newName = '';
  do {
    newName = LocalConfig.database.dbNamePrefix + crypto.randomBytes(4).toString('hex');
  } while (newName in DB_NAMES);
  DB_NAMES[newName] = 1;
  return newName;
};

const installTables = async function(support, prefix = '') {
  try {
    const sql = support.generateSql();
    await support.context.database.query(sql);
    await support.context.database.query('select * from ' + prefix + 'admin_users');
  } catch (e) {
    console.log('install or check failed: ', e);
  }
};

const newMailClient = function() {
  return new MailDev({ silent: true });
};

const startMailClient = function(maildev) {
  return new Promise(resolve => maildev.listen(resolve));
};

const waitForOneEmail = function(maildev) {
  return new Promise(resolve => maildev.on('new', resolve));
};

const stopMailClient = function(maildev) {
  return new Promise(resolve => maildev.close(resolve));
};

const spinup = async function (testData) {
  if ('perTestDB' in testData) {
    let newName = getNewDbName();
    await pgtools.createdb(LocalConfig.database.createConfig, newName);
    testData.perTestDB.dbName = newName;
  }
  return testData;
};

const winddown = async function (testData) {
  if ('support' in testData) {
    await testData.support.destroy();
  }
  if ('perTestDB' in testData) {
    await pgtools.dropdb(LocalConfig.database.createConfig, testData.perTestDB.dbName);
  }
  return testData;
};

module.exports = {
  getOptions: getOptions,
  basicRoute: basicRoute,
  sleep: sleep,
  getNewDbName: getNewDbName,
  installTables: installTables,
  newMailClient: newMailClient,
  startMailClient: startMailClient,
  stopMailClient: stopMailClient,
  waitForOneEmail: waitForOneEmail,
  spinup: spinup,
  winddown: winddown
};
