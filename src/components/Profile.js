import React, { useRef, useState } from 'react';
import firebase from 'firebase/app';
import 'firebase/firestore';
import 'firebase/auth';
import 'firebase/storage';
import '../styles/Profile.css';
import { useGetUser } from '../utils/hooks';
import { updateDoc } from '../utils/dbhelpers';

function Profile (props) {
  const displayNameRef = useRef();
  const fileInputRef = useRef();
  const bioRef = useRef();
  const storageRef = firebase.storage().ref();
  const [passwordEmailState, setPasswordEmailState] = useState('start');
  const [profileChangeState, setProfileChangeState] = useState('start');
  const [avatarError, setAvatarError] = useState(null);
  const [avatarBlocking, setAvatarBlocking] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(false);
  const userData = useGetUser(props.user.uid);

  function handleSubmitChanges(e) {
    e.preventDefault();
    const profileUpdatePromises = [];
    if (displayNameRef.current.value !== props.user.displayName) {
      profileUpdatePromises.push(
        props.user.updateProfile({
          displayName: displayNameRef.current.value
        })
      );
    }
    if (userData && bioRef.current.value !== userData.bio) {
      profileUpdatePromises.push(
        updateDoc(`users/${props.user.uid}`, {
          bio: bioRef.current.value
        })
      );
    }
    if (fileInputRef.current.files && fileInputRef.current.files.length > 0) {
      profileUpdatePromises.push(uploadAvatar());
    }
    if (profileUpdatePromises.length > 0) {
      setProfileChangeState('sending');
      Promise.all(profileUpdatePromises).then(() => {
        setProfileChangeState('sent');
        setAvatarError(null);
        setAvatarBlocking(false);
        setPreviewUrl(null);
      });
    } else {
      setProfileChangeState('nochanges');
    }
  }

  function handleResetPassword() {
    setPasswordEmailState('sending');
    firebase.auth().sendPasswordResetEmail(
      props.user.email, null)
    .then(() => {
      // Password reset email sent.
      setPasswordEmailState('sent');
    })
    .catch((error) => {
      setPasswordEmailState('error');
    });
  }

  function uploadAvatar() {
    if (avatarBlocking) return;
    setAvatarError(null);
    const file = fileInputRef.current.files[0];
    const parts = file.name.split('.');
    const extension = parts[parts.length - 1];
    const userId = props.user.uid;
    const avatarImageRef = storageRef.child(`avatars/${userId}.${extension}`);
    return avatarImageRef.put(file)
      .then(snapshot => snapshot.ref.getDownloadURL())
      .then(url => props.user.updateProfile({ photoURL: url }))
      .catch(e => {
        console.error(e);
        setAvatarError('Problem uploading avatar.');
      });
  }

  function onAvatarSelect(e) {
    setPreviewUrl(null);
    setAvatarError(null);
    setAvatarBlocking(false);
    const file = e.target.files[0];
    if (file.size > 200000) {
      setAvatarError('File size is too big (bytes not pixels).');
      setAvatarBlocking(true);
    }
    if (!file.type.includes('image')) {
      setAvatarError('This doesn\'t seem to be an image file.');
      setAvatarBlocking(true);
    }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      if (img.width > img.height || img.width < img.height) {
        setAvatarError('Image is not square, it may get stretched when displayed.');
        setAvatarBlocking(false);
      }
    };
    img.src = url;
    setPreviewUrl(url);
  }

  const firestoreBasedSection = userData
    ? (
      <React.Fragment>
        <div><label>Update bio:</label></div>
        <div>
          <textarea
            ref={bioRef}
            disabled={profileChangeState === 'sending'}
            className="display-name-input"
            defaultValue={userData ? userData.bio : ''}
            placeholder="Enter short bio here"
          />
        </div>
      </React.Fragment>
    )
    : (
      <div className="loading-more-data-container">
        <div>Loading rest of your profile data.</div>
        <div className="loader loader-sm" />
      </div>
    );

  let passwordResetEl = (
    <div>
      <span className="reset-password-link" onClick={handleResetPassword}>Reset password</span>
    </div>
  );
  if (passwordEmailState === 'sent') {
    passwordResetEl = (
      <div>
        <div>Password reset link sent to {props.user.email}.</div>
        <div><span className="reset-password-link" onClick={handleResetPassword}>Send again</span></div>
      </div>
    );
  } else if (passwordEmailState === 'sending') {
    passwordResetEl = <div className="loader"></div>
  }
  return (
    <form className="profile-container" onSubmit={handleSubmitChanges}>
      <div className="profile-container-title">Your Profile</div>
      <div><label>Change display name:</label></div>
      <div>
        <input
          ref={displayNameRef}
          disabled={profileChangeState === 'sending'}
          className="display-name-input"
          defaultValue={props.user.displayName}
        />
      </div>
      <div><label>Current avatar:</label></div>
      <div>
        {props.user.photoURL
          ? <img className="avatar-profile" alt="User's Avatar" src={props.user.photoURL} />
          : 'none'}
      </div>
      {previewUrl && (
        <div>
          <div><label>Avatar to upload:</label></div>
          <div>
            {previewUrl
              && <img className="avatar-profile" alt="New Avatar" src={previewUrl} />}
          </div>
          <button
            className="button-cancel"
            type="nosubmit"
            onClick={() => setPreviewUrl(null)}
          >
            cancel
          </button>
        </div>
        )
      }
      <div><label>Upload avatar:</label></div>
      <div>
        <input 
          ref={fileInputRef}
          type="file"
          onChange={onAvatarSelect}
        />
      </div>
      {firestoreBasedSection}
      <div>
        {profileChangeState !== 'sending' && <button>Submit</button>}
        {profileChangeState === 'sending' && <div className="loader"></div>}
      </div>
      {profileChangeState === 'sent' && <div>Profile updated.</div>}
      {profileChangeState === 'nochanges' && <div>You haven't made any changes.</div>}
      {avatarError && <div className="avatar-error">{avatarError}</div>}
      <div>
        {passwordResetEl}
      </div>
    </form>
  );
}

export default Profile;