const functions = require('firebase-functions');
const firestore = require('./firestore');
const admin = require('./admin');

async function getUser(uid) {
  let user;
  try {
    user = await admin.auth().getUser(uid);
  } catch (e) {
    throw new functions.https.HttpsError('not-found', e.message);
  }
  return user;
}

function checkIfAdmin(context) {
  if (context && context.auth && !context.auth.token.admin) {
    throw new functions.https.HttpsError('permission-denied',
      'User is not an admin. Only admins can set moderators.');
  }
  throwIfBanned(context);
  throwIfNotValidated(context);
}

async function checkIfBanned(uid) {
  const user = await getUser(uid);
  if (user.disabled) {
    return true;
  }
  let dbBlacklisted = false;
  try {
    console.log('checking db blacklisted');
    dbBlacklisted = await firestore.collection('bannedUsers')
      .doc(uid)
      .get()
      .then(ref => {
        console.log('blacklist reference exists?:', ref.exists);
        return ref.exists;
      });
  } catch (e) {
    console.error(e);
    return false;
  }
  return dbBlacklisted;
}

async function throwIfBanned(context) {
  if (!context || !context.auth) return;
  const isBanned = await checkIfBanned(context.auth.uid);
  if (isBanned) throw new functions.https.HttpsError('permission-denied',
    'User is banned.');
}

async function throwIfNotValidated(context) {
  if (!context || !context.auth) return;
  const user = await getUser(context.auth.uid);
  if (!user.customClaims.validated) {
    throw new functions.https.HttpsError('permission-denied',
      'User is not validated.');
  }
  throwIfBanned(context);
}

function checkIfUid(data) {
  if (!data || !data.uid) {
    throw new functions.https.HttpsError('invalid-argument',
      'No uid prop provided.');
  }
}

function checkIfCodeValid (code) {
  return firestore.collection("invites").doc(code).get()
		.then(ref => {
			if (!ref.data()) {
				throw new Error(`Code ${code} not found.`);
			}
			if (ref.data().wasUsed === false) {
        console.log(`Code ${code} is a valid invite code.`);
				return true;
			} else {
				throw new Error(`Code ${code} has already been used.`);
			}
		});
}

async function clearClaims(data, context) {
  await checkIfAdmin(context);
  await checkIfUid(data);
  await throwIfBanned(context);
  let user = await getUser(data.uid);
  await admin.auth().setCustomUserClaims(data.uid, null);
  user = await getUser(data.uid);
  console.log(`All claims removed from ${user.displayName}`);
  return { customClaims: user.customClaims };
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

module.exports = {
  getUser,
  checkIfAdmin,
  checkIfBanned,
  throwIfBanned,
  throwIfNotValidated,
  checkIfUid,
  checkIfCodeValid,
  clearClaims,
  setClaim,
  revokeTokens
};
