import { gql, GraphQLClient } from 'graphql-request';

// for graphql interaction
const graphQLClient = new GraphQLClient('http://backend2:4000/graphql', {
  // headers: {
  //     authorization: 'Apikey ' + process.env.STEPZEN_API_KEY,
  // },
});

const queryMessage = gql`
query getMessage($uid: ID!){
  message(uid: $uid){
    ... on Umessage {
      content
      type
      from
      to
    }
    ... on Gmessage {
      content
      type
      group
      from
    }
  }
}
`;

const querySignUp = gql`
mutation signUp($username: String!, $password: String!){
    userCreate(userInput: {username: $username, password: $password}){
        uid
    }
}
`;

const queryLogin = gql`
query login($uid: ID!, $password: String!){
    login(uid: $uid, password: $password){
        uid
    }
}
`;

const queryLoginWithName = gql`
query loginwithname($name: String!, $password: String!){
  loginwithname(name: $name, password: $password){
        uid
    }
}
`;

const queryCreateGroup = gql`
mutation groupCreate($groupname: String!, $created_by: ID!){
    groupCreate(groupInput: {groupname: $groupname, created_by: $created_by}){
        created_at
        gid
    }
}
`;
const queryJoinGroup = gql`
mutation joinGroup($uid: String!, $gid: String!){
    joinGroup(uid: $uid, gid: $gid){
        rid
    }
}
`;

const queryAddFriend = gql`
mutation addFriend($uid1: String!, $uid2: String!){
  addFriend(uid1: $uid1, uid2: $uid2){
      fid
  }
}
`

const queryDeleteFriend = gql`
mutation deleteFriend($uid1: String!, $uid2: String!){
  deleteFriend(uid1: $uid1, uid2: $uid2)
}
`

const queryFriend = gql`
query friend($uid: ID!){
  friend(uid: $uid) {
    uid
    username
  }
}
`

export { graphQLClient, queryMessage, querySignUp, queryLogin, 
queryCreateGroup, queryJoinGroup, queryAddFriend, queryDeleteFriend, queryLoginWithName,
queryFriend };