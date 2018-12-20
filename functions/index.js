const functions = require('firebase-functions');
// Import and initialize the Firebase Admin SDK.
const admin = require('firebase-admin');

var serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://forum-a5979.firebaseio.com'
});

exports.onNewPost = functions.firestore
    .document('posts/{postId}')
    .onCreate((snap, context) => {
        console.log('content', snap.data().content);
    });

async function setRole(uid, role, isSet) {
    let user;
    try {
        user = await admin.auth().getUser(uid);
    } catch (e) {
        throw new functions.https.HttpsError('not-found', e.message);
    }
    const existingClaims = user.customClaims || {};
    await admin.auth().setCustomUserClaims(
        uid,
        Object.assign(existingClaims, { [role]: isSet }));
    user = await admin.auth().getUser(uid);
    console.log(`${role} privileges given to ${user.displayName}`);
    return { customClaims: user.customClaims };
}

exports.makeModerator = functions.https.onCall(async (data) => {
    if (!data || !data.uid) {
        throw new functions.https.HttpsError('invalid-argument',
            'No uid prop provided.');
        return Promise.reject('No uid prop provided');
    }
    return await setRole(data.uid, 'mod', true);
});

exports.makeAdmin = functions.https.onCall(async (data) => {
    if (!data || !data.uid) {
        throw new functions.https.HttpsError('invalid-argument',
            'No uid prop provided.');
    }
    return await setRole(data.uid, 'admin', true);
});

exports.eraseAllClaims = functions.https.onCall(async (data) => {
    const uid = data.uid;
    let user;
    try {
        user = await admin.auth().getUser(uid);
    } catch (e) {
        throw new functions.https.HttpsError('not-found', e.message);
    }
    await admin.auth().setCustomUserClaims(uid, null);
    user = await admin.auth().getUser(uid);
    console.log(`All claims removed from ${user.displayName}`);
    return { customClaims: user.customClaims };
});
