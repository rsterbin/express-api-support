const ContextBase = require('../base');

const contextConfig = require('./config.json');

class ConfigContext extends ContextBase {

  constructor() {
    super();
    this.name = contextConfig.name;
    this.fetched = false;
    this.vals = {};
    this.spec = {};
  }

  invoke(spec, options) {
    this.spec = spec;
    this.vals = options;
  }

  bootstrap() {
    if (this.fetched) {
      return;
    }

    for (const key in this.spec) {
      this._bootstrapper(key, this.vals, this.spec[key]);
    }

    this.fetched = true;
  }

  _bootstrapper(key, area, spec, prefix = '') {
    const fullKey = prefix + key;

    // Find the value (and override from env if directed)
    let found = undefined;
    if (key in area) {
      found = area[key];
    }
    if (spec.from_env) {
      if (spec.from_env in process.env) {
        if (found === undefined) {
          found = process.env[spec.from_env];
          let parse = spec.type;
          if ('parse' in spec) {
            parse = spec.parse;
          } else if (typeof(spec.type) === 'function') {
            parse = null;
          }
          found = this._env_to_type(fullKey, found, parse, spec);
          this._override(this.vals, fullKey, found);
        }
      }
    }

    // If the spec is for a parent object, drill down
    if (spec.type === 'parent') {
      this._typeCheck(fullKey, found, 'object', spec);
      if ('children' in spec) {
        for (const subkey in spec.children) {
          this._bootstrapper(subkey, found, spec.children[subkey], fullKey + '.');
        }
      }

      // Otherwise, validate as directed
    } else {
      if (found === undefined) {
        if ('required' in spec && spec.required) {
          this._throwBootstrappingError('required', fullKey, spec);
        }
      } else if ('type' in spec) {
        this._typeCheck(fullKey, found, spec.type, spec);
      }
    }
  }

  _env_to_type(fullKey, found, parse, spec) {
    if (typeof(parse) === 'function') {
      try {
        return parse(found);
      } catch (e) {
        this._throwBootstrappingError('wrongtype', fullKey, spec, e);
      }
    }
    switch (parse) {
      case 'integer':
        return parseInt(found);
      case 'boolean':
        if (found === '1' || found === 'true') {
          return true;
        }
        if (found === '' || found === '0' || found === 'false') {
          return false;
        }
        this._throwBootstrappingError('wrongtype', fullKey, spec);
        break;
      case 'array':
        // falls through
      case 'object':
        // falls through
      case 'json':
        try {
          return JSON.parse(found);
        } catch (e) {
          this._throwBootstrappingError('wrongtype', fullKey, spec, e);
        }
        break;
      default:
        return found;
    }
  }

  _typeCheck(fullKey, found, expected, spec) {
    let ok = true;
    if (typeof(expected) === 'function') {
      try {
        if (!expected(found)) {
          ok = false;
        }
      } catch (e) {
        this._throwBootstrappingError('wrongtype', fullKey, spec, e);
      }
    } else {
      switch (expected) {
        case 'string':
          if (typeof(found) !== expected) {
            ok = false;
          }
          if ('values_allowed' in spec && Array.isArray(spec.values_allowed)) {
            let match = false;
            for (const val of spec.values_allowed) {
              if (found === val) {
                match = true;
              }
            }
            if (!match) {
              ok = false;
            }
          }
          break;
        case 'boolean':
          if (typeof(found) !== expected) {
            ok = false;
          }
          break;
        case 'integer':
          if (typeof(found) !== 'number' || !Number.isInteger(found)) {
            ok = false;
          }
          break;
        case 'array':
          if (!Array.isArray(found)) {
            ok = false;
          }
          break;
        case 'object':
          if (typeof(found) !== 'object' || found === null || Array.isArray(found)) {
            ok = false;
          }
          break;
      }
    }
    if (!ok) {
      this._throwBootstrappingError('wrongtype', fullKey, spec);
    }
  }

  _throwBootstrappingError(errtype, key, spec, err = null) {
    let generic = '';
    if (errtype == 'required') {
      generic = 'Config value "' + key + '" is required and cannot be found';
    } else if (errtype == 'wrongtype') {
      generic = 'Config value "' + key + '" is present but has the wrong type';
    } else {
      generic = 'Config value "' + key + '" has a problem';
    }
    // NB: Since config bootstrapping happens before we know the consoleLogErrors setting, always log
    let consoleErr = generic;
    if (spec.description) {
      consoleErr += '\n  - Key Description: ' + spec.description;
    }
    if (err !== null && 'message' in err) {
      consoleErr += '\n  - Source Error: ' + err.message;
    }
    console.log(consoleErr);
    // TODO: custom error to include all relevant data, ESPECIALLY source error
    throw new Error(generic + '; cannot proceed');
  }

  _override(pointTo, fullKey, newVal) {
    if (typeof(pointTo) !== 'object' || pointTo === null) {
      if (typeof(fullKey) !== 'string') {
        fullKey = fullKey.join('.');
      }
      throw new Error('Cannot override ' + fullKey + ' with new value');
    }
    if (typeof(fullKey) === 'string') {
      this._override(pointTo, fullKey.split('.'), newVal);
    } else if (fullKey.length === 1) {
      if (newVal === undefined) {
        delete pointTo[fullKey[0]];
      } else {
        pointTo[fullKey[0]] = newVal;
      }
    } else if (fullKey.length > 1) {
      this._override(pointTo[fullKey[0]], fullKey.slice(1), newVal);
    }
  }

  get(key, fallback = null) {
    if (!this.fetched) {
      this.bootstrap();
    }
    const search = key.split('.');
    return this._finder(search, this.vals, fallback);
  }

  _finder(search = [], area = {}, fallback = null) {
    if (search.length === 1) {
      if (search[0] in area) {
        return area[search[0]];
      } else {
        return fallback;
      }
    }
    if (search.length < 2) {
      return fallback;
    }
    let scopy = [ ...search ];
    let key = scopy.shift();
    if (key in area) {
      return this._finder(scopy, area[key], fallback);
    } else {
      return fallback;
    }
  }

  async destroy() {
    this.fetched = false;
    this.vals = {};
    this.spec = {};
  }

}

module.exports = new ConfigContext();
