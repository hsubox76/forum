import React, { useRef, useState, useEffect, useContext } from "react";
import firebase from "firebase/app";
import "firebase/auth";
import "firebase/storage";
import UserContext from "./UserContext";
import { updateDoc, getUser } from "../utils/dbhelpers";
import AvatarUpload from "./avatar-upload";
import { RouteComponentProps } from "@reach/router";
import { UserPublic } from "../utils/types";

interface ProfileProps extends RouteComponentProps {
  user: firebase.User
}

function Profile(props: ProfileProps) {
  const displayNameRef = useRef<HTMLInputElement|null>(null);
  const bioRef = useRef<HTMLTextAreaElement|null>(null);
  const [passwordEmailState, setPasswordEmailState] = useState("start");
  const [profileChangeState, setProfileChangeState] = useState("start");
  const [publicData, setPublicData] = useState<UserPublic | undefined>();
  const context = useContext(UserContext);

  useEffect(() => {
    getUser(props.user.uid, context, true).then(setPublicData);
  }, [props.user.uid, context]);

  async function handleSubmitUsername(e: React.MouseEvent) {
    e.preventDefault();
    if (displayNameRef.current?.value && displayNameRef.current.value !== props.user.displayName) {
      setProfileChangeState("sending");
      await props.user.updateProfile({
        displayName: displayNameRef.current.value,
      });
      setProfileChangeState("sent");
    } else {
      setProfileChangeState("nochanges");
    }
  }

  async function handleSubmitBio(e: React.MouseEvent) {
    if (publicData && bioRef.current?.value && bioRef.current.value !== publicData.bio) {
      setProfileChangeState("sending");
      await updateDoc(`usersPublic/${props.user.uid}`, {
        bio: bioRef.current.value,
      });
      setProfileChangeState("sent");
    } else {
      setProfileChangeState("nochanges");
    }
  }

  function handleResetPassword() {
    if (!props.user.email) {
      setPasswordEmailState("error");
      return;
    }
    setPasswordEmailState("sending");
    firebase
      .auth()
      .sendPasswordResetEmail(props.user.email, null)
      .then(() => {
        // Password reset email sent.
        setPasswordEmailState("sent");
      })
      .catch(() => {
        setPasswordEmailState("error");
      });
  }

  const firestoreBasedSection = publicData ? (
    <>
      <div className="flex flex-col items-start border-t border-main py-2">
        <label className="text-main text-lg">Update bio:</label>
        <textarea
          ref={bioRef}
          disabled={profileChangeState === "sending"}
          className="w-64 h-24 p-1"
          defaultValue={publicData ? publicData.bio : ""}
          placeholder="Enter short bio here"
        />
        <button
          className="btn btn-ok w-20 mt-2 disabled:opacity-50"
          onClick={handleSubmitBio}
          disabled={profileChangeState === "sending"}
        >
          ok
        </button>
      </div>
      <div className="flex flex-col items-start border-t border-main py-2">
        <div className="text-main text-lg">Email Notifications</div>
        <div className="flex items-center space-x-2">
          <input id="notif-all" type="checkbox" />
          <label htmlFor="notif-all">All posts</label>
        </div>
      </div>
    </>
  ) : (
    <div>
      <div>Loading rest of your profile data.</div>
      <div className="loader loader-sm" />
    </div>
  );

  let passwordResetEl = (
    <div>
      <span
        className="text-main underline text-lg"
        onClick={handleResetPassword}
      >
        Reset password
      </span>
    </div>
  );
  if (passwordEmailState === "sent") {
    passwordResetEl = (
      <div>
        <div>Password reset link sent to {props.user.email}.</div>
        <div>
          <span
            className="text-main underline text-lg"
            onClick={handleResetPassword}
          >
            Send again
          </span>
        </div>
      </div>
    );
  } else if (passwordEmailState === "sending") {
    passwordResetEl = <div className="loader" />;
  }
  return (
    <form className="container">
      <h1 className="text-main text-2xl">Your Profile</h1>
      <div className="border-t border-main py-2 flex flex-col items-start">
        <label className="text-lg text-main" htmlFor="displayName">
          Change display name:
        </label>
        <div className="flex">
          <input
            ref={displayNameRef}
            id="displayName"
            disabled={profileChangeState === "sending"}
            className="px-2 py-1 w-64"
            defaultValue={props.user.displayName || ''}
          />
          <button
            className="btn btn-ok w-20 ml-4 disabled:opacity-50"
            onClick={handleSubmitUsername}
            disabled={profileChangeState === "sending"}
          >
            ok
          </button>
        </div>
      </div>
      <AvatarUpload
        user={props.user}
        profileChangeState={profileChangeState}
        setProfileChangeState={setProfileChangeState}
      />
      {firestoreBasedSection}
      <div>{passwordResetEl}</div>
    </form>
  );
}

export default Profile;
