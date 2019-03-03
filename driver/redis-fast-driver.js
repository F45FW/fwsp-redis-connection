const Redis = require('redis-fast-driver');
const BaseRedisConnection = require('../lib/BaseRedisConnection');

class RedisFastDriverConnection extends BaseRedisConnection {
  supportsAsync() {
    return false;
  }
  createClient(config) {
    return new Proxy(
      new Redis(config),
      {
        get: (target, prop) => {
          if (target[prop] || ['then', '_eventsCounts'].includes(prop)) {
            console.log(`Passthrough for ${prop}`);
            return target[prop];
          }
          console.log({target, prop});
          return (...args) => {
            const argArray = [prop, ...args];
            console.log('Performing rawCall with redis-driver-fast (a)', {argArray});
            return target.rawCallAsync.call(target, argArray);
          }; 
        }
      }
    );
  }
  _cmd(conn, prop, command) {
    return (...args) => {
      const argArray = [command, ...args];
      this._info('Performing rawCall with redis-driver-fast', {argArray});
      return conn.client.rawCallAsync.call(conn.client, argArray);
    };
  }
}

module.exports = RedisFastDriverConnection;
