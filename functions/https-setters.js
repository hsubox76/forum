const functions = require('firebase-functions');
const firestore = require('./firestore');
const admin = require('./admin');

const {
  setClaim,
  checkIfAdmin,
  checkIfUid,
  checkIfCodeValid,
  clearClaims,
  revokeTokens,
  sendMail
} = require('./utils.js');

exports.setAvatar = functions.https.onCall(async (data, context) => {
  await checkIfAdmin(context);
  await checkIfUid(data);
  return await admin.auth().updateUser(data.uid, { photoURL: data.url });
});

exports.setClaim = functions.https.onCall(async (data, context) => {
  await checkIfAdmin(context);
  await checkIfUid(data);
  return await setClaim(data.uid, data.claim, data.isOn);
});

exports.setBanned = functions.https.onCall(async (data, context) => {
  await checkIfAdmin(context);
  await checkIfUid(data);
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

exports.testSendMail = functions.https.onCall(async (data, context) => {
  await checkIfAdmin(context);
  let userEmailList = [];
  try {
    const userListResult = await admin.auth().listUsers();
    userEmailList = userListResult.users.map(user => user.email);
  } catch (e) {
    console.error(e);
    return 'Error getting users.';
  }
  console.log('bcc', userEmailList.join(','));
  if (userEmailList.length) {
    return sendMail({
      to: 'hsubox@gmail.com',
      subject: 'The PWOT2 forum is up and running',
      content: `Hi, this is Wombat. You're getting this email because you
        signed up for the PWOT2 forum at www.pwot2.com at some point.  It's taken
        a while to ramp up but it's running and people are posting.  I've made
        everybody mods who originally signed up, and I set up single-use invite
        codes so you can invite people hopefully without getting random bad people
        wandering in.  Just a reminder in case you signed up and forgot about it
        because it wasn't working earlier or there wasn't much activity.  You can
        email me back at this address if you have any questions or run into bugs.`
    });
  } else {
    return 'error';
  }
});
