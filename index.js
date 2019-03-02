
const Promise = require('bluebird');
const commands = require('redis-commands');

class RedisConnection {

  constructor(redisConfig, defaultRedisDb = 0, engine = 'redis', verbose = false) {
    this._initializeConfiguration(redisConfig, defaultRedisDb);
    this._initializeEngine(engine);
    this.verbose = verbose;
  }

  // Public methods

  // For AWS ElasticCache w/ replication and Cluster-mode disabled
  static async ElastiCluster({
    primary,
    replicas,
    defaultRedisDb = 0,
    engine = 'redis',
    verbose = true
  }) {
    const _info = (...args) => verbose && console.log(...args);
    _info('Establishing connections to each node in cluster...');
    const [primaryConn, ...replicaConns] = await Promise.map(
      [primary, ...replicas],
      async (redisConfig, index) => {
        const conn = new RedisConnection(redisConfig, defaultRedisDb, engine, verbose)
        const displayName = index ? `slave ${index}` : 'master';
        _info(`Connecting to ${displayName}...`);
        const client = await conn.connect();
        _info(`Connected to ${displayName}`);
        client.on('reconnecting', () => {
          _info(`redis event [${displayName}] reconnecting`);
        })
        .on('warning', (warning) => {
          _info(`redis event [${displayName}] warning: ${warning}`);
        })
        .on('end', () => {
          _info(`redis event [${displayName}] end (disconnect)`);
        })
        .on('error', (err) => {
          _info(`redis event [${displayName}] error: ${err}`);
        });
        return {displayName, conn, client};
      }
    );
    return new Proxy({}, {
      get: function(target, prop) {
        if (prop === 'then' || prop === 'catch') {
          // pass then through for Promises
          return target[prop];
        }
        const command = prop.endsWith('Async')
          ? prop.replace(/Async$/, '')
          : prop;
        _info({redisCommand: command.toUpperCase()});
        if (commands.hasFlag(command, 'readonly')) {
          _info(`Sending ${command} to random read-only replica`);
          const replica = replicaConns[~~(replicaConns.length * Math.random())];
          return replica.conn._cmd(replica, prop, command);
        }
        _info(`Sending ${command} to primary`);
        return primaryConn.conn._cmd(primaryConn, prop, command);
      }
    });
  }

  // Establish connection
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
    const func = this.engine === 'ioredis' ? conn.client[command] : conn.client[prop];
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
    let redisMockClient;
    switch (engine) {
      case 'ioredis':
        const Redis = require('ioredis');
        this.redisEngine = {createClient: config => new Redis(config)};
        break;
      case 'redis-mock':
        this.redisEngine = {createClient: () => {
          if (redisMockClient) {
            return redisMockClient;
          }
          return redisMockClient = Promise.promisifyAll(
            require('redis-mock').createClient()
          );
        }};
        break;
      case 'redis':
        this.redisEngine = require('redis');
        Promise.promisifyAll(this.redisEngine.RedisClient.prototype);
        Promise.promisifyAll(this.redisEngine.Multi.prototype);
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
    console.log(...args);
  }
}

module.exports = RedisConnection;
