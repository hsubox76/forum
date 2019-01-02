const functions = require('firebase-functions');
const firestore = require('./firestore');
const admin = require('./admin');

// ***********************************
// Firestore triggers
// ***********************************
exports.onNewPost = functions.firestore
  .document('forums/{forumId}/threads/{threadId}/posts/{postId}')
  .onCreate(async (snap, context) => {
    const listUsersResult = await admin.auth().listUsers();
    const { threadId, forumId } = context.params;
    const newPostUid = snap.data().uid;
    const userIds = listUsersResult.users
      .filter(userRecord => userRecord.uid !== newPostUid)
      .map(userRecord => userRecord.uid);
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

exports.onDeletePost = functions.firestore
  .document('forums/{forumId}/threads/{threadId}/posts/{postId}')
  .onDelete(async (snap, context) => {
    const { threadId, forumId } = context.params;
    const postsUnreadBy = await firestore.collection(`forums/${forumId}/threads/${threadId}/posts`)
      .get()
      .then(posts => {
        const uidMap = {};
        posts.forEach(post => {
          post.data().unreadBy && post.data().unreadBy.forEach(unreadUid => {
            uidMap[unreadUid]  = true;
          });
        });
        return Object.keys(uidMap);
      })
      .catch(e => console.error(e));
    const threadsUnreadBy = await firestore.collection(`forums/${forumId}/threads`)
      .get()
      .then(threads => {
        const uidMap = {};
        threads.forEach(thread => {
          thread.data().unreadBy
            && thread.data().unreadBy.forEach(unreadUid => {
              uidMap[unreadUid]  = true;
            });
        });
        return Object.keys(uidMap);
      })
      .catch(e => console.error(e));
    const threadUpdate = firestore.doc(`forums/${forumId}/threads/${threadId}`).update({
      unreadBy: postsUnreadBy
    });
    const forumUpdate = firestore.doc(`forums/${forumId}`).update({
      unreadBy: threadsUnreadBy
    });
    return Promise.all([threadUpdate, forumUpdate])
      .catch(e => console.error(e));
  });

// ***********************************
// Auth triggers
// ***********************************
exports.onNewUser = functions.auth.user().onCreate((user) => {
  if (!user || !user.uid) {
    throw new Error('Could not read user or uid.');
  }
  return firestore.collection('users').doc(user.uid).add({
    isBanned: false
  });
});
