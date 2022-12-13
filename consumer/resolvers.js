'use strict';

import { ObjectID } from "bson";

const resolvers = {
    Mutation: {
      userCreate: async (_, { userInput }, context) => {
        console.log("userCreate")
        // username cannot be the same
        let user = await context.db.collection('user').find({username: userInput['username']}).toArray().then();
        if (user.length !== 0) return null;

        let now = new Date();
        userInput['created_at'] = now;
        userInput['updated_at'] = now;
        let uid = (await context.db.collection('user').insertOne(userInput).then()).insertedId;
        return (await context.db.collection('user').find({_id: uid}).toArray().then())[0];
      },
      groupCreate: async (_, { groupInput }, context) => {
        console.log("groupCreate")
        groupInput['created_at'] = new Date();
        let gid = (await context.db.collection('group').insertOne(groupInput).then()).insertedId;
        // creator join group automatically
        let rid = (await context.db.collection('relation').insertOne({
          uid: new ObjectID(groupInput['created_by']), gid: new ObjectID(gid)
        }).then()).insertedId;
        return (await context.db.collection('group').find({_id: gid}).toArray().then())[0];
      },
      joinGroup: async (_, { uid, gid }, context) => {
        console.log("joinGroup")
        let rid = (await context.db.collection('relation').insertOne({
          uid: new ObjectID(uid), gid: new ObjectID(gid)
        }).then()).insertedId;
        return (await context.db.collection('relation').find({_id: rid}).toArray().then())[0];
      },
      addFriend: async (_, { uid1, uid2 }, context) => {
        console.log("addFriend")
        let friends = await context.db.collection('friend').find(
          {uid1: new ObjectID(uid1), uid2: new ObjectID(uid2)} || {uid1: new ObjectID(uid2), uid2: new ObjectID(uid1)}
        ).toArray().then();
        if (friends.length > 0) return null;

        let fid = (await context.db.collection('friend').insertOne({
          uid1: new ObjectID(uid1), uid2: new ObjectID(uid2)
        }).then()).insertedId;
        return (await context.db.collection('friend').find({_id: fid}).toArray().then())[0];
      },
      deleteFriend: async (_, { uid1, uid2 }, context) => {
        console.log("deleteFriend")
        let result1 = (await context.db.collection('friend').deleteOne({
          uid1: new ObjectID(uid1), uid2: new ObjectID(uid2)
        }).then());
        let result2 = (await context.db.collection('friend').deleteOne({
          uid1: new ObjectID(uid2), uid2: new ObjectID(uid1)
        }).then());
        if (result1.deletedCount === 1 || result2.deletedCount === 1) {
          return true;
        }
        return false;
      }
    },
    MessageBlock: {
      __resolveType(obj){
        // the obj is the original data from database instead of after GraphQL resolver
        if (obj.to) {
          return 'Umessage';
        } 
        if (obj.gid) {
          return 'Gmessage';
        }
        return null;
      }
    },
    Query: {
      message: async (_, { uid }, context) => {
        console.log(`message for ${uid}`)

        // get user last updating time
        let user = await context.loaders.user.load(uid);
        console.log(user)
        console.log(user._id)
        // get user messages in the window
        let now = new Date();
        let umessages = await context.db.collection('umessage').find(
          // {to: user._id, sent_at: {$gt: user.updated_at, $lte: now}}
          {$or: [{from: new ObjectID(user._id)}, {to: new ObjectID(user._id)}]}
        ).toArray().then();

        // get groups that this user's in
        let relations = await context.db.collection('relation').find({uid: user._id}).toArray().then();
        let gids = relations.map(({ gid }) => gid);

        // get group messages in the window, but sieve messages from self
        let gmessages = await context.db.collection('gmessage').find(
          // { gid: {$in: gids}, sent_at: {$gt: user.updated_at, $lte: now}, from: {$ne: new ObjectID(uid)}}
          { gid: {$in: gids} }
        ).toArray().then();

        // update user updating time
        await context.db.collection('user').updateOne({_id: new ObjectID(uid)}, {
          $set: {updated_at: now}
        }).then();
        context.loaders.user.clear(uid); // clear it from cache
        const res_gmes = gmessages.map(({ _id }) => context.loaders.gmessage.load(_id.toString()));
        const res_umes = umessages.map(({ _id }) => context.loaders.umessage.load(_id.toString()));
        return res_umes.concat(res_gmes);
      },
      user: async (_, { uid }, context) => {
        return context.loaders.user.load(uid);
      },
      login: async (_, { uid, password }, context) => {
        console.log("login")
        let user = await context.loaders.user.load(uid);
        if (user === null) return null;
        if (user['password'] !== password) return null;
        return user;
      },
      loginwithname: async (_, { name, password }, context) => {
        console.log("loginwithname")
        let user = await context.db.collection('user').find({username: name}).toArray().then();
        if (user.length === 0) return null;
        if (user[0]['password'] !== password) return null;
        return user[0];
      },
      friend: async (_, { uid }, context) => {
        console.log("get all friends")
        let friends = await context.db.collection('friend').find({$or: [{uid1: new ObjectID(uid)}, {uid2: new ObjectID(uid)}]}).toArray().then();
        const res = friends.map(({ uid1, uid2 }) => {
          let uid_ = (uid1.toString() === uid ? uid2 : uid1)
          return context.loaders.user.load(uid_.toString());
        });
        return res;
      }
    },
    User: {
      uid: ({ _id }, _, context) => {
        return _id;
      },
      username: ({ username }, _, context) => {
        return username;
      },
      password: ({ password }, _, context) => {
        return password;
      },
      created_at: ({ created_at }, _, context) => {
        return created_at.toISOString();
      },
      updated_at: ({ updated_at }, _, context) => {
        return updated_at.toISOString();
      }
    },
    Group: {
      gid: ({ _id }, _, context) => {
        return _id;
      },
      groupname: ({ groupname }, _, context) => {
        return groupname;
      },
      created_at: ({ created_at }, _, context) => {
        return created_at.toISOString();
      },
      created_by: ({ created_by }, _, context) => {
        return created_by;
      }
    },
    Relation: {
      rid: ({ _id }, _, context) => {
        return _id;
      },
      uid: ({ uid }, _, context) => {
        return uid;
      },
      gid: ({ gid }, _, context) => {
        return gid;
      }
    },
    Friend: {
      fid: ({ _id }, _, context) => {
        return _id;
      },
      uid1: ({ uid1 }, _, context) => {
        return uid1;
      },
      uid2: ({ uid2 }, _, context) => {
        return uid2;
      }
    },
    Umessage: {
      umid: ({ _id }, _, context) => {
        return _id;
      },
      from: ({ from }, _, context) => {
        return from;
      },
      to: ({ to }, _, context) => {
        return to;
      },
      content: ({ content }, _, context) => {
        return content;
      },
      type: ({ type }, _, context) => {
        return type;
      },
      sent_at: ({ sent_at }, _, context) => {
        return sent_at.toISOString();
      }
    },
    Gmessage: {
      gmid: ({ _id }, _, context) => {
        return _id;
      },
      group: ({ gid }, _, context) => {
        return gid;
      },
      from: ({ from }, _, context) => {
        return from;
      },
      content: ({ content }, _, context) => {
        return content;
      },
      type: ({ type }, _, context) => {
        return type;
      },
      sent_at: ({ sent_at }, _, context) => {
        return sent_at.toISOString();
      }
    }
  };

  export { resolvers };