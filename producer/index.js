'use strict'

import Kafka from 'node-rdkafka';
import messageType from '../messageType.js';
import express from 'express';
import { uploadFile, getFileStream } from './s3.js';
import { graphQLClient, queryMessage, querySignUp, queryLogin, 
queryCreateGroup, queryJoinGroup, queryAddFriend, queryDeleteFriend,
queryLoginWithName, queryFriend } from './graphql.js';
const app = express();

import fs from 'fs';
import util from 'util';
const unlinkFile = util.promisify(fs.unlink);
import multer from 'multer';

import { __dirname } from '../dirname.js';

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'OPTIONS, POST, GET',
};

// kafka stream
const stream = Kafka.Producer.createWriteStream({
  'metadata.broker.list': 'kafka:9092'
}, {}, {
  topic: 'message'
});

stream.on('error', (err) => {
  console.error('Error in our kafka stream');
  console.error(err);
});

// for text parse
import BodyParser from 'body-parser';
const bodyParser = BodyParser.urlencoded({ extended: false });

// for image and video upload
var dir = `${__dirname}/producer/images`;
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

const fileStorageEngine = multer.diskStorage({
  destination: dir,
  filename: (req, file, cb) => {
    cb(null, Date.now() + "_" + file.originalname);
  },
});
const upload = multer({ storage: fileStorageEngine, limits: { fieldNameSize: 300, fileSize: 10485760 } }); // 100MB limit: 2^20 * 10

// web frontend
app.use(express.static('frontend'));

// send text to user
app.post('/user/:uid/text', bodyParser, async (req, res, next) => {
  console.log("send text to user")
  const from = req.body.from;
  const to = req.params.uid;
  console.log(from)
  console.log(to)
  if (from.length !== 24 || to.length !== 24) {
    res.writeHead(400, headers);
  } else {
    const type = 'text';
    const content = req.body.message;
    const level = 'user';
  
    const event = { from, to, type, content, level };
    console.log(event)
  
    const success = stream.write(messageType.toBuffer(event));
    if (success) {
      console.log(`user Message queued (${JSON.stringify(event)})`);
    } else {
      console.log('Something went wrong when queuing text...');
    }
    
    res.writeHead(200, headers);
    res.write(JSON.stringify(`${req.body.message}`));
  }
  res.end();

  next();
});

// send text to group
app.post('/group/:gid/text', bodyParser, async (req, res, next) => {
  console.log("send text to group")
  const from = req.body.from;
  const to = req.params.gid;
  console.log(from)
  console.log(to)
  if (from.length !== 24 || to.length !== 24) {
    res.writeHead(400, headers);
  } else {
    const type = 'text';
    const content = req.body.message;
    const level = 'group';

    const event = { from, to, type, content, level};
    console.log(event)

    const success = stream.write(messageType.toBuffer(event));
    if (success) {
      console.log(`group Message queued (${JSON.stringify(event)})`);
    } else {
      console.log('Something went wrong when queuing text...');
    }

    res.writeHead(200, headers);
    res.write(`${req.body.message}`);
  }
  res.end();

  next();
});

// send image to user
app.post('/user/:uid/image', upload.single("image"), async (req, res, next) => {
  console.log("send image to user")
  console.log(req.file);
  // uploading to AWS S3
  const result = await uploadFile(req.file);
  console.log("S3 response", result);
  // Deleting from local if uploaded in S3 bucket
  await unlinkFile(req.file.path);

  const keyOfObj = result['Key'];
  const bucket = result['Bucket'];
  const locOfObj = result['Location'];

  const from = req.body.from;
  const to = req.params.uid;
  console.log(from)
  console.log(to)
  if (from.length !== 24 || to.length !== 24) {
    res.writeHead(400, headers);
  } else {
    const type = 'image';
    const content = locOfObj;
    const level = 'user';

    const event = { from, to, type, content, level };
    console.log(event)

    const success = stream.write(messageType.toBuffer(event));
    if (success) {
      console.log(`user Message queued (${JSON.stringify(event)})`);
    } else {
      console.log('Something went wrong when queuing text...');
    }

    res.writeHead(200, headers);
    res.write(JSON.stringify(locOfObj));
  }
  
  res.end();

  next();
});

// send image to group
app.post('/group/:gid/image', upload.single("image"), async (req, res, next) => {
  console.log("send image to group")
  // uploading to AWS S3
  const result = await uploadFile(req.file);
  // Deleting from local if uploaded in S3 bucket
  await unlinkFile(req.file.path);

  const locOfObj = result['Location'];

  const from = req.body.from;
  const to = req.params.gid;
  console.log(from)
  console.log(to)
  if (from.length !== 24 || to.length !== 24) {
    res.writeHead(400, headers);
  } else {
    const type = 'image';
    const content = locOfObj;
    const level = 'group';
  
    const event = { from, to, type, content, level};
    console.log(event)
  
    const success = stream.write(messageType.toBuffer(event));
    if (success) {
      console.log(`group Message queued (${JSON.stringify(event)})`);
    } else {
      console.log('Something went wrong when queuing text...');
    }
  
    res.writeHead(200, headers);
    res.write(JSON.stringify(locOfObj));
  }
  
  res.end();

  next();
});

// send video to user
app.post('/user/:uid/video', upload.single("image"), async (req, res, next) => {
  console.log("send video to user")
  // uploading to AWS S3
  const result = await uploadFile(req.file);

  // Deleting from local if uploaded in S3 bucket
  await unlinkFile(req.file.path);

  const from = req.body.from;
  const to = req.params.uid;
  console.log(from)
  console.log(to)
  if (from.length !== 24 || to.length !== 24) {
    res.writeHead(400, headers);
  } else {
    const type = 'video';
    const content = result['Location'];
    const level = 'user';
  
    const event = { from, to, type, content, level };
    console.log(event)
  
    const success = stream.write(messageType.toBuffer(event));
    if (success) {
      console.log(`user Message queued (${JSON.stringify(event)})`);
    } else {
      console.log('Something went wrong when queuing text...');
    }
  
    res.writeHead(200, headers);
    res.write(JSON.stringify(content));
  }
  res.end();

  next();
});

// send video to group
app.post('/group/:gid/video', upload.single("image"), async (req, res, next) => {
  console.log("send video to group")
  // uploading to AWS S3
  const result = await uploadFile(req.file);
  // Deleting from local if uploaded in S3 bucket
  await unlinkFile(req.file.path);

  const locOfObj = result['Location'];

  const from = req.body.from;
  const to = req.params.gid;
  console.log(from)
  console.log(to)
  if (from.length !== 24 || to.length !== 24) {
    res.writeHead(400, headers);
  } else {
    const type = 'video';
    const content = locOfObj;
    const level = 'group';
  
    const event = { from, to, type, content, level};
    console.log(event)
  
    const success = stream.write(messageType.toBuffer(event));
    if (success) {
      console.log(`group Message queued (${JSON.stringify(event)})`);
    } else {
      console.log('Something went wrong when queuing text...');
    }
  
    res.writeHead(200, headers);
    res.write(JSON.stringify(locOfObj));
  }
  
  res.end();

  next();
});

app.get("/images/:key", (req, res) => {
  const key = req.params.key;
  const readStream = getFileStream(key);
  readStream.pipe(res);
});

// require messages through graphql
app.get("/user/:uid", async (req, res) => {
  const uid = req.params.uid;
  console.log(`require messages through graphql for ${uid}`);
  if (uid.length !== 24) {
    res.writeHead(400, headers);
  } else {
    const variables = {
      uid: uid,
    }
    const results = await graphQLClient.request(queryMessage, variables);
    console.log(results);
    res.writeHead(200, headers);
    res.write(JSON.stringify(results));
  }
  res.end();
})

// sign up through graphql
app.post("/user", bodyParser, async (req, res) => {
  console.log(req.body)
  const { username, password } = req.body;
  
  const variables = {
    username: username,
    password: password
  }
  console.log(variables)

  const results = await graphQLClient.request(querySignUp, variables);

  // console.log(results);
  res.writeHead(200, headers);
  res.write(JSON.stringify(results));
  res.end();
})

// login through graphql
app.post("/user/:uid", bodyParser, async (req, res) => {
  const uid = req.params.uid; // could be username
  if (uid.length > 10 && uid.length !== 24) {
    res.writeHead(400, headers);
  } else {
    const { password } = req.body;
  
    const variables = {
      password: password
    }
    let results = null;
    if (uid.length === 24) {
      variables['uid'] = uid;
      results = await graphQLClient.request(queryLogin, variables);
    } else {
      variables['name'] = uid;
      results = await graphQLClient.request(queryLoginWithName, variables);
    }
    
    if (results === null) {
      res.writeHead(400, headers);
    } else {
      res.writeHead(200, headers);
    }
    res.write(JSON.stringify(results));
  }
  res.end();
})

// create group
app.post("/group", bodyParser, async (req, res) => {
  const { groupname, created_by } = req.body;
  if (created_by.length !== 24) {
    res.writeHead(400, headers);
  } else {
    const variables = {
      groupname: groupname,
      created_by: created_by
    }
  
    const results = await graphQLClient.request(queryCreateGroup, variables);
    // console.log(results);
    res.writeHead(200, headers);
    res.write(JSON.stringify(results));
  }
  res.end();
})

// join group
app.post("/group/:gid", bodyParser, async (req, res) => {
  const from = req.body.from;
  const gid = req.params.gid;
  if (from.length !== 24 || gid.length !== 24) {
    res.writeHead(400, headers);
  } else {
    const variables = {
      uid: from,
      gid: gid
    }
  
    const results = await graphQLClient.request(queryJoinGroup, variables);
    // console.log(results);
    res.writeHead(200, headers);
    res.write(JSON.stringify(results));
  }
  res.end();
})

// add friend
app.post("/friend/:uid", bodyParser, async (req, res) => {
  const from = req.body.from;
  const uid2 = req.params.uid;
  if (from.length !== 24 || uid2.length !== 24) {
    res.writeHead(400, headers);
  } else {
    const variables = {
      uid1: from,
      uid2: uid2
    }
  
    const results = await graphQLClient.request(queryAddFriend, variables);
    // console.log(results);
    res.writeHead(200, headers);
    res.write(JSON.stringify(results));
  }
  res.end();
})

// delete friend
app.delete("/friend/:uid", bodyParser, async (req, res) => {
  const from = req.body.from;
  const uid = req.params.uid;
  if (from.length !== 24 || uid.length !== 24) {
    res.writeHead(400, headers);
  } {
    const variables = {
      uid1: from,
      uid2: uid
    }
  
    const results = await graphQLClient.request(queryDeleteFriend, variables);
    // console.log(results);
    res.writeHead(200, headers);
    res.write(JSON.stringify(results));
  }
  res.end();
})

// get all friends
app.get("/friend/:uid", bodyParser, async (req, res) => {
  const uid = req.params.uid;
  if (uid.length !== 24) {
    res.writeHead(400, headers);
  } else {
    const variables = {
      uid: uid
    }
  
    const results = await graphQLClient.request(queryFriend, variables);
    // console.log(results);
    res.writeHead(200, headers);
    res.write(JSON.stringify(results));
  }
  res.end();
})

app.listen(3000);
console.log("listening 3000");

// // send iamge to kafka (only support very small img)
// app.post('/send/image', async (req, res, next) => {
//   let image = '';
//     req.on('data', chunk => {
//       image += chunk;
//     });
//     req.on('end', () => {
//       console.log(typeof image)
//       const img = { image };
//       const success = stream.write(imageType.toBuffer(img));
//       if (success) {
//         console.log(`image queued`);
//       } else {
//         console.log(success)
//         console.log('image not queued');
//       }
//       res.end('DEVELOPING'); 
//       next();
//     });
//   res.writeHead(200);
//   res.write(JSON.stringify("yes"));
//   res.end();

//   next();
// });