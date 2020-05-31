import React, {useState, useRef} from 'react';
import firebase from 'firebase/app';

export default function AvatarUpload({user, profileChangeState, setProfileChangeState }) {
  const [avatarError, setAvatarError] = useState(null);
  const [avatarBlocking, setAvatarBlocking] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(false);
  const [fileToUpload, setFileToUpload] = useState();
  const fileInputRef = useRef();
  const storageRef = firebase.storage().ref();

  async function handleChangeAvatar(e) {
    e.preventDefault();
    if (fileToUpload) {
      try {
        setProfileChangeState("sending");
        await uploadAvatar(fileToUpload);
        setAvatarError(null);
        setAvatarBlocking(false);
        setProfileChangeState("sent");
        setPreviewUrl(null);
        setFileToUpload(null);
      } catch(e) {
        setAvatarError(e);
      }
    } else {
      setProfileChangeState("nochanges");
    }
  }

  function uploadAvatar(file) {
    if (avatarBlocking) return;
    setAvatarError(null);
    const parts = file.name.split(".");
    const extension = parts[parts.length - 1];
    const userId = user.uid;
    const avatarImageRef = storageRef.child(`avatars/${userId}.${extension}`);
    return avatarImageRef
      .put(file)
      .then((snapshot) => snapshot.ref.getDownloadURL())
      .then((url) => user.updateProfile({ photoURL: url }))
      .catch((e) => {
        throw Error("Problem uploading avatar.");
      });
  }

  function onAvatarSelect(e) {
    setPreviewUrl(null);
    setAvatarError(null);
    setAvatarBlocking(false);
    setFileToUpload(null);
    const file = e.target.files[0];
    if (file.size > 200000) {
      setAvatarError("File size is too big (bytes not pixels).");
      setAvatarBlocking(true);
    }
    if (!file.type.includes("image")) {
      setAvatarError("This doesn't seem to be an image file.");
      setAvatarBlocking(true);
    }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      if (img.width > img.height || img.width < img.height) {
        setAvatarError(
          "Warning: Image is not square, it may get stretched when displayed."
        );
        setAvatarBlocking(false);
      }
    };
    img.src = url;
    setPreviewUrl(url);
    setFileToUpload(file);
  }

  return (
    <div className="border-t border-main py-2 flex flex-col items-start">
      <label className="text-main text-lg">Current avatar:</label>
      {user.photoURL ? (
        <img
          className="w-32 h-32"
          alt="User's Avatar"
          src={user.photoURL}
        />
      ) : (
        "none"
      )}
      {previewUrl && (
        <div className="my-2">
          <div>
            <label className="text-main text-lg">Avatar to upload:</label>
          </div>
          <div>
            {previewUrl && (
              <img className="w-32 h-32" alt="New Avatar" src={previewUrl} />
            )}
          </div>
          <button
            className="btn btn-neutral"
            type="nosubmit"
            onClick={() => setPreviewUrl(null)}
          >
            cancel
          </button>
          <button
            className="btn btn-ok w-20 ml-4 disabled:opacity-50"
            onClick={handleChangeAvatar}
            disabled={profileChangeState === "sending"}
          >
            upload
          </button>
          {avatarError && <div className="text-danger">{avatarError}</div>}
        </div>
      )}
      {!previewUrl && (
        <div className="my-2 flex flex-col">
          <label className="text-main text-lg">Upload avatar:</label>
          <input ref={fileInputRef} type="file" onChange={onAvatarSelect} />
        </div>
      )}
    </div>);
}