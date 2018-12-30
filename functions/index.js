const functions = require('firebase-functions');
// Import and initialize the Firebase Admin SDK.
const admin = require('firebase-admin');
const pick = require('lodash/pick');

admin.initializeApp();

const firestore = admin.firestore();
firestore.settings({ timestampsInSnapshots: true });

async function getUser(uid) {
  let user;
  try {
    user = await admin.auth().getUser(uid);
  } catch (e) {
    throw new functions.https.HttpsError('not-found', e.message);
  }
  return user;
}

async function setClaim(uid, claim, isOn = true, overwrite = false) {
  let user = await getUser(uid);
  let existingClaims = {};
  const actionPhrase = isOn ? 'given to' : 'removed from';
  if (user.customClaims) {
    if (user.customClaims[claim] === Boolean(isOn)) {
      console.log(`${claim} claim was already ${actionPhrase} ${user.displayName}`);
      return { customClaims: user.customClaims };
    }
    if (!overwrite) {
      existingClaims = user.customClaims;
    }
  }
  await admin.auth().setCustomUserClaims(
    uid,
    Object.assign(existingClaims, { [claim]: Boolean(isOn) }));
  user = await getUser(uid);
  console.log(`${claim} claim ${actionPhrase} ${user.displayName}`);
  return { customClaims: user.customClaims };
}

function checkIfAdmin(context) {
  if (context && context.auth && !context.auth.token.admin) {
    throw new functions.https.HttpsError('permission-denied',
      'User is not an admin. Only admins can set moderators.');
  }
}

function checkIfUid(data) {
  if (!data || !data.uid) {
    throw new functions.https.HttpsError('invalid-argument',
      'No uid prop provided.');
  }
}

function revokeTokens(uid) {
  return admin.auth().revokeRefreshTokens(uid)
    .then(() => {
      return admin.auth().getUser(uid);
    })
    .then((userRecord) => {
      const timestamp = new Date(userRecord.tokensValidAfterTime).getTime() / 1000;
      console.log("Tokens revoked at: ", timestamp);
      return timestamp;
    })
    .catch(e => console.log(e));

}

exports.onNewPost = functions.firestore
  .document('forums/{forumId}/threads/{threadId}/posts/{postId}')
  .onCreate(async (snap, context) => {
    const listUsersResult = await admin.auth().listUsers();
    const { threadId, forumId } = context.params;
    const userIds = listUsersResult.users.map(userRecord => userRecord.uid);
    const postUpdate = snap.ref.update({
      unreadBy: userIds
    });
    const threadUpdate = firestore.doc(`forums/${forumId}/threads/${threadId}`).update({
      unreadBy: userIds
    });
    const forumUpdate = firestore.doc(`forums/${forumId}`).update({
      unreadBy: userIds
    });
    return Promise.all([postUpdate, threadUpdate, forumUpdate])
      .catch(e => console.error(e));
  });

//TODO: Figure something out about updating forum/thread unreads on post/thread deletes.

exports.setAvatar = functions.https.onCall(async (data, context) => {
  checkIfAdmin(context);
  checkIfUid(data);
  return await admin.auth().updateUser(data.uid, { photoURL: data.url });
});

exports.setClaim = functions.https.onCall(async (data, context) => {
  checkIfAdmin(context);
  checkIfUid(data);
  return await setClaim(data.uid, data.claim, data.isOn);
});

exports.setBanned = functions.https.onCall(async (data, context) => {
  checkIfAdmin(context);
  checkIfUid(data);
  if (data.isOn) {
    await clearClaims(data, context);
  }
  const roleResult = await setClaim(data.uid, 'banned', data.isOn);
  await firestore.doc(`users/${data.uid}`).update({
    isBanned: data.isOn
  });
  await revokeTokens(data.uid);
  return roleResult;
});

async function clearClaims(data, context) {
  checkIfAdmin(context);
  checkIfUid(data);
  let user = await getUser(data.uid);
  await admin.auth().setCustomUserClaims(data.uid, null);
  user = await getUser(data.uid);
  console.log(`All claims removed from ${user.displayName}`);
  return { customClaims: user.customClaims };
}

exports.eraseAllClaims = functions.https.onCall(clearClaims);

exports.getAllUsers = functions.https.onCall(async (data, context) => {
  const userProperties = [
    'uid',
    'displayName',
    'photoURL'
  ];
  const customClaimsProperties = [
    'admin',
    'mod',
    'pwot'
  ];
  if (data && data.getAll &&
      context && context.auth && context.auth.token.admin) {
    userProperties.push('email');
    customClaimsProperties.push('banned');
    customClaimsProperties.push('validated');
  }
  const listUsersResult = await admin.auth().listUsers();
  return listUsersResult.users.map(userRecord => {
    const newRecord = pick(userRecord, userProperties);
    const customClaims = userRecord.customClaims || {};
    newRecord.customClaims = pick(customClaims, customClaimsProperties);
    return newRecord;
  });
});

exports.getUser = functions.https.onCall(async (data, context) => {
  checkIfUid(data);
  const userProperties = [
    'uid',
    'displayName',
    'photoURL'
  ];
  const customClaimsProperties = [
    'admin',
    'mod',
    'pwot'
  ];
  if (data && data.getAll &&
      context && context.auth && context.auth.token.admin) {
    userProperties.push('email');
    customClaimsProperties.push('banned');
    customClaimsProperties.push('validated');
  }
  const userRecord = await admin.auth().getUser(data.uid);
  const newRecord = pick(userRecord, userProperties);
  const customClaims = userRecord.customClaims || {};
  newRecord.customClaims = pick(customClaims, customClaimsProperties);
  return newRecord;
});
