
const Promise = require('bluebird');
const Cluster = require('./lib/cluster');

const ASYNC_ENGINE = {
  'redis': true,
  'redis-mock': true
};

class RedisConnection {

  constructor(redisConfig, defaultRedisDb = 0, engine = 'redis', verbose = false) {
    this._initializeConfiguration(redisConfig, defaultRedisDb);
    this._initializeEngine(engine);
    this.verbose = verbose;
  }

  // Static methods

  // For AWS ElasticCache w/ replication and Cluster-mode disabled
  static async ElastiCluster({
    primary,
    replicas,
    defaultRedisDb = 0,
    engine = 'redis',
    verbose = console.error
  }) {
    return await Cluster(
      RedisConnection,
      {primary, replicas, defaultRedisDb, engine, verbose}
    );
  }

  // Establish single connection w/o constructor
  static async Client({
    redisConfig,
    defaultRedisDb = 0,
    engine = 'redis',
    verbose = console.error,
    options = {
      maxReconnectionAttempts: 6,
      maxDelayBetweenReconnections: 5
    }
  }) {
    const conn = new RedisConnection(redisConfig, defaultRedisDb, engine, verbose);
    return await conn.connect(options);
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

  // check if <cmd>Async methods are supported
  engineSupportsAsync() {
    return ASYNC_ENGINE[this.engine] || false;
  }

  // Private methods
  _connect() {
    let self = new Promise((resolve, reject) => {
      let timeout = setTimeout(() => {
        reject(new Error('connection timed out'));
      }, this.options.maxDelayBetweenReconnections * 1000);
      let db = this.redisEngine.createClient(this.redisConfig);
      db.once('ready', () => resolve(db));
      db.on('error', err => {
        clearTimeout(timeout);
        if (self.isPending()) {
          return reject(err);
        }
      });
    });
    return self;
  }
  _cmd(conn, prop, command) {
    if (this.engine === 'redis-fast-driver') {
      return (...args) => {
        const argArray = [command, ...args];
        this._info('Performing rawCall with redis-driver-fast', {argArray});
        return conn.client.rawCallAsync.call(conn.client, argArray);
      };
    }
    const func = ASYNC_ENGINE[this.engine] ? conn.client[prop] : conn.client[command];
    this._info(`${this.engine} [${command}]`);
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
  _initializeEngine(engine) {
    switch (engine) {
      case 'ioredis': 
      case 'redis-mock':
      case 'redis':
      case 'redis-fast-driver':
        this.redisEngine = require(`./driver/${engine}`);
        break;
      default:
        throw new Error(`Unsupported Redis engine: ${engine}`);
    }
    this.engine = engine;
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

module.exports = RedisConnection;
