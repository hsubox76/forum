import { useState, useEffect } from 'react';
import firebase from 'firebase/app';
import 'firebase/auth';
import 'firebase/firestore';
import 'firebase/functions';

const promisesById = {};

export function useSubscribeToDocument(collection, docId) {
  const [doc, updateDoc] = useState(null);
  
  useEffect(() => {
    const unsub = firebase.firestore().collection(collection)
        .doc(docId)
        .onSnapshot(docRef => {
          const docData = docRef.data();
          if (!docData) {
            return;
          }
          updateDoc(Object.assign(docData, { id: docRef.id }));
        });
    return unsub;
  }, [collection, docId]);
  
  return doc;
}

export function useSubscribeToCollection(collectionName, options) {
  const [collection, updateCollection] = useState(null);
  
  useEffect(() => {
    let ref = firebase.firestore().collection(collectionName);
    if (options.orderBy) {
      ref = ref.orderBy(options.orderBy);
    }
    const unsub = ref.onSnapshot(querySnapshot => {
      const docList = [];
      querySnapshot.forEach((doc) => {
        doc = Object.assign(doc.data(), { id: doc.id });
        docList.push(doc);
      });
      updateCollection(docList);
    });
    return unsub;
  }, [collection]);
  
  return collection;
}

export function useForum(forumId) {
  const [forum, setForum] = useState(null);

  useEffect(() => {
    let unsub = () => {};
    if (forumId) {
      unsub = firebase.firestore()
        .collection("forums")
        .doc(forumId)
        .onSnapshot(docRef => {
          if (!docRef.data()) return;
          setForum(docRef.data());
        });
    }
    return unsub;
  }, [forumId]);

  return forum;
}

export function useGetUser(uid, context) {
  const [user, setUser] = useState(null);
  
  useEffect(() => {
    if (uid) {
      if (context.usersByUid[uid]) {
        console.log('found user');
        setUser(context.usersByUid[uid]);
        return;
      }
      const fetchUser = firebase.functions().httpsCallable('getUser');
      let doFetch;
      if (promisesById[uid]) { // fetch promise is in flight
        console.log('use existing fetch of uid', uid);
        doFetch = promisesById[uid];
      } else { // start a new fetch promise
        console.log('fetching uid', uid);
        doFetch = () => fetchUser({ uid });
        promisesById[uid] = doFetch; // put it in the map
      }
      doFetch().then((response) => {
        promisesById[uid] = null; // remove from map
        setUser(response.data);
      });
    }
  }, [uid]);

  useEffect(() => {
    if (uid && user) context.addUserByUid(uid, user);
  }, [user]);
  
  return user;
}
