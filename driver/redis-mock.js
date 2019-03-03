const Promise = require('bluebird');
const BaseRedisConnection = require('../lib/BaseRedisConnection');

class MockRedisConnection extends BaseRedisConnection {
  supportsAsync() {
    return true;
  }
  createClient() {
    return Promise.promisifyAll(
      require('redis-mock').createClient()
    );
  }
}
module.exports = MockRedisConnection;
