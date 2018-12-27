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

async function setRole(uid, role, isOn = true, overwrite = false) {
  let user = await getUser(uid);
  let existingClaims = {};
  if (user.customClaims) {
    if (user.customClaims[role] === Boolean(isOn)) {
      console.log(`${role} privileges were already ${actionPhrase} ${user.displayName}`);
      return { customClaims: user.customClaims };
    }
    if (!overwrite) {
      existingClaims = user.customClaims;
    }
  }
  await admin.auth().setCustomUserClaims(
    uid,
    Object.assign(existingClaims, { [role]: Boolean(isOn) }));
  user = await getUser(uid);
  const actionPhrase = isOn ? 'given to' : 'removed from';
  console.log(`${role} privileges ${actionPhrase} ${user.displayName}`);
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

exports.onNewPost = functions.firestore
  .document('posts/{postId}')
  .onCreate((snap, context) => {
    console.log('content', snap.data().content);
  });

exports.setBanned = functions.https.onCall(async (data, context) => {
  checkIfAdmin(context);
  checkIfUid(data);
  if (data.isOn) {
    return await setRole(data.uid, 'banned', data.isOn, true);
  } else {
    await setRole(data.uid, 'banned', data.isOn);
    return await setRole(data.uid, 'validated', data.isOn);
  }
});

exports.setAvatar = functions.https.onCall(async (data, context) => {
  checkIfAdmin(context);
  checkIfUid(data);
  return await admin.auth().updateUser(data.uid, { photoURL: data.url });
});

exports.setValidated = functions.https.onCall(async (data, context) => {
  checkIfAdmin(context);
  checkIfUid(data);
  return await setRole(data.uid, 'validated', data.isOn);
});

exports.setModerator = functions.https.onCall(async (data, context) => {
  checkIfAdmin(context);
  checkIfUid(data);
  return await setRole(data.uid, 'mod', data.isOn);
});

exports.setAdmin = functions.https.onCall(async (data, context) => {
  checkIfAdmin(context);
  checkIfUid(data);
  return await setRole(data.uid, 'admin', data.isOn);
});

exports.eraseAllClaims = functions.https.onCall(async (data, context) => {
  checkIfAdmin(context);
  checkIfUid(data);
  let user = await getUser(data.uid);
  await admin.auth().setCustomUserClaims(data.uid, null);
  user = await getUser(data.uid);
  console.log(`All claims removed from ${user.displayName}`);
  return { customClaims: user.customClaims };
});

exports.getAllUsers = functions.https.onCall(async (data, context) => {
  const userProperties = [
    'uid',
    'displayName',
    'photoURL'
  ];
  const customClaimsProperties = [
    'admin',
    'mod'
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
    'mod'
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
