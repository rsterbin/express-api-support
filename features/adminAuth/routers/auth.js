const Router = require('express-promise-router');

const logic = require('../logic');
const { simpleOutput } = require('../../../utils/routeHelpers');

const getAuthRouter = (feature) => {

  logic.init(feature);

  const env = feature.getSystemValue('environment');
  const router = new Router();

  // /check POST: Check whether the admin session token is valid
  router.post('/check', async function(req, res, next) {
    // the middleware actually does the check for us, so all we need to do here is reply with a success message
    res.json({
      msg: 'Valid session',
      session: req.body.session,
      expires: res.locals.expires
    });
  });

  // /login POST: Log in
  router.post('/login', async function(req, res, next) {
    if (typeof(req.body) !== 'object') {
      res.status(400);
      res.json({ code: 'NO_DATA', msg: 'No data was provided' });
      return;
    }
    if (typeof(req.body.email) === 'undefined') {
      res.status(400);
      res.json({ code: 'EMAIL_REQUIRED', msg: 'Email is required' });
      return;
    }
    if (typeof(req.body.password) === 'undefined') {
      res.status(400);
      res.json({ code: 'PASSWORD_REQUIRED', msg: 'Password is required' });
      return;
    }
    simpleOutput(await logic.login(req.body.email, req.body.password), res, env);
  });

  // admin/session/logout POST: Deletes your session
  router.post('/logout', async function(req, res, next) {
    if (typeof(req.body) !== 'object') {
      res.status(400);
      res.json({ code: 'NO_DATA', msg: 'No data was provided' });
      return;
    }
    if (typeof(req.body.session) !== 'object') {
      res.status(403);
      res.json({ code: 'SESSION_REQUIRED', msg: 'Session is required' });
      return;
    }
    simpleOutput(await logic.logout(req.body.session.sid), res, env);
  });

  // admin/auth/forgot POST: User forgot password; request reset
  router.post('/forgot', async function(req, res, next) {
    if (typeof(req.body) !== 'object') {
      res.status(400);
      res.json({ code: 'NO_DATA', msg: 'No data was provided' });
      return;
    }
    if (typeof(req.body.email) === 'undefined') {
      res.status(400);
      res.json({ code: 'EMAIL_REQUIRED', msg: 'Email is required' });
      return;
    }
    simpleOutput(await logic.requestPasswordReset(req.body.email), res, env);
  });

  // admin/auth/reset POST: Reset password
  router.post('/reset', async function(req, res, next) {
    if (typeof(req.body) !== 'object') {
      res.status(400);
      res.json({ code: 'NO_DATA', msg: 'No data was provided' });
      return;
    }
    if (typeof(req.body.email) === 'undefined') {
      res.status(400);
      res.json({ code: 'EMAIL_REQUIRED', msg: 'Email is required' });
      return;
    }
    if (typeof(req.body.token) === 'undefined') {
      res.status(400);
      res.json({ code: 'RESET_TOKEN_REQUIRED', msg: 'Reset token is required' });
      return;
    }
    if (typeof(req.body.password) === 'undefined') {
      // just validate the reset token
      simpleOutput(await logic.checkResetToken(req.body.email, req.body.token), res, env);
    } else {
      // do the reset
      simpleOutput(await logic.resetPassword(req.body.email, req.body.token, req.body.password), res, env);
    }
  });

  if (feature.getConfigValue('allowSessionsListRoute')) {
    // admin/user/sessions POST: list all active sessions
    router.post('/sessions', async function(req, res, next) {
      simpleOutput(await logic.getAllActiveSessions(), res, env);
    });
  }

  if (feature.getConfigValue('allowBootstrapRoute')) {
    // /bootstrap POST: If we have NO admin users, this can be used (once) to bring up a system user using a very stupid plain text secret code check
    router.post('/bootstrap', async function(req, res, next) {
      if (typeof(req.body) !== 'object') {
        res.status(400);
        res.json({ code: 'NO_DATA', msg: 'No data was provided' });
        return;
      }
      if (typeof(req.body.email) === 'undefined') {
        res.status(400);
        res.json({ code: 'EMAIL_REQUIRED', msg: 'Email is required' });
        return;
      }
      if (typeof(req.body.password) === 'undefined') {
        res.status(400);
        res.json({ code: 'PASSWORD_REQUIRED', msg: 'Password is required' });
        return;
      }
      simpleOutput(await logic.bootstrap(req.body.email, req.body.password, req.body), res, env);
    });
  }

  return router;
};

module.exports = getAuthRouter;
