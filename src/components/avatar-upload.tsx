import React, { useState, useRef } from "react";
import firebase from "firebase/app";

interface AvatarUploadProps {
  user: firebase.User;
  profileChangeState: string;
  setProfileChangeState: (state: string) => void;
}

export default function AvatarUpload({
  user,
  profileChangeState,
  setProfileChangeState,
}: AvatarUploadProps) {
  const [avatarError, setAvatarError] = useState<string|null>(null);
  const [avatarBlocking, setAvatarBlocking] = useState<boolean>(false);
  const [previewUrl, setPreviewUrl] = useState<string|null>(null);
  const [fileToUpload, setFileToUpload] = useState<File|null>();
  const fileInputRef = useRef<HTMLInputElement|null>(null);
  const storageRef = firebase.storage().ref();

  async function handleChangeAvatar(e: React.MouseEvent) {
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
      } catch (e) {
        setAvatarError(e);
      }
    } else {
      setProfileChangeState("nochanges");
    }
  }

  function uploadAvatar(file: File) {
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

  function onAvatarSelect(e: React.ChangeEvent) {
    setPreviewUrl(null);
    setAvatarError(null);
    setAvatarBlocking(false);
    setFileToUpload(null);
    const file = (e.target as HTMLInputElement)?.files?.[0];
    if (!file) return;
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
        <img className="w-32 h-32" alt="User's Avatar" src={user.photoURL} />
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
            type="button"
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
    </div>
  );
}
