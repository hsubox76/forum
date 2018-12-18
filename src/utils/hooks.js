import { useState, useEffect } from 'react';
import firebase from 'firebase/app';
import 'firebase/auth';
import 'firebase/firestore';
import { ROLE_PROP } from './constants';

export function useSubscribeToDocument(collection, docId, props) {
  const [doc, updateDoc] = useState(null);
  let unsub = null;
  
  useEffect(() => {
    unsub = firebase.firestore().collection(collection)
        .doc(docId)
        .onSnapshot(docRef => {
          const docData = docRef.data();
          if (!docData) {
            return;
          }
          updateDoc(Object.assign(docData, { id: docRef.id }));
        });
  }, [collection, docId]);
  
  return { doc, unsub };
}

export function useGetRoles(uid) {
  const [roles, setRoles] = useState(null);
  
  useEffect(() => {
    if (uid) {
      firebase.firestore().collection("roles")
        .get()
        .then(querySnapshot => {
          const roleLookup = {};
          querySnapshot.forEach(docRef => {
            if (docRef && docRef.data()) {
              if (docRef.data().ids.includes(uid)) {
                roleLookup[ROLE_PROP[docRef.id]] = true;
              }
            }
          });
          setRoles(roleLookup);
        });
    }
  }, [uid]);
  return roles;
}

export function useGetUser(uid) {
  const [user, setUser] = useState(null);
  
  useEffect(() => {
    if (uid) {
      firebase.firestore().collection("users")
        .doc(uid)
        .get()
        .then(userDoc => {
          setUser(Object.assign({ uid }, userDoc.data()));
        });
    }
  }, [uid]);
  
  return user;
}
