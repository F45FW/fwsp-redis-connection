const RedisConnection = require('../index');
const ElastiCluster = require('./ElastiCluster');

class RedisConnectionFactory {

  // Static methods

  // For AWS ElasticCache w/ replication and Cluster-mode disabled
  static async ElastiCluster({
    primary,
    replicas,
    defaultRedisDb = 0,
    engine = 'redis',
    verbose = console.error
  }) {
    return await ElastiCluster(
      getEngineClass(engine),
      {primary, replicas, defaultRedisDb, verbose}
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
    const conn = new RedisConnection(redisConfig, defaultRedisDb, verbose);
    const EngineClass = getEngineClass(engine);
    this.redisEngine = new EngineClass(redisConfig, defaultRedisDb, verbose);
    return await conn.connect(options);
  }
}

function getEngineClass(name) {
  switch (name) {
    case 'ioredis': 
    case 'redis-mock':
    case 'redis':
    case 'redis-fast-driver':
      return require(`../driver/${name}`);
    default:
      throw new Error(`Unsupported Redis engine: ${name}`);
  }
}

module.exports = RedisConnectionFactory;
