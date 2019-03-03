
const Promise = require('bluebird');

class BaseRedisConnection {

  constructor(redisConfig, defaultRedisDb = 0, verbose = false) {
    console.log({redisConfig});
    this._initializeConfiguration(redisConfig, defaultRedisDb);
    this.verbose = verbose;
  }

  // Public methods

  // Establish single connection
  connect(options = {
    maxReconnectionAttempts: 6,
    maxDelayBetweenReconnections: 5
  }) {
    this.options = options;
    let reconnections = 0;
    return this._attempt(() => this._connect()).until(
      `max reconnection attempts (${reconnections}) reached`,
      () => ++reconnections > this.options.maxReconnectionAttempts
    );
  }

  createClient() {
    throw new Error('Dont use base class directly');
  }

  supportsAsync() {
    throw new Error('Dont use base class directly');
  }

  // Private methods
  _connect() {
    const connect = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('connection timed out'));
      }, this.options.maxDelayBetweenReconnections * 1000);      
      const db = this.createClient(this.redisConfig);
      db.once('ready', () => resolve(db));
      db.on('error', err => {
        clearTimeout(timeout);
        if (connect.isPending()) {
          return reject(err);
        }
      });
    });
    return connect;
  }
  _cmd(conn, prop, command) {
    const func = this.supportsAsync() ? conn.client[prop] : conn.client[command];
    this._info(`${this.constructor.name} [${command}]`);
    return func.bind(conn.client);
  }
  _initializeConfiguration(redisConfig, defaultRedisDb) {
    let url = {};
    if (redisConfig.url) {
      let parsedUrl = require('redis-url').parse(redisConfig.url);
      url = {
        host: parsedUrl.hostname,
        port: parsedUrl.port,
        db: parsedUrl.database
      };
      if (parsedUrl.password) {
        url.password = parsedUrl.password;
      }
    }
    this.redisConfig = Object.assign({ db: defaultRedisDb }, url, redisConfig);
    if (this.redisConfig.host) {
      delete this.redisConfig.url;
    }
  }
  _attempt(action) {
    let self = {
      until: (rejection, condition) => new Promise((resolve, reject) => {
        if (condition()) {
          return reject(new Error(rejection));
        }
        action()
          .then(resolve)
          .catch(() => resolve(self.until(rejection, condition)));
      })
    };
    return self;
  }
  _info(...args) {
    if (!this.verbose) {
      return;
    }
    this.verbose(...args);
  }
}

module.exports = BaseRedisConnection;
