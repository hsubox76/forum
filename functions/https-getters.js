const functions = require('firebase-functions');
const admin = require('./admin');
const pick = require('lodash/pick');

const {
  getUser,
  checkIfUid,
  checkIfBanned,
  throwIfNotValidated
} = require('./utils.js');

exports.checkIfBanned = functions.https.onCall(async (data, context) => {
  if (context && context.auth && context.auth.uid) {
    return checkIfBanned(context.auth.uid);
  }
  return false;
});

exports.getAllUsers = functions.https.onCall(async (data, context) => {
  console.log(throwIfNotValidated);
  throwIfNotValidated(context);
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
  throwIfNotValidated(context);
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
  const userRecord = getUser(data.uid);
  const newRecord = pick(userRecord, userProperties);
  const customClaims = userRecord.customClaims || {};
  newRecord.customClaims = pick(customClaims, customClaimsProperties);
  return newRecord;
});
