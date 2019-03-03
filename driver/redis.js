const Promise = require('bluebird');
const redis = require('redis');
Promise.promisifyAll(redis.RedisClient.prototype);
Promise.promisifyAll(redis.Multi.prototype);
module.exports = {
  createClient: redis.createClient
};
