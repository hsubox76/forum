import { useState, useEffect } from "react";
import firebase from "firebase/app";
import "firebase/firestore";

export function useSubscribeToDocumentPath(docPath) {
  const [doc, updateDoc] = useState(null);

  useEffect(() => {
    const unsub = firebase
      .firestore()
      .doc(docPath)
      .onSnapshot((docRef) => {
        const docData = docRef.data();
        if (!docData) {
          return;
        }
        updateDoc(Object.assign(docData, { id: docRef.id }));
      });
    return unsub;
  }, [docPath]);

  return doc;
}

export function useSubscribeToCollection(collectionName, options) {
  const [collection, updateCollection] = useState(null);
  const stringifiedOptions = JSON.stringify(options);

  useEffect(() => {
    let ref = firebase.firestore().collection(collectionName);
    if (stringifiedOptions) {
      const opts = JSON.parse(stringifiedOptions);
      opts.forEach((option) => {
        const prop = Object.keys(option)[0];
        const val = option[prop];
        if (Array.isArray(val)) {
          ref = ref[prop](...val);
        } else {
          ref = ref[prop](val);
        }
      });
    }
    const unsub = ref.onSnapshot((querySnapshot) => {
      const docList = [];
      querySnapshot.forEach((doc) => {
        doc = Object.assign(doc.data(), { id: doc.id });
        docList.push(doc);
      });
      updateCollection(docList);
    });
    return unsub;
  }, [collectionName, stringifiedOptions]);
  return collection;
}

export function useUserSettings(uid) {
  const [userSettings, setUserSettings] = useState(null);

  useEffect(() => {
    if (!uid) return;
    const unsub = firebase
      .firestore()
      .doc(`users/${uid}`)
      .onSnapshot((docRef) => {
        const docData = docRef.data();
        if (!docData) {
          return;
        }
        setUserSettings(
          Object.assign(
            { notifications: { forums: [], threads: [], all: false } },
            docData
          )
        );
      });
    return unsub;
  }, [uid]);

  return userSettings;
}
