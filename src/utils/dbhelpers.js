import firebase from 'firebase/app';
import 'firebase/auth';
import 'firebase/firestore';
import 'firebase/functions';

const usersByUid = {};
const userPromisesByUid = {};

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

export function getDoc(collection, docId) {
	return firebase.firestore().collection(collection).doc(docId).get();
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

export function updatePost(content, postIds, props) {
	const db = firebase.firestore();
	const now = Date.now();
	const postData = {
			content,
			parentThread: props.threadId,
			createdTime: now,
			updatedTime: now
	};
	if (postIds) {
		// new 
		postData.uid = props.user.uid;
		return db.collection("posts").add(postData)
			.then((docRef) => {
				if (postIds) {
					updateThread(props.threadId, {
						updatedTime: now,
						updatedBy: props.user.uid,
						postIds: postIds.concat(docRef.id),
						['readBy.' + props.user.uid]: now
					}, props.forumId, {
						['readBy.' + props.user.uid]: now
					});
				}
				console.log("Document written with ID: ", docRef.id);
			});
	} else {
		postData.updatedBy = props.user.uid;
		return db.collection("posts")
			.doc(props.postId)
			.update(postData);
	}
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
export function getUser(uid) {
	if (usersByUid[uid] && usersByUid[uid].uid) {
		return Promise.resolve(usersByUid[uid]);
	} else if (userPromisesByUid[uid]) {
		return userPromisesByUid[uid];
	}
	const fetchUser = firebase.functions().httpsCallable('getUser');
	const doFetch = fetchUser({ uid }).then((response) => {
		// props.addUserByUid(uid, response.data);
		usersByUid[uid] = response.data;
		return response.data;
	});
	userPromisesByUid[uid] = doFetch;
	return doFetch;
}

export function getUsersByUid() {
	return { usersByUid, userPromisesByUid };
}