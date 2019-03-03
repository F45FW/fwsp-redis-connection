const Redis = require('redis-fast-driver');
module.exports = {
  createClient: config => new Proxy(
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
  )
};
