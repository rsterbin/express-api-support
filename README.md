# express-api-support

> Personal package of all the stuff I reuse when creating small APIs in express

You can use it if you want to, but at your own risk. Feature requests not accepted; bug reports grudgingly accepted.

## Features

- CORS middleware
- Authentication for an admin section
- Pass non-API requests to React

## Install

```
$ npm install @rsterbin/express-api-support
```

## Usage

## Basic Usage

Initialize with the features you want in app.js

```js
var support = require('@rsterbin/express-api-support');
var app = express();
support.init(['cors', 'react', 'adminAuth'], {
    system: { apiUrlPrefix: '/api/v1' },
    mailer: { templateDir: './email_templates' }
});
```

After setting up express (view engine, cookie parser, logger, etc), add the middleware:

```js
support.middleware(app);
```

Grab the routers and mount them:

```js
const supportRouters = support.getRouters(app);
myApiRouter.use('/admin/auth', supportRouters.adminAuth.auth);
myApiRouter.use('/admin/user', supportRouters.adminAuth.user);
app.use('/api/v1', myApiRouter);
```

Finally, add error handling:

```js
support.handlers(app);
```

## Using the Context

Contexts are underlying utilities that must be set up for the features to work. To use them in the rest of the API:

```js
const mailer = support.getContext('mailer');
```

The available contexts are:

- `config` access to all configuration via dot notation
- `crypt` encryption methods
- `database` access to the database (postgres only)
- `mailer` send templated email


## Configuration

You can add config options in the init call, or you can add them to your environment. Config options are organized by feature and context and can be called using a dot path, e.g. `config.get('feature.cors.allowAll')`.

### Configuration: Features

#### Admin Authentication

Accessible via `config.get('features.adminAuth.*')`.

| Name | Required | Type | Environment Var | Description |
| ---- | -------- | ---- | --------------- | ----------- |
| `matchAdmin` | N | string | `ADMIN_AUTH_MATCH_API` | A regular expression that matches URLs that are part of the admin section of the API and need protection (defaults to "^/api/admin") |
| `authMountPoint` | N | string | `ADMIN_AUTH_MOUNT_POINT` | The URL at which the admin auth section has been mounted (defaults to "/api/admin/auth") |
| `allowAll` | N | boolean | `ADMIN_AUTH_ALLOW_ALL` | Whether to run off restrictions entirely (never use in production!) |
| `tablePrefix` | N | string | `ADMIN_AUTH_TABLE_PREFIX` | Prefix used for all admin auth tables |
| `sessionLength` | N | integer | `ADMIN_AUTH_SESSION_LENGTH` | Length of the admin sessions, in minutes (defaults to 60) |
| `resetTokenLifetime` | N | integer | `ADMIN_AUTH_RESET_TOKEN_LIFETIME` | Lifetime of a reset token, in hours (defaults to 24) |
| `clientResetLink` | N | string | `ADMIN_AUTH_CLIENT_RESET_LINK` | The reset page on the client side (e.g., "/admin/reset-my-password") |
| `resetTokenStyle` | N | string | `ADMIN_AUTH_RESET_TOKEN_STYLE` | The style of the reset link on the client side ("slug" to append the token as a slug, or "query" to send it in the query string as "token") |
| `userFields` | N | method: validateUserFields | `ADMIN_AUTH_USER_FIELDS` | List of fields the admin users should have, other than those required for this feature |
| `includeUserRoutes` | N | boolean | `ADMIN_AUTH_INCLUDE_USER_ROUTES` | Flag for whether the user create/edit/update/etc routes should be included |
| `allowSessionsListRoute` | N | boolean | `ADMIN_AUTH_ALLOW_SESSIONS_LIST_ROUTE` | Flag to allow a route for showing all active admin sessions |
| `allowBootstrapRoute` | N | boolean | `ADMIN_AUTH_ALLOW_BOOTSTRAP_ROUTE` | Flag to allow a route for bootstrapping an admin auth user |
| `secretBootstrapPassword` | N | string | `ADMIN_AUTH_SECRET_BOOTSTRAP_PASSWORD` | Secret bootstrap password for use with the bootstrap route |

#### CORS Restrictions

Accessible via `config.get('features.cors.*')`.

| Name | Required | Type | Environment Var | Description |
| ---- | -------- | ---- | --------------- | ----------- |
| `allowAll` | N | boolean | `CORS_OVERRIDE_ALLOW_ALL` | Flag to turn off CORS restrictions and allow all requests to pass through |
| `allowUrls` | N | array | `CORS_ALLOW_URLS` | A list of URLs that should not have CORS restrictions |
| `prodOrigins` | N | array | `CORS_PROD_ORIGINS` | A list of origins used in production |
| `devOrigins` | N | array | `CORS_DEV_ORIGINS` | A list of origins used in development |

#### React Support

Accessible via `config.get('features.react.*')`.

| Name | Required | Type | Environment Var | Description |
| ---- | -------- | ---- | --------------- | ----------- |
| `allowAll` | N | boolean | `CORS_OVERRIDE_ALLOW_ALL` | Flag to turn off CORS restrictions and allow all requests to pass through |
| `docIndex` | N | string | `REACT_DOC_INDEX` | The path to the main react html page we want to pass through to if express doesn\"t handle it |
| `jsonUrls` | N | array | `REACT_JSON_URLS` | A list of regular expressions matching URLs that should return JSON errors |
| `viewUrls` | N | array | `REACT_VIEW_URLS` | A list of regular expressions matching URLs that should return HTML errors |
| `message404` | N | string | `REACT_404_MESSAGE` | The message to return on 404 errors |

### Configuration: Contexts

#### Encryption

Accessible via `config.get('context.crypt.*')`.

| Name | Required | Type | Environment Var | Description |
| ---- | -------- | ---- | --------------- | ----------- |
| `bcryptSalt` | Y | integer | `BCRYPT_SALT` | Encryption salt for bcrypt (should be an integer) |

#### Database

Accessible via `config.get('context.database.*')`.

| Name | Required | Type | Environment Var | Description |
| ---- | -------- | ---- | --------------- | ----------- |
| `url` | Y | string | `DATABASE_URL` | Postgres connection URL (e.g. postgres://myuser:1234@127.0.0.1:5432/mydbname) |

#### Mailer

Accessible via `config.get('context.mailer.*')`.

| Name | Required | Type | Environment Var | Description |
| ---- | -------- | ---- | --------------- | ----------- |
| `port` | Y | integer | `EMAIL_PORT` | Port the mail transport uses |
| `fromDomain` | Y | string | `EMAIL_FROM_DOMAIN` | The domain to use for From addresses |
| `ignoreTLS` | N | boolean | `EMAIL_IGNORE_TLS` | Postgres connection URL (e.g. postgres://myuser:1234@127.0.0.1:5432/mydbname) |
| `templateDir` | Y | string | `EMAIL_TEMPLATE_DIRECTORY` | The directory where email templates can be found |

#### System

Accessible via `config.get('context.system.*')`.

| Name | Required | Type | Environment Var | Description |
| ---- | -------- | ---- | --------------- | ----------- |
| `environment` | N | string | `API_ENVIRONMENT` | The current environment (usually "development" or "production"; will also try NODE_ENV if not found) |
| `siteName` | N | string | `API_SITE_NAME` | The name of the site this API supports |
| `apiUrl` | N | string | `API_URL` | The URL of this API (defaults to "http://localhost:3000") |
| `clientUrl` | N | string | `API_CLIENT_URL` | The URL of the site this API supports (defaults to "http://localhost:3000") |
| `apiUrlPrefix` | N | string | `API_URL_PREFIX` | The prefix to all API endpoints (defaults to "/api") |
| `matchApi` | N | string | `API_MATCH_API` | A regular expression that matches URLs that are part of the API itself (defaults to "^" + the API URL prefix + "/") |
| `expressPath` | N | string | `API_EXPRESS_PATH` | The path to express on your filesystem (detected automatically if called from app.js) |

## License

[MIT](LICENSE)
