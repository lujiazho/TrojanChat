import Kafka from 'node-rdkafka';
import messageType from '../messageType.js';

import express from 'express';
import { graphqlHTTP } from 'express-graphql';
import DataLoader from 'dataloader';
import { resolvers } from './resolvers.js';

import { readFileSync } from 'fs';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { MongoClient, ObjectID, } from 'mongodb';
import { __dirname } from '../dirname.js';

const app = express();

(async function () {
  const connection = new MongoClient(
    'mongodb://mongodb:27017',
    {"useUnifiedTopology":true}
  );
  await connection.connect(async function(err, cli) {
      if (err) process.exit(5);
  });

  const db = connection.db('ee547_final');

  var consumer = new Kafka.KafkaConsumer({
    'group.id': 'kafka',
    'metadata.broker.list': 'kafka:9092',
  }, {});
  
  consumer.connect();
  
  consumer.on('ready', () => {
    console.log('consumer ready..')
    consumer.subscribe(['message']);
    consumer.consume();
  }).on('data', async function(data) {
    const message = messageType.fromBuffer(data.value)
    console.log(`received message: ${message}`);
    if (message.level === 'user') {
      let params = {
        from: new ObjectID(message.from),
        to: new ObjectID(message.to),
        content: message.content,
        type: message.type,
        sent_at: new Date()
      }
      let umid = (await db.collection('umessage').insertOne(params).then()).insertedId;
      console.log(`inserted user message id: ${umid}`);
    }
    else if (message.level === 'group') {
      let params = {
        from: new ObjectID(message.from),
        gid: new ObjectID(message.to),
        content: message.content,
        type: message.type,
        sent_at: new Date()
      }
      let gmid = (await db.collection('gmessage').insertOne(params).then()).insertedId;
      console.log(`inserted group message id: ${gmid}`);
    }
  });

  const typeDefs = readFileSync(`${__dirname}/consumer/schema.graphql`).toString('utf-8')

  const schema = makeExecutableSchema({
    resolvers,
    resolverValidationOptions: {
      requireResolversForAllFields:  'warn',
      requireResolversToMatchSchema: 'warn'
    },
    typeDefs
  });

  app.get('/ping', (req, res, next) => {
    res.writeHead(204);
    res.end();
  });

  app.use('/graphql', graphqlHTTP(async (req) => {
    return {
      schema,
      graphiql: true,
      context: {
        db: db,
        loaders: {
          umessage: new DataLoader(umids => getUmessages(db, umids)),
          gmessage:  new DataLoader(gmids => getGmessages(db, gmids)),
          user: new DataLoader(uids => getUsers(db, uids))
        }
      }
    };
  }));

  app.listen(4000);
  console.log('GraphQL API server running at http://localhost:4000/graphql');
})()


// global scope
async function getUsers(db, uids) {
  console.log("func getUsers")
  let users = await db.collection('user').find({_id: {$in: uids.map(ObjectID)}}).toArray().then();
  const results = users.reduce((acc, user) => {
    acc[user._id.toString()] = user;
    return acc;
  }, {});
  return uids.map(uid => results[uid] || null);
}

async function getUmessages(db, umids) {
  console.log("func getUmessages")

  let ums = await db.collection('umessage').find({_id: {$in: umids.map(ObjectID)}}).toArray().then();
  const results = ums.reduce((acc, um) => {
    acc[um._id.toString()] = um;
    return acc;
  }, {});
  return umids.map(umid => results[umid] || null);
}

async function getGmessages(db, gmids) {
  // SHOULD PARAMETERIZE THE QUERY
  let gms = await db.collection('gmessage').find({_id: {$in: gmids.map(ObjectID)}}).toArray().then();
  const results = gms.reduce((acc, gm) => {
    console.log(gm._id)
    acc[gm._id.toString()] = gm;
    return acc;
  }, {});
  return gmids.map(gmid => results[gmid] || null);
}

