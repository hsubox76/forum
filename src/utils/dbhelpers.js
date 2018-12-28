import firebase from 'firebase/app';
import 'firebase/auth';
import 'firebase/firestore';
import 'firebase/functions';

export function getForum(props) {
	const db = firebase.firestore();
	const forum = props.forumsById[props.forumId];
  if (!forum) {
	  return db.collection("forums")
		.doc(props.forumId)
		.get()
		.then(doc => {
		  props.setForumData(
			null,
			Object.assign(
			  {}, props.forumsById, { [props.forumId]: doc.data() }
		  )
		);
		});
  }
}

export function getAllUsers(getAllData) {
	const fetchAllUsers = firebase.functions().httpsCallable('getAllUsers');
	return fetchAllUsers({ getAll: getAllData })
		.then(response => response.data)
		.catch(e => console.error(e));
}

export function getAllInvites() {
	const db = firebase.firestore();
	return db.collection("invites")
		.get()
		.then(querySnapshot => {
			const invites = [];
			querySnapshot.forEach(doc => invites.push(
				Object.assign(doc.data(), { id: doc.id })
			));
			return invites;
		});
}

export function toggleBan(uid, shouldBan) {
	const setBanned = firebase.functions().httpsCallable('setBanned');
	return setBanned({ uid, isOn: shouldBan });
}

export function toggleMod(uid, shouldMod) {
	const setModerator = firebase.functions().httpsCallable('setModerator');
	return setModerator({ uid, isOn: shouldMod });
}

export function getAllInvitesFor(uid) {
	const db = firebase.firestore();
	return db.collection("invites")
		.where("createdByUid", "==", uid)
		.get()
		.then(querySnapshot => {
			const invites = [];
			querySnapshot.forEach(doc => invites.push(
				Object.assign(doc.data(), { id: doc.id })
			));
			return invites;
		});
}

export function generateInviteCode(createdByName, createdByUid) {
	const db = firebase.firestore();
	return db.collection("invites")
		.add({
			wasUsed: false,
			createdAt: Date.now(),
			createdByName: createdByName,
			createdByUid: createdByUid
		})
		.then(docRef => {
			return docRef.id;
		});
}

export function verifyAllUsers(users) {
	const setValidated = firebase.functions().httpsCallable('setValidated');
	const promiseList = users.map(user => setValidated({ uid: user.uid, isOn: true }));
	return Promise.all(promiseList);
}

export function migrateAllAvatars() {
	const db = firebase.firestore();
	return db.collection("users")
		.get()
		.then(querySnapshot => {
			const setAvatar = firebase.functions().httpsCallable('setAvatar');
			querySnapshot.forEach(doc => {
				if (doc.data().avatarUrl) {
					setAvatar({ uid: doc.id, url: doc.data().avatarUrl });
				}
			});
		});
}

export function updateReaction(uid, postId, reactionType, shouldAdd) {
	const db = firebase.firestore();
	if (shouldAdd) {
		db.collection("posts").doc(postId).update({
				[`reactions.${reactionType}`]: firebase.firestore.FieldValue.arrayUnion(uid)
		});
	} else {
		db.collection("posts").doc(postId).update({
				[`reactions.${reactionType}`]: firebase.firestore.FieldValue.arrayRemove(uid)
		});
	}
}

export function updateDoc(collection, docId, data) {
	return firebase.firestore().collection(collection).doc(docId).update(data);
}

export function addDoc(collection, data) {
	return firebase.firestore().collection(collection).add(data);
}

export function addPost(content, forum, thread, user) {
	const now = Date.now();
	const postData = {
		content,
		parentThread: thread.id,
		createdTime: now,
		updatedTime: now,
		uid: user.uid
	};
	return addDoc('posts', postData)
		.then(docRef => {
			updateDoc('threads', thread.id, {
				updatedTime: now,
				updatedBy: user.uid,
				postIds: thread.postIds.concat(docRef.id),
				['readBy.' + user.uid]: now
			});
			updateDoc('forums', forum.id, {
				updatedBy: user.uid,
				updatedTime: now
			});
		});
}

export function updatePost(content, thread, postId, user) {
	const now = Date.now();
	const postData = {
			content,
			parentThread: thread.id,
			createdTime: now,
			updatedTime: now,
			updatedBy: user.uid
	};
	return updateDoc('posts', postId, postData);
}

export function updateThread(threadId, threadData, forumId, forumData) {
	const db = firebase.firestore();
	let requests = [];
	
	requests.push(db.collection("threads")
		.doc(threadId)
		.update(threadData));
		
	if (forumId) {
		const forumUpdates = forumData || {};
		if (threadData.updatedBy) {
			forumUpdates.updatedBy = threadData.updatedBy;
			forumUpdates.updatedTime = threadData.updatedTime;
		}
		requests.push(updateForum(forumId, forumUpdates));
	}
	return Promise.all(requests);
}

export function updateForum(forumId, forumData) {
	const db = firebase.firestore();
	return db.collection("forums")
		.doc(forumId)
		.update(forumData);
}

export function escapeRegExp(string){
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}

// Get claims of current user
export function getClaims() {
	return firebase.auth().currentUser.getIdTokenResult()
		.then((idTokenResult) => {
			return idTokenResult.claims;
		});
}

// Get user data of any user
export function getUser(uid, context) {
	const usersByUid = context.usersByUid;
	if (usersByUid[uid]) {
		if (usersByUid[uid].uid) {
			return Promise.resolve(usersByUid[uid]);
		} else if (usersByUid[uid].then) { // if there's a promise it's already being fetched
			return usersByUid[uid]; // return ongoing promise
		}
	}
	const fetchUser = firebase.functions().httpsCallable('getUser');
	const doFetch = fetchUser({ uid }).then((response) => {
		context.addUserByUid(uid, response.data);
		return response.data;
	});
	// add promise to map, it will be replaced with value when it comes
	context.addUserByUid(uid, doFetch);
	return doFetch;
}

export function deleteDoc(collection, docId) {
	return firebase.firestore().collection(collection)
		.doc(docId)
		.delete()
		.then(() => console.log(`${docId} deleted from collection ${collection}`))
		.catch(e => console.error(e));
}