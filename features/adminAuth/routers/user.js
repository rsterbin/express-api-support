const express = require('express');
const Router = require('express-promise-router');

const logic = require('../logic');
const { simpleOutput } = require('../../../utils/routeHelpers');

const getUserRouter = (context) => {

    logic.init(context);

    const router = new Router();

    // admin/user POST: fetch your user info
    router.post('/', async function(req, res, next) {
        simpleOutput(await logic.getUser(req.body.session.uid), res);
    });

    // admin/user/update POST: update your user info
    router.post('/update', async function(req, res, next) {
        simpleOutput(await logic.updateUser(req.body.session.uid, req.body), res);
    });

    /*
     * NB: all the methods below allow you to manipulate other users. Eventually we
     * should restrict this via user privileges, but given that the only admins
     * right now are me and Meika, I don't want to waste time on it.
     */

    // admin/user/create POST: create a new user
    router.post('/create', async function(req, res, next) {
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
        simpleOutput(await logic.createUser(req.body.email, req.body.password, req.body), res);
    });

    // admin/user/list POST: list of all users
    router.post('/list', async function(req, res, next) {
        const includeDisabled = 'include_disabled' in req.body ? req.body.include_disabled : false;
        simpleOutput(await logic.getAllUsers(includeDisabled), res);
    });

    // admin/user/update/:uid POST: update user info (someone else's)
    router.post('/update/:uid', async function(req, res, next) {
        simpleOutput(await logic.updateUser(req.params.uid, req.body), res);
    });

    // admin/user/disable POST: disable an admin user
    router.post('/disable/:uid', async function(req, res, next) {
        simpleOutput(await logic.disableUser(req.params.uid), res);
    });

    // admin/user/enable POST: re-enable an admin user
    router.post('/enable/:uid', async function(req, res, next) {
        simpleOutput(await logic.enableUser(req.params.uid), res);
    });

    return router;
};

module.exports = getUserRouter;
