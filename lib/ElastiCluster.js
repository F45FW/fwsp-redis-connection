const Promise = require('bluebird');
const commands = require('redis-commands');

async function ElastiCluster(RedisConnection, {primary, replicas, defaultRedisDb, verbose}) {
  const _info = (...args) => verbose && verbose(...args);
  _info('Establishing connections to each node in cluster...');
  const [primaryConn, ...replicaConns] = await Promise.map(
    [primary, ...replicas],
    async (redisConfig, index) => {
      const conn = new RedisConnection(redisConfig, defaultRedisDb, verbose)
      const displayName = index ? `slave ${index}` : 'master';
      _info(`Connecting to ${displayName}...`);
      const client = await conn.connect();
      _info(`Connected to ${displayName}`);
      client.on('reconnecting', () => {
        _info(`redis event [${displayName}] reconnecting`);
      })
      .on('warning', (warning) => {
        _info(`redis event [${displayName}] warning: ${warning}`);
      })
      .on('end', () => {
        _info(`redis event [${displayName}] end (disconnect)`);
      })
      .on('error', (err) => {
        _info(`redis event [${displayName}] error: ${err}`);
      });
      return {displayName, conn, client};
    }
  );
  return new Proxy({}, {
    get: function(target, prop) {
      if (prop === 'then' || prop === 'catch' || prop === 'inspect' || typeof prop === 'symbol') {
        // pass then through for Promises
        return target[prop];
      }
      const command = prop.endsWith('Async')
        ? prop.replace(/Async$/, '')
        : prop;
      _info({redisCommand: command.toUpperCase()});
      if (commands.hasFlag(command, 'readonly')) {
        _info(`Sending ${command} to random read-only replica`);
        const replica = replicaConns[~~(replicaConns.length * Math.random())];
        return replica.conn._cmd(replica, prop, command);
      }
      _info(`Sending ${command} to primary`);
      return primaryConn.conn._cmd(primaryConn, prop, command);
    }
  });
}
module.exports = ElastiCluster;
