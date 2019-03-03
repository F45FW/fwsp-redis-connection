const RedisConnection = require('./index');

const url = 'redis://redis:6379/1';
const engine = 'redis';

run().catch(console.error).then(() => process.exit(0));

async function run() {
  console.log('Testing single connection');
  await testSingleConnection();
  console.log('Testing cluster');
  await testCluster();
}

async function testSingleConnection() {
  console.log('Testing static factory method')
  const factory = await RedisConnection.Client({
    redisConfig: {url},
    engine,
    verbose: console.error
  });
  await doTests(factory);
  console.log('Testing normal construction');
  const normal = await (new RedisConnection({url})).connect();
  await doTests(normal);
}

async function testCluster() {
  const cluster = await RedisConnection.ElastiCluster({
    primary: {url},
    replicas: [{url}, {url}],
    engine,
    verbose: console.error
  });
  await doTests(cluster);
}

async function doTests(client) {
  if (client.engineSupportsAsync()) {
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