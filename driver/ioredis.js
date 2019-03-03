const Redis = require('ioredis');
const BaseRedisConnection = require('../lib/BaseRedisConnection');

class IORedisConnection extends BaseRedisConnection {
  supportsAsync() {
    return false;
  }
  createClient(config) {
    return new Redis(config);
  }
}

module.exports =  IORedisConnection;
