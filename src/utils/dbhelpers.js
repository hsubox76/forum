import firebase from 'firebase/app';
import 'firebase/auth';
import 'firebase/firestore';
import 'firebase/functions';

// ******************************************************************
// ADMIN MAINTENANCE
// ******************************************************************
export function toggleBan(uid, shouldBan) {
	const setBanned = firebase.functions().httpsCallable('setBanned');
	return setBanned({ uid, isOn: shouldBan });
}

export function toggleMod(uid, shouldMod) {
	const setModerator = firebase.functions().httpsCallable('setModerator');
	return setModerator({ uid, isOn: shouldMod });
}

// ******************************************************************
// ADMIN SPECIAL CASE
// ******************************************************************
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

// ******************************************************************
// DATABASE UPDATES
// ******************************************************************

export function addDoc(collection, data) {
	return firebase.firestore().collection(collection).add(data);
}

export function updateDoc(collection, docId, data) {
	return firebase.firestore().collection(collection).doc(docId).update(data);
}

export function deleteDoc(collection, docId) {
	return firebase.firestore().collection(collection)
		.doc(docId)
		.delete()
		.then(() => console.log(`${docId} deleted from collection ${collection}`))
		.catch(e => console.error(e));
}

export function updateReaction(uid, postId, reactionType, shouldAdd) {
	const operation = shouldAdd ? 'arrayUnion' : 'arrayRemove';
	updateDoc('posts', postId, {
		[`reactions.${reactionType}`]: firebase.firestore.FieldValue[operation](uid)
	});
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

// ******************************************************************
// USER DATA
// ******************************************************************

// Get claims of current user
export function getClaims() {
	return firebase.auth().currentUser.getIdTokenResult()
		.then((idTokenResult) => {
			return idTokenResult.claims;
		});
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