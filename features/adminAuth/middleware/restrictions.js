
const logic = require('../logic');

const requireAdminAuth = (feature) => {

  logic.init(feature);

  const allowAll = feature.getConfigValue('allowAll');
  const matchAdmin = feature.getConfigValue('matchAdmin');
  const mountPoint = feature.getConfigValue('authMountPoint');
  const usesBootstrap = feature.getConfigValue('allowBootstrapRoute');

  const middleware = async (req, res, next) => {

    if (allowAll || !req.originalUrl.match(matchAdmin)) {
      return next();
    }

    // Don't require a token for non-logged-in routes
    let regex = '^' + mountPoint + '/(login|logout|forgot|reset';
    if (usesBootstrap) {
      regex += '|bootstrap';
    }
    regex += ')';
    if (req.originalUrl.match(regex)) {
      return next();
    }

    // everything else: make sure we have session data (session ID, user ID, token)
    if (typeof(req.body) !== 'object') {
      res.status(400);
      res.json({ code: 'NO_DATA', msg: 'No data was provided' });
      return;
    }
    if (typeof(req.body.session) !== 'object') {
      res.status(400);
      res.json({ code: 'NO_SESSION', msg: 'No session data was provided' });
      return;
    }
    const session = req.body.session;
    if (!session.sid) {
      res.status(403);
      res.json({ code: 'SESSION_ID_REQUIRED', msg: 'Session ID is required' });
      return;
    }
    if (!session.uid) {
      res.status(403);
      res.json({ code: 'USER_ID_REQUIRED', msg: 'User ID is required' });
      return;
    }
    if (!session.token) {
      res.status(403);
      res.json({ code: 'TOKEN_REQUIRED', msg: 'Token is required' });
      return;
    }

    // then make sure it's valid
    try {
      const check = await logic.checkSessionToken(session.sid, session.uid, session.token);
      if (!check.ok) {
        res.status(check.data.status);
        res.json({ code: check.data.code, msg: 'Invalid session' });
        return;
      } else {
        res.locals.expires = check.data.expires;
      }
    } catch (e) {
      res.status(500);
      res.json({ code: 'UNEXPECTED', msg: 'Error checking session: ' + e });
      return;
    }

    // if all is well, move on
    return next();
  };

  return middleware;
};

module.exports = requireAdminAuth;
