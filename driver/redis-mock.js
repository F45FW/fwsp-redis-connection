const Promise = require('bluebird');
module.exports = {
  createClient: () => Promise.promisifyAll(
    require('redis-mock').createClient()
  )
};
