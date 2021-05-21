# TODO List

- Config module is getting big enough to be unweildy and could (probably) be replaced with [convict](https://www.npmjs.com/package/convict)
- Using dotenv preloading would alleviate the race condition that spurred the creation of the roll-your-own config module in the first place
- JSON web tokens for password reset (at least)
- Date formatting for expires should go in in email template (but make sure it works)
- Customizable payload for password reset email
- When passing in table prefixes / column names, make sure they're valid for postgres
- Standardize custom errors within package
- Finish admin auth unit tests
- Export the `simpleOutput` route helper for use elsewhere
- System context module is a bit awkward and overlaps with config; consolidate
- Option for adminAuth to allow bootstrapping more than one user
- Feature for admin auth to accept authorization logic to control access to admin-y features (e.g., create a new user)
- Rename admin auth, as it's really not admin-specific
- Visitor tokens / non-logged-in sessions
- Replace `support.getRouters(app)` with `support.routers(app)` -- fairly certain that workaround for routes specifying a mount point in the config but then also separately getting the routers and pushing them onto the app (ugh) isn't actually necessary and direct adding was broken due to another bug
- Instead of configuring two adminAuth mount points for the auth and user sections, do parent-child config for mount points -- not sure whether it'll be useful to allow each route, but I do want to have login/forgot/reset broken away from the sessions list, which should be with the management of other users stuff, and also the profile edit route should be its own thing
