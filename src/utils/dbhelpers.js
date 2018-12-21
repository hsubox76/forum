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

export function getUser(props, uid) {
	const db = firebase.firestore();
	if (props.usersByUid[uid]) {
		return Promise.resolve(props.usersByUid[uid]);
	} else {
		return db.collection("users")
			.doc(uid)
			.get()
			.then(userDoc => {
				// store this up a level
				props.addUserByUid(uid, userDoc.data());
				return userDoc.data();
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

export function getRoles() {
	const db = firebase.firestore();
	return db.collection("roles")
		.get()
		.then(querySnapshot => {
			const roles = {};
			querySnapshot.forEach(doc => roles[doc.id] = doc.data());
			return roles;
		});
}

export function toggleBan(uid, shouldBan) {
	const db = firebase.firestore();
	if (shouldBan) {
		db.collection("roles").doc("bannedUsers").update({
				ids: firebase.firestore.FieldValue.arrayUnion(uid)
		});
	} else {
		db.collection("roles").doc("bannedUsers").update({
				ids: firebase.firestore.FieldValue.arrayRemove(uid)
		});
	}
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

export function verifyAllUsers() {
	const db = firebase.firestore();
	return db.collection("users")
		.get()
		.then(querySnapshot => {
			const setValidated = firebase.functions().httpsCallable('setValidated');
			querySnapshot.forEach(doc => {
				setValidated({ uid: doc.id, isOn: true });
				// db.collection("users").doc(doc.id).update({
				// 	verifiedWithCode: true,
				// 	verifiedDate: Date.now()
				// });
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

export function getIsAdmin() {
	return firebase.auth().currentUser.getIdTokenResult()
		.then((idTokenResult) => {
			if (idTokenResult.claims.admin) {
				console.log('verified this user is an admin');
				return true;
			}
			return false;
		});
}