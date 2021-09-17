import firebase from "firebase/app";
import "firebase/auth";
import "firebase/firestore";
import "firebase/functions";
import "firebase/performance";
import pick from "lodash/pick";
import omit from "lodash/omit";
import { UserContextInterface } from "../components/UserContext";
import {
  UserPublic,
  Claims,
  ReactionType,
  PostReadFirestoreData,
  ForumFirestoreData,
  ThreadReadFirestoreData,
  ThreadWriteFirestoreData,
  Invite,
  PostWriteFirestoreData,
} from "./types";

let checkingIfBannedPromise: Promise<boolean> | null = null;

// ******************************************************************
// ADMIN MAINTENANCE
// ******************************************************************
export function toggleBan(uid: string, shouldBan: boolean) {
  const setBanned = firebase.functions().httpsCallable("setBanned");
  return setBanned({ uid, isOn: shouldBan });
}

export function toggleMod(uid: string, shouldMod: boolean) {
  const setClaim = firebase.functions().httpsCallable("setClaim");
  return setClaim({ claim: "mod", uid, isOn: shouldMod });
}

export function toggleVal(uid: string, shouldVal: boolean) {
  const setClaim = firebase.functions().httpsCallable("setClaim");
  return setClaim({ claim: "validated", uid, isOn: shouldVal });
}

// ******************************************************************
// ADMIN SPECIAL CASE
// ******************************************************************

export function verifyAllUsers(users: Array<{ uid: string }> | null) {
  if (!users) return;
  const setClaim = firebase.functions().httpsCallable("setClaim");
  const promiseList = users.map((user) =>
    setClaim({ claim: "validated", uid: user.uid, isOn: true })
  );
  return Promise.all(promiseList);
}

export function pwotAllUsers(users: Array<{ uid: string }> | null) {
  if (!users) return;
  const setClaim = firebase.functions().httpsCallable("setClaim");
  const promiseList = users.map((user) =>
    setClaim({ claim: "pwot", uid: user.uid, isOn: true })
  );
  return Promise.all(promiseList);
}

export function migrateAllAvatars() {
  const db = firebase.firestore();
  return db
    .collection("users")
    .get()
    .then((querySnapshot) => {
      const setAvatar = firebase.functions().httpsCallable("setAvatar");
      querySnapshot.forEach((doc) => {
        if (doc.data().avatarUrl) {
          setAvatar({ uid: doc.id, url: doc.data().avatarUrl });
        }
      });
    });
}

export async function migrateToTree() {
  const db = firebase.firestore();
  await db
    .collection("threads")
    .get()
    .then((q) => {
      const promises: Array<Promise<void>> = [];
      q.forEach((thread) => {
        const forumId = thread.data().forumId;
        promises.push(
          db
            .collection("forums")
            .doc(forumId)
            .collection("threads")
            .doc(thread.id)
            .set(thread.data())
        );
      });
      return Promise.all(promises);
    });
  db.collection("threads")
    .get()
    .then((q) => {
      q.forEach(async (thread) => {
        const postIds = thread.data().postIds;
        postIds.forEach(async (postId: string) => {
          const post = await db.collection("posts").doc(postId).get();
          db.collection("forums")
            .doc(thread.data().forumId)
            .collection("threads")
            .doc(thread.id)
            .collection("posts")
            .doc(post.id)
            .set(post.data() || {});
        });
      });
    });
  db.collection("threads")
    .get()
    .then((q) => {
      q.forEach(async (thread) => {
        updatePostCount(thread.data().forumId, thread.id);
      });
    });
}

// ******************************************************************
// DATABASE UPDATES
// ******************************************************************

/**
 * Attach and remove ID from fetched Firestore docs.
 */
export function createConverter<T extends { id: string }>() {
  return {
    toFirestore(data: T): firebase.firestore.DocumentData {
      return omit(data, "id");
    },
    fromFirestore(snapshot: firebase.firestore.QueryDocumentSnapshot): T {
      return { ...snapshot.data(), id: snapshot.id } as T;
    },
  };
}

export function createWriteConverter<T extends { [key:string]: any }>() {
  return {
    toFirestore(data: T): firebase.firestore.DocumentData {
      return omit(data, "id");
    },
    // Don't use.
    fromFirestore(snapshot: firebase.firestore.QueryDocumentSnapshot): T {
      return { ...snapshot.data() } as T;
    },
  };
}


export async function addDoc<T extends {}>(
  collectionPath: string,
  data: T
) {
  const converter = createWriteConverter<T>();
  try {
    return firebase
      .firestore()
      .collection(collectionPath)
      .withConverter(converter)
      .add(data);
  } catch (e) {
    console.error(`Error adding doc to ${collectionPath}.`);
  }
}

export async function getDoc<T extends { id: string }>(docPath: string) {
  const converter = createConverter<T>();
  try {
    const snap = await firebase
      .firestore()
      .doc(docPath)
      .withConverter(converter)
      .get();
    return snap.data();
  } catch (e) {
    console.error(`Error fetching ${docPath}.`);
  }
}

export async function getCollection<T extends { id: string }>(
  collectionPath: string
) {
  const converter = createConverter<T>();
  try {
    return firebase
      .firestore()
      .collection(collectionPath)
      .withConverter(converter)
      .get();
  } catch (e) {
    console.error(`Error fetching ${collectionPath}.`);
  }
}

export async function updateDoc<T extends { }>(
  docPath: string,
  data: { [key: string]: any }
) {
  const doc = await firebase.firestore().doc(docPath).get();
  if (!doc.exists) {
    console.warn(`Failed to update doc at ${docPath}: it does not exist.`);
    return Promise.resolve();
  }
  const converter = createWriteConverter<T>();
  return firebase
    .firestore()
    .doc(docPath)
    .withConverter(converter)
    .update(data)
    .catch((e) => console.error(e));
}

export function deleteDoc(docPath: string) {
  return firebase
    .firestore()
    .doc(docPath)
    .delete()
    .then(() => console.log(`${docPath} deleted`))
    .catch((e) => console.error(e));
}

export function deleteCollection(collectionPath: string) {
  return firebase
    .firestore()
    .collection(collectionPath)
    .get()
    .then((q) => {
      const deletePromises: Array<Promise<void>> = [];
      q.forEach((doc) => doc.ref.delete());
      return Promise.all(deletePromises);
    })
    .catch((e) => console.error(e));
}

export function updateReaction(
  uid: string,
  postPath: string,
  reactionType: ReactionType,
  shouldAdd: boolean
) {
  const operation = shouldAdd ? "arrayUnion" : "arrayRemove";
  updateDoc(postPath, {
    [`reactions.${reactionType}`]: firebase.firestore.FieldValue[operation](
      uid
    ),
  });
}

export async function updatePostCount(forumId: string, threadId: string) {
  const threadPosts = await firebase
    .firestore()
    .collection(`forums/${forumId}/threads/${threadId}/posts`)
    .get();
  updateDoc<ThreadWriteFirestoreData>(`forums/${forumId}/threads/${threadId}`, {
    postCount: threadPosts.size,
  });
}

export function updateReadStatus(
  didRead: boolean,
  user: firebase.User,
  postId: string,
  threadId: string,
  forumId: string
) {
  const operation = didRead ? "arrayRemove" : "arrayUnion";
  updateDoc<PostReadFirestoreData>(
    `forums/${forumId}/threads/${threadId}/posts/${postId}`,
    {
      unreadBy: firebase.firestore.FieldValue[operation](user.uid),
    }
  );
  updateDoc<ThreadWriteFirestoreData>(`forums/${forumId}/threads/${threadId}`, {
    unreadBy: firebase.firestore.FieldValue[operation](user.uid),
  });
  updateDoc<ForumFirestoreData>(`forums/${forumId}`, {
    unreadBy: firebase.firestore.FieldValue[operation](user.uid),
  });
}

export async function addPost(
  content: string,
  forum: ForumFirestoreData,
  thread: ThreadReadFirestoreData,
  user: firebase.User
) {
  const now = Date.now();
  const postData = {
    content,
    createdTime: now,
    updatedTime: now,
    uid: user.uid,
    unreadBy: [],
    reactions: {},
    parentForum: forum.id,
    parentThread: thread.id
  };
  await addDoc<PostWriteFirestoreData>(
    `forums/${forum.id}/threads/${thread.id}/posts`,
    postData
  );
  const postCountPromise = updatePostCount(forum.id, thread.id);
  const threadPromise = updateDoc<ThreadWriteFirestoreData>(
    `forums/${forum.id}/threads/${thread.id}`,
    {
      updatedTime: now,
      updatedBy: user.uid,
    }
  );
  const forumPromise = updateDoc<ForumFirestoreData>(`forums/${forum.id}`, {
    updatedBy: user.uid,
    updatedTime: now,
  });
  await Promise.all([postCountPromise, threadPromise, forumPromise]);
}

export function updatePost(
  content: string,
  postPath: string,
  user: firebase.User
) {
  const now = Date.now();
  const postData = {
    content,
    updatedTime: now,
    updatedBy: user.uid,
  };
  return updateDoc<PostReadFirestoreData>(postPath, postData);
}

// ******************************************************************
// USER DATA
// ******************************************************************

// Get claims of current user
export async function getClaims(): Promise<Claims> {
  const idTokenResult = await firebase.auth().currentUser?.getIdTokenResult();
  return idTokenResult?.claims || {};
}

// Get database banned listing
export async function getIsBanned(): Promise<boolean> {
  if (checkingIfBannedPromise) return checkingIfBannedPromise;
  if (!firebase.auth().currentUser) {
    return false;
  }
  const checkIfBanned = firebase.functions().httpsCallable("checkIfBanned");
  checkingIfBannedPromise = checkIfBanned()
    .then((response) => {
      checkingIfBannedPromise = null;
      return response.data;
    })
    .catch((e) => console.error(e));
  return checkingIfBannedPromise;
}

export function getAllUsers(getAllData: boolean) {
  const fetchAllUsers = firebase.functions().httpsCallable("getAllUsers");
  return fetchAllUsers({ getAll: getAllData })
    .then((response) => response.data)
    .catch((e) => console.error(e));
}

export async function getUser(
  uid: string,
  context: UserContextInterface,
  forceGet: boolean
) {
  if (context.usersByUid[uid] && !forceGet) {
    return context.usersByUid[uid];
  } else {
    return getDoc<UserPublic>(`usersPublic/${uid}`).then((user) => {
      user && context.addUserByUid(uid, user);
      return user;
    });
  }
}

export async function updateForumNotifications(
  uid: string,
  forumId: string,
  notificationsOn: boolean
) {
  firebase
    .firestore()
    .collection("users")
    .doc(uid)
    .update({
      "notifications.forums": notificationsOn
        ? firebase.firestore.FieldValue.arrayRemove(forumId)
        : firebase.firestore.FieldValue.arrayUnion(forumId),
    });
}

export async function updateThreadNotifications(
  uid: string,
  threadId: string,
  notificationsOn: boolean
) {
  firebase
    .firestore()
    .collection("users")
    .doc(uid)
    .update({
      "notifications.threads": notificationsOn
        ? firebase.firestore.FieldValue.arrayRemove(threadId)
        : firebase.firestore.FieldValue.arrayUnion(threadId),
    });
}

export async function getUsers(uids: string[], context: UserContextInterface) {
  if (uids && uids.length > 0) {
    const foundUsers: { [uid: string]: UserPublic } = {};
    const uidsToFetch: string[] = [];
    uids.forEach((uid) => {
      if (context.usersByUid[uid]) {
        foundUsers[uid] = context.usersByUid[uid];
      } else {
        uidsToFetch.push(uid);
      }
    });
    if (uidsToFetch.length > 0) {
      const trace = firebase.performance().trace("getUsersFromFirestore");
      trace.start();
      let fetchPromises = uidsToFetch.map((uid) => {
        return getDoc<UserPublic>(`usersPublic/${uid}`);
      });
      try {
        const results = await Promise.all(fetchPromises);
        trace.stop();
        let newUsers: { [uid: string]: UserPublic } = {};
        results.forEach((user) => {
          if (!user) return;
          foundUsers[user.id] = newUsers[user.id] = user;
        });
        context.mergeUsers(newUsers);
        return foundUsers;
      } catch (e) {
        console.error(e);
        trace.stop();
        return {};
      }
    } else {
      return foundUsers;
    }
  }
  return {};
}

// ******************************************************************
// INVITES
// ******************************************************************
export function getAllInvites() {
  const db = firebase.firestore();
  const converter = createConverter<Invite>();
  return db
    .collection("invites")
    .withConverter(converter)
    .get()
    .then((querySnapshot) => {
      const invites: Invite[] = [];
      querySnapshot.forEach((doc) => invites.push(doc.data()));
      return invites;
    });
}

export function getAllInvitesFor(uid: string) {
  const db = firebase.firestore();
  const converter = createConverter<Invite>();
  return db
    .collection("invites")
    .where("createdByUid", "==", uid)
    .withConverter(converter)
    .get()
    .then((querySnapshot) => {
      const invites: Invite[] = [];
      querySnapshot.forEach((doc) =>
        invites.push(Object.assign(doc.data(), { id: doc.id }))
      );
      return invites;
    });
}

export function generateInviteCode(
  createdByName: string,
  createdByUid: string
) {
  const db = firebase.firestore();
  return db
    .collection("invites")
    .add({
      wasUsed: false,
      createdAt: Date.now(),
      createdByName: createdByName,
      createdByUid: createdByUid,
    })
    .then((docRef) => {
      return docRef.id;
    });
}

interface NewUserFields {
  email: string; displayName: string; password: string
}
export function submitInviteCode(
  code: string,
  user: NewUserFields | firebase.User,
  shouldCreate = false
) {
  const processInviteCode = firebase
    .functions()
    .httpsCallable("processInviteCode");
  return processInviteCode({
    user: shouldCreate ? user : pick(user, ["uid", "displayName", "email"]),
    code,
    shouldCreate,
  });
}
