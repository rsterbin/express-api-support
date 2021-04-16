const ContextBase = require('../base');

var path = require('path');

const contextConfig = require('./config.json');

class SystemContext extends ContextBase {

	constructor () {
        super();
        this.configSpec = contextConfig.spec;
        this.name = contextConfig.name;
        this.defaults = {
            environment: process.env.NODE_ENV || 'production',
            siteName: process.env.npm_package_name || '',
            apiUrl: 'http://localhost:3000',
            clientUrl: 'http://localhost:3000',
            apiUrlPrefix: '/api'
        };
        this.settings = null;
	}

    getSettings() {
        if (this.settings === null) {

            // Parent won't be set in the constructor, so detect here
            if (this.parent.calledFrom.match('\/app.js$')) {
                this.defaults.expressPath = path.dirname(this.parent.calledFrom);
            }

            // Loop through and fill settings
            this.settings = {};
            for (const name in this.defaults) {
                this.settings[name] = this.parent.context.config.get('context.system.' + name, this.defaults[name]);
            }

            // ...except for matchApi, which needs the final value of apiUrlPrefix to build its default
            this.settings.matchApi = this.parent.context.config.get('context.system.matchApi', '^' + this.settings.apiUrlPrefix + '/');

            // Finally, if we don't have expressPath, issue a warning
            //  -- it's not critical, but some stuff (notably, the react error
            //     handler) won't work as expected
            if (!this.settings.expressPath) {
                console.log('WARNING: the path to the express installation cannot be detected');
            }

        }
        return this.settings;
    }

    setting(key) {
         return this.getSettings()[key];
    }

    mailerPayload() {
        return {
            clientUrl: this.setting('clientUrl'),
            siteName: this.setting('siteName')
        };
    }

}

module.exports = new SystemContext();
