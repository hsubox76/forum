import { useState, useEffect } from "react";
import firebase from "firebase/app";
import "firebase/auth";
import "firebase/firestore";
import "firebase/functions";

const promisesById = {};

export function useSubscribeToDocumentPath(docPath) {
  const [doc, updateDoc] = useState(null);

  useEffect(
    () => {
      const unsub = firebase
        .firestore()
        .doc(docPath)
        .onSnapshot(docRef => {
          const docData = docRef.data();
          if (!docData) {
            return;
          }
          updateDoc(Object.assign(docData, { id: docRef.id }));
        });
      return unsub;
    },
    [docPath]
  );

  return doc;
}

export function useSubscribeToCollection(collectionName, options) {
  const [collection, updateCollection] = useState(null);

  useEffect(
    () => {
      let ref = firebase.firestore().collection(collectionName);
      if (options) {
        options.forEach(option => {
          const prop = Object.keys(option)[0];
          const val = option[prop];
          if (Array.isArray(val)) {
            ref = ref[prop](...val);
          } else {
            ref = ref[prop](val);
          }
        });
      }
      const unsub = ref.onSnapshot(querySnapshot => {
        const docList = [];
        querySnapshot.forEach(doc => {
          doc = Object.assign(doc.data(), { id: doc.id });
          docList.push(doc);
        });
        updateCollection(docList);
      });
      return unsub;
    },
    [collectionName]
  );
  return collection;
}

export function useGetUser(uid, context) {
  const [user, setUser] = useState(null);
  let unmounting = false;

  useEffect(
    () => {
      if (uid) {
        if (context && context.usersByUid[uid]) {
          setUser(context.usersByUid[uid]);
          return;
        }
        const fetchUser = firebase.functions().httpsCallable("getUser");
        let doFetch;
        if (promisesById[uid]) {
          // fetch promise is in flight
          doFetch = promisesById[uid];
        } else {
          // start a new fetch promise
          doFetch = () => fetchUser({ uid });
          promisesById[uid] = doFetch; // put it in the map
        }
        doFetch().then(response => {
          promisesById[uid] = null; // remove from map
          if (!unmounting) {
            setUser(response.data);
          }
        });
      }
      return () => (unmounting = true);
    },
    [uid]
  );

  useEffect(
    () => {
      if (uid && user && context) context.addUserByUid(uid, user);
    },
    [user]
  );

  return user;
}
