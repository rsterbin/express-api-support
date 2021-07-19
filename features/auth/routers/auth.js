const Router = require('express-promise-router');

const logic = require('../logic');
const { simpleOutput } = require('../../../utils/routeHelpers');

const getAuthRouter = (feature) => {

  logic.init(feature);

  const env = feature.getSystemValue('environment');
  const router = new Router();

  // /check POST: Check whether the session token is valid
  router.post('/check', async function(req, res, next) {
    // the middleware actually does the check for us, so all we need to do here is reply with a success message
    res.json({ code: 'SUCCESS', msg: 'Success', data: {
      valid: true,
      session: req.body.session,
      expires: res.locals.expires
    } });
  });

  // /login POST: Log in
  router.post('/login', async function(req, res, next) {
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

  // session/logout POST: Deletes your session
  router.post('/logout', async function(req, res, next) {
    if (typeof(req.body.session) !== 'object') {
      res.status(400);
      res.json({ code: 'SESSION_REQUIRED', msg: 'Session is required' });
      return;
    }
    simpleOutput(await logic.logout(req.body.session.sid), res, env);
  });

  // auth/forgot POST: User forgot password; request reset
  router.post('/forgot', async function(req, res, next) {
    if (typeof(req.body.email) === 'undefined') {
      res.status(400);
      res.json({ code: 'EMAIL_REQUIRED', msg: 'Email is required' });
      return;
    }
    simpleOutput(await logic.requestPasswordReset(req.body.email), res, env);
  });

  // auth/reset POST: Reset password
  router.post('/reset', async function(req, res, next) {
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
    // auth/sessions POST: list all active sessions
    router.post('/sessions', async function(req, res, next) {
      simpleOutput(await logic.getAllActiveSessions(), res, env);
    });
  }

  return router;
};

module.exports = getAuthRouter;
