# fwsp-redis-connection

## Synopsis

### Require the module

```javascript
const RedisConnection = require('fwsp-redis-connection');
const url = 'redis://127.0.0.1:6379';
```

### Establish a single connection to a Redis server

```javascript
// factory method
client = await RedisConnection.Client({
  redisConfig: {url},
  engine: 'redis',         // can be any supported redis engine
  defaultRedisDb: 7,       // db=0 by default
  verbose: console.error   // verbose output to stderr
});

// normal constructor
client = await (new RedisConnection({url}, 7, 'redis', console.error)).connect();
```

### Establish a clustered connection to AWS ElastiCache with **Cluster-mode disabled**

```javascript
// behaves like a normal redis client
// readonly operations are automatically sent to random replicas
// writes are sent to the primary
client = await RedisConnection.ElastiCluster({
  primary: {url},
  replicas: [{url}, {url}],
  engine,
  verbose: console.error
});
```

## Supported Engines

| NPM Package | Github
| --- | ---
| `redis` | [node_redis](https://github.com/NodeRedis/node_redis)
| `ioredis` | [ioredis](https://github.com/luin/ioredis)
| `redis-mock` | [redis-mock](https://github.com/yeahoffline/redis-mock)
| `redis-fast-driver` | [redis-fast-driver](https://github.com/h0x91b/redis-fast-driver)
