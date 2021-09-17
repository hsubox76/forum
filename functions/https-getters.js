const functions = require('firebase-functions');
const admin = require('./admin');
const firestore = require('./firestore');
const pick = require('lodash/pick');

const {
  getUser,
  checkIfUid,
  checkIfBanned,
  throwIfNotValidated
} = require('./utils.js');

const USER_PROPERTIES = {
  VIEWABLE_FOR_ALL: [
    'uid',
    'displayName',
    'photoURL',
    'metadata'
  ],
  VIEWABLE_FOR_ADMIN: [
    'email',
    'disabled'
  ]
};

const CUSTOM_CLAIMS_PROPERTIES = {
  VIEWABLE_FOR_ALL: [
    'admin',
    'mod',
    'pwot'
  ],
  VIEWABLE_FOR_ADMIN: [
    'banned',
    'validated'
  ]
}

exports.checkIfBanned = functions.https.onCall(async (data, context) => {
  if (context && context.auth && context.auth.uid) {
    return await checkIfBanned(context.auth.uid);
  }
  return false;
});

function getWhitelistedProperties(data, context) {
  let userProperties = USER_PROPERTIES.VIEWABLE_FOR_ALL;
  let customClaimsProperties = CUSTOM_CLAIMS_PROPERTIES.VIEWABLE_FOR_ALL;
  if (data && data.getAll &&
      context && context.auth && context.auth.token.admin) {
    userProperties =
      userProperties.concat(USER_PROPERTIES.VIEWABLE_FOR_ADMIN);
    customClaimsProperties =
      customClaimsProperties.concat(CUSTOM_CLAIMS_PROPERTIES.VIEWABLE_FOR_ADMIN);
  }
  return { userProperties, customClaimsProperties };
}

exports.getAllUsers = functions.https.onCall(async (data, context) => {
  await throwIfNotValidated(context);
  const { userProperties, customClaimsProperties } = getWhitelistedProperties(data, context);
  const listUsersResult = await admin.auth().listUsers();
  return listUsersResult.users.map(userRecord => {
    const newRecord = pick(userRecord, userProperties);
    const customClaims = userRecord.customClaims || {};
    newRecord.customClaims = pick(customClaims, customClaimsProperties);
    return newRecord;
  });
});

exports.getUsers = functions.https.onCall(async (data, context) => {
  await throwIfNotValidated(context);
  if (!data || !Array.isArray(data.uids)) {
    throw new functions.https.HttpsError('invalid-argument',
      'No uids array provided.');
  }
  const { userProperties, customClaimsProperties } = getWhitelistedProperties(data, context);
  const userFetches = data.uids.map(uid => {
    return getUser(uid).then(userRecord => {
      console.log('userRecord for', uid, userRecord);
      const newRecord = pick(userRecord, userProperties);
      const customClaims = userRecord.customClaims || {};
      newRecord.customClaims = pick(customClaims, customClaimsProperties);
      return newRecord;
    });
  });
  return Promise.all(userFetches)
    .then((data) => { console.log('successful user fetches', data); return data;})
    .catch(e => console.error(e));
});

exports.getUser = functions.https.onCall(async (data, context) => {
  await throwIfNotValidated(context);
  await checkIfUid(data);
  const { userProperties, customClaimsProperties } = getWhitelistedProperties(data, context);
  const userRecordPromise = getUser(data.uid);
  const userDataPromise = firestore.doc(`users/${data.uid}`).get().then(doc => doc.data());
  return Promise.all([userRecordPromise, userDataPromise])
    .then(([userRecord, userData]) => {
      const newRecord = pick(userRecord, userProperties);
      const customClaims = userRecord.customClaims || {};
      newRecord.customClaims = pick(customClaims, customClaimsProperties);
      // When more db-only fields are added, do a whitelist like with the userRecord
      newRecord.bio = userData.bio;
      return newRecord;
    })
    .catch(e => console.error(e));
});
