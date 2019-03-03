const RedisConnection = require('./index');
const RedisConnectionFactory = require('./lib/RedisConnectionFactory');

const url = 'redis://redis:6379/1';

const engine = 'ioredis';
const supportsAsync = false;

run().catch(console.error).then(() => process.exit(0));

async function run() {
  console.log('Testing single connection');
  await testSingleConnection();
  console.log('Testing cluster');
  await testCluster();
}

async function testSingleConnection() {
  console.log('Testing static factory method')
  const factory = await RedisConnectionFactory.Client({
    redisConfig: {url},
    engine,
    verbose: console.error
  });
  await doTests(factory);
  console.log('Testing normal construction');
  const conn = new RedisConnection({url});
  console.log({conn});
  const normal = await conn.connect();
  await doTests(normal);
}

async function testCluster() {
  const cluster = await RedisConnectionFactory.ElastiCluster({
    primary: {url},
    replicas: [{url}, {url}],
    engine,
    verbose: console.error
  });
  await doTests(cluster);
}

async function doTests(client) {
  console.log(`Performing tests on engine ${engine}`);
  if (supportsAsync) {
    console.log(await client.getAsync('abcdef'));
    console.log(await client.setAsync('abcdef', '123'));
    console.log(await client.getAsync('abcdef'));
    console.log(await client.expireAsync('abcdef', 10));
  } else {
    console.log(await client.get('abcdef'));
    console.log(await client.set('abcdef', '123'));
    console.log(await client.get('abcdef'));
    console.log(await client.expire('abcdef', 10));
  }
}