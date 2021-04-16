
class FeatureBase {

    constructor() {
        this.requiredContext = [];
        this.configSpec = {};
        this.name = null;
    }

    middleware(app) {}

    getRouters(app) {
        return null;
    }

    handlers(app) {}

}

module.exports = FeatureBase;
