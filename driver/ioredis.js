const Redis = require('ioredis');
module.exports =  {
  createClient: config => new Redis(config)
};
