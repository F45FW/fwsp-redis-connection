const Promise = require('bluebird');
const redis = require('redis');
const BaseRedisConnection = require('../lib/BaseRedisConnection');
Promise.promisifyAll(redis.RedisClient.prototype);
Promise.promisifyAll(redis.Multi.prototype);

class NodeRedisConnection extends BaseRedisConnection {
  supportsAsync() {
    return true;
  }
  createClient(config) {
    console.log('Creating redis client', {config});
    return redis.createClient(config);
  }
}

module.exports = NodeRedisConnection;