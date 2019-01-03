const functions = require('firebase-functions');
const firestore = require('./firestore');
const admin = require('./admin');

const {
  setClaim,
  checkIfAdmin,
  checkIfUid,
  checkIfCodeValid,
  clearClaims,
  revokeTokens
} = require('./utils.js');

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
    try {
      await firestore.doc(`bannedUsers/${data.uid}`).set({ timestamp: Date.now() });
    } catch (e) {
      console.error(e);
    }
  } else {
    try {
      await firestore.doc(`bannedUsers/${data.uid}`).delete();
    } catch (e) {
      console.error(e);
    }
  }
  const banResult = await admin.auth().updateUser(data.uid, { disabled: data.isOn });
  try {
    await revokeTokens(data.uid);
  } catch (e) {
    console.error(e);
  }
  return banResult;
});

exports.eraseAllClaims = functions.https.onCall((clearClaims));
exports.processInviteCode = functions.https.onCall(async (data, context) => {
  try {
    await checkIfCodeValid(data.code);
  } catch (e) {
    console.error(e);
    return { error: e.message };
  }

  let user = data.user;
  if (data.shouldCreate) {
    if (!user || !user.displayName || !user.email || !user.password) {
      console.error('missing data fields');
      return { error: 'Error creating user.' };
    }
    try {
      user = await admin.auth().createUser({
        email: user.email,
        password: user.password,
        displayName: user.displayName
      });
      console.log('Created new user with uid' + user.uid);
    } catch (e) {
      console.error(e);
      return { error: 'Error creating user.' };
    }
  }

  const claimUpdate = setClaim(user.uid, 'validated', true);
  const { displayName, email }  = user;
  const inviteUpdate = firestore.collection("invites")
    .doc(data.code)
    .update({
      wasUsed: true,
      usedAt: Date.now(),
      usedBy: `${displayName} (${email})`
    });
  return await Promise.all([claimUpdate, inviteUpdate])
    .then(() => console.log(`Validated user ${displayName} / ${email}`))
    .catch(e => console.error(e));
});
