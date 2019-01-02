import firebase from 'firebase/app';
import 'firebase/auth';
import 'firebase/firestore';
import 'firebase/functions';
import pick from 'lodash/pick';

let checkingIfBannedPromise = null;

// ******************************************************************
// ADMIN MAINTENANCE
// ******************************************************************
export function toggleBan(uid, shouldBan) {
	const setBanned = firebase.functions().httpsCallable('setBanned');
	return setBanned({ uid, isOn: shouldBan });
}

export function toggleMod(uid, shouldMod) {
	const setClaim = firebase.functions().httpsCallable('setClaim');
	return setClaim({ claim: 'mod', uid, isOn: shouldMod });
}

export function toggleVal(uid, shouldVal) {
	const setClaim = firebase.functions().httpsCallable('setClaim');
	return setClaim({ claim: 'validated', uid, isOn: shouldVal });
}

// ******************************************************************
// ADMIN SPECIAL CASE
// ******************************************************************

export function verifyAllUsers(users) {
	const setClaim = firebase.functions().httpsCallable('setClaim');
	const promiseList = users.map(user => setClaim({ claim: 'validated', uid: user.uid, isOn: true }));
	return Promise.all(promiseList);
}

export function pwotAllUsers(users) {
	const setClaim = firebase.functions().httpsCallable('setClaim');
	const promiseList = users.map(user => setClaim({ claim: 'pwot', uid: user.uid, isOn: true }));
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

export async function migrateToTree() {
	const db = firebase.firestore();
	await db.collection("threads").get()
		.then(q => {
			const promises = [];
			q.forEach(thread => {
				const forumId = thread.data().forumId;
				promises.push(() => db.collection("forums")
					.doc(forumId)
					.collection("threads")
					.doc(thread.id)
					.set(thread.data()));
			});
			return Promise.all(promises);
		});
	db.collection("threads").get()
		.then(q => {
			q.forEach(async thread => {
				const postIds = thread.data().postIds;
				postIds.forEach(async postId => {
					const post = await db.collection("posts").doc(postId).get();
					db.collection('forums')
						.doc(thread.data().forumId)
						.collection("threads")
						.doc(thread.id)
						.collection("posts")
						.doc(post.id)
						.set(post.data());
				});
			})
		});
		db.collection("threads").get()
			.then(q => {
				q.forEach(async thread => {
					updatePostCount(thread.data().forumId, thread.id);
				})
			});
}

// ******************************************************************
// DATABASE UPDATES
// ******************************************************************

export function addDoc(collectionPath, data) {
	return firebase.firestore().collection(collectionPath)
		.add(data)
		.catch(e => console.error(e));
}

export function updateDoc(docPath, data) {
	return firebase.firestore()
		.doc(docPath)
		.update(data)
		.catch(e => console.error(e));
}

export function deleteDoc(docPath) {
	return firebase.firestore()
		.doc(docPath)
		.delete()
		.then(() => console.log(`${docPath} deleted`))
		.catch(e => console.error(e));
}

export function deleteCollection(collectionPath) {
	return firebase.firestore()
		.collection(collectionPath)
		.get()
		.then(q => {
			const deletePromises = [];
			q.forEach(doc => doc.ref.delete());
			return Promise.all(deletePromises);
		})
		.catch(e => console.error(e));
}

export function updateReaction(uid, postPath, reactionType, shouldAdd) {
	const operation = shouldAdd ? 'arrayUnion' : 'arrayRemove';
	updateDoc(postPath, {
		[`reactions.${reactionType}`]: firebase.firestore.FieldValue[operation](uid)
	});
}

export async function updatePostCount(forumId, threadId) {
	const threadPosts = await firebase.firestore()
		.collection(`forums/${forumId}/threads/${threadId}/posts`)
		.get();
	updateDoc(`forums/${forumId}/threads/${threadId}`, {
		postCount: threadPosts.size
	});
}

export function updateReadStatus(didRead, user, postId, threadId, forumId) {
	const operation = didRead ? 'arrayRemove' : 'arrayUnion';
	updateDoc(`forums/${forumId}/threads/${threadId}/posts/${postId}`, {
		unreadBy: firebase.firestore.FieldValue[operation](user.uid)
	});
	updateDoc(`forums/${forumId}/threads/${threadId}`, {
		unreadBy: firebase.firestore.FieldValue[operation](user.uid)
	});
	updateDoc(`forums/${forumId}`, {
		unreadBy: firebase.firestore.FieldValue[operation](user.uid)
	});
}

export function addPost(content, forum, thread, user) {
	const now = Date.now();
	const postData = {
		content,
		parentForum: forum.id,
		parentThread: thread.id,
		createdTime: now,
		updatedTime: now,
		uid: user.uid
	};
	return addDoc(`forums/${forum.id}/threads/${thread.id}/posts`, postData)
		.then(docRef => {
			updatePostCount(forum.id, thread.id);
			updateDoc(`forums/${forum.id}/threads/${thread.id}`, {
				updatedTime: now,
				updatedBy: user.uid
			});
			updateDoc(`forums/${forum.id}`, {
				updatedBy: user.uid,
				updatedTime: now
			});
		});
}

export function updatePost(content, postPath, user) {
	const now = Date.now();
	const postData = {
			content,
			createdTime: now,
			updatedTime: now,
			updatedBy: user.uid
	};
	return updateDoc(postPath, postData);
}

// ******************************************************************
// USER DATA
// ******************************************************************

// Get claims of current user
export function getClaims() {
	return firebase.auth().currentUser.getIdTokenResult()
		.then((idTokenResult) => {
			return idTokenResult.claims || {};
		});
}

// Get database banned listing
export function getIsBanned() {
	if (checkingIfBannedPromise) return checkingIfBannedPromise;
	if (!firebase.auth().currentUser) {
		return Promise.resolve('false');
	}
	const uid = firebase.auth().currentUser.uid;
	checkingIfBannedPromise = firebase.firestore().doc(`users/${uid}`)
		.get()
		.then(userDoc => {
			checkingIfBannedPromise = null;
			if (!userDoc.exists) return false;
			return userDoc.data().isBanned;
		})
		.catch(e => console.error(e));
	return checkingIfBannedPromise;
}

export function getAllUsers(getAllData) {
	const fetchAllUsers = firebase.functions().httpsCallable('getAllUsers');
	return fetchAllUsers({ getAll: getAllData })
		.then(response => response.data)
		.catch(e => console.error(e));
}

// ******************************************************************
// INVITES
// ******************************************************************
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

export function submitInviteCode(code, user, shouldCreate = false) {
	const processInviteCode = firebase.functions().httpsCallable('processInviteCode');
	return processInviteCode({
		uid: user.uid,
		user: shouldCreate ? user : pick(user, ['displayName', 'email']),
		code,
		shouldCreate
	});
}