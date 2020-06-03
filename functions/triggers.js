const functions = require("firebase-functions");
const firestore = require("./firestore");
const admin = require("./admin");
const { sendMail } = require("./utils");

// ***********************************
// Firestore triggers
// ***********************************
exports.onNewPost = functions.firestore
  .document("forums/{forumId}/threads/{threadId}/posts/{postId}")
  .onCreate(async (snap, context) => {
    const listUsersResult = await admin.auth().listUsers();
    const { threadId, forumId } = context.params;
    const newPostUid = snap.data().uid;
    const userIds = listUsersResult.users
      .filter((userRecord) => userRecord.uid !== newPostUid)
      .map((userRecord) => userRecord.uid);
    const postUpdate = snap.ref.update({
      unreadBy: userIds,
    });
    const threadUpdate = firestore
      .doc(`forums/${forumId}/threads/${threadId}`)
      .update({
        unreadBy: userIds,
      });
    const forumUpdate = firestore.doc(`forums/${forumId}`).update({
      unreadBy: userIds,
    });
    return Promise.all([postUpdate, threadUpdate, forumUpdate]).catch((e) =>
      console.error(e)
    );
  });

exports.notifyOnNewPost = functions.firestore
  .document("forums/{forumId}/threads/{threadId}/posts/{postId}")
  .onCreate(async (snap, context) => {
    // const listUsersResult = await admin.auth().listUsers();
    const { threadId, forumId } = context.params;
    const newPost = snap.data();
    const usersPromise = admin.firestore().collection("users").get();
    const threadPromise = admin
      .firestore()
      .collection("threads")
      .doc(threadId)
      .get();
    const forumPromise = admin
      .firestore()
      .collection("forums")
      .doc(forumId)
      .get();
    const [users, threadSnap, forumSnap] = await Promise.all([
      usersPromise,
      threadPromise,
      forumPromise
    ]);
    const thread = threadSnap.data();
    const forum = forumSnap.data();
    const emailsToNotify = [];
    let posterName = null;
    users.forEach((userSnap) => {
      const userData = userSnap.data();
      if (!userData) return;
      if (userSnap.id === newPost.uid) {
        posterName = userData.displayName;
      }
      if (!userData.notifications) return;
      const { forums, threads, all } = userData.notifications;
      if (
        all ||
        (forums && forums.includes(forumId) && userData.email) ||
        (threads && threads.includes(threadId) && userData.email)
      ) {
        emailsToNotify.push(userData.email);
      }
    });
    const sendPromises = emailsToNotify.map((email) =>
      sendMail({
        to: email,
        subject: `[PWOT2] New post by ${posterName} in ${forum.name}`,
        content: `There's been a new post on PWOT2 in a forum or thread that you have
turned on email notifications for.

Forum: ${forum.name}
Thread: ${thread.title}
By: ${posterName}
Excerpt: ${newPost.content.slice(0, 250)}${
          newPost.content.length > 250 ? "..." : ""
        }
Link to thread: https://www.pwot2.com/forum/${forumId}/thread/${threadId}?page=last`,
      })
    );
    return Promise.all(sendPromises);
  });

exports.onDeletePost = functions.firestore
  .document("forums/{forumId}/threads/{threadId}/posts/{postId}")
  .onDelete(async (snap, context) => {
    const { threadId, forumId } = context.params;
    const postsUnreadBy = await firestore
      .collection(`forums/${forumId}/threads/${threadId}/posts`)
      .get()
      .then((posts) => {
        const uidMap = {};
        posts.forEach((post) => {
          post.data().unreadBy &&
            post.data().unreadBy.forEach((unreadUid) => {
              uidMap[unreadUid] = true;
            });
        });
        return Object.keys(uidMap);
      })
      .catch((e) => console.error(e));
    const threadsUnreadBy = await firestore
      .collection(`forums/${forumId}/threads`)
      .get()
      .then((threads) => {
        const uidMap = {};
        threads.forEach((thread) => {
          thread.data().unreadBy &&
            thread.data().unreadBy.forEach((unreadUid) => {
              uidMap[unreadUid] = true;
            });
        });
        return Object.keys(uidMap);
      })
      .catch((e) => console.error(e));
    const threadUpdate = firestore
      .doc(`forums/${forumId}/threads/${threadId}`)
      .update({
        unreadBy: postsUnreadBy,
      });
    const forumUpdate = firestore.doc(`forums/${forumId}`).update({
      unreadBy: threadsUnreadBy,
    });
    return Promise.all([threadUpdate, forumUpdate]).catch((e) =>
      console.error(e)
    );
  });

// ***********************************
// Auth triggers
// ***********************************
exports.onNewUser = functions.auth.user().onCreate((user) => {
  if (!user || !user.uid) {
    throw new Error("Could not read user or uid.");
  }
  return firestore.collection("users").doc(user.uid).add({
    isBanned: false,
  });
});
