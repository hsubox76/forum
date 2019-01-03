const functions = require('firebase-functions');
const admin = require('./admin');
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

exports.getAllUsers = functions.https.onCall(async (data, context) => {
  throwIfNotValidated(context);
  let userProperties = USER_PROPERTIES.VIEWABLE_FOR_ALL;
  let customClaimsProperties = CUSTOM_CLAIMS_PROPERTIES.VIEWABLE_FOR_ALL;
  if (data && data.getAll &&
      context && context.auth && context.auth.token.admin) {
    userProperties =
      userProperties.concat(USER_PROPERTIES.VIEWABLE_FOR_ADMIN);
    customClaimsProperties =
      customClaimsProperties.concat(CUSTOM_CLAIMS_PROPERTIES.VIEWABLE_FOR_ADMIN);
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
  throwIfNotValidated(context);
  checkIfUid(data);
  let userProperties = USER_PROPERTIES.VIEWABLE_FOR_ALL;
  let customClaimsProperties = CUSTOM_CLAIMS_PROPERTIES.VIEWABLE_FOR_ALL;
  if (data && data.getAll &&
      context && context.auth && context.auth.token.admin) {
    userProperties =
      userProperties.concat(USER_PROPERTIES.VIEWABLE_FOR_ADMIN);
    customClaimsProperties =
      customClaimsProperties.concat(CUSTOM_CLAIMS_PROPERTIES.VIEWABLE_FOR_ADMIN);
  }
  const userRecord = await getUser(data.uid);
  const newRecord = pick(userRecord, userProperties);
  const customClaims = userRecord.customClaims || {};
  newRecord.customClaims = pick(customClaims, customClaimsProperties);
  return newRecord;
});
