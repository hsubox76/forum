import React, { useRef, useState } from "react";
import { submitInviteCode } from "../utils/dbhelpers";
import { navigate, RouteComponentProps } from "@reach/router";
import firebase from "firebase/app";
import "firebase/auth";
import get from "lodash/get";

interface CreateAccountProps extends RouteComponentProps<{ code: string }> {
}

function CreateAccount(props: CreateAccountProps) {
  const codeRef = useRef<HTMLInputElement | null>(null);
  const emailRef = useRef<HTMLInputElement | null>(null);
  const displayNameRef = useRef<HTMLInputElement | null>(null);
  const passwordRef = useRef<HTMLInputElement | null>(null);
  const confirmPasswordRef = useRef<HTMLInputElement | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  function onForumSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage(null);
    const password = get(passwordRef, "current.value");
    const confirmPassword = get(confirmPasswordRef, "current.value");
    const email = get(emailRef, "current.value");
    if (!password) {
      setErrorMessage("Password cannot be blank.");
      return;
    }
    if (!email) {
      setErrorMessage("Email cannot be blank.");
      return;
    }
    if (password.length < 8) {
      setErrorMessage("Password should be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage("Password fields don't match.");
      return;
    }
    const userData = {
      email,
      displayName: get(displayNameRef, "current.value"),
      password,
    };
    setSending(true);
    submitInviteCode(get(codeRef, "current.value"), userData, true)
      .then((result) => {
        if (get(result, "data.error")) {
          throw new Error(result.data.error);
        } else {
          return firebase
            .auth()
            .signInWithEmailAndPassword(email, password)
            .then(() => navigate("/"));
        }
      })
      .catch((e) => setErrorMessage(e.message))
      .finally(() => setSending(false));
  }

  function fill() {
    if (
      passwordRef.current &&
      confirmPasswordRef.current &&
      emailRef.current &&
      displayNameRef.current
    ) {
      passwordRef.current.value = "password";
      confirmPasswordRef.current.value = "password";
      emailRef.current.value = "test@testing.com";
      displayNameRef.current.value = "Test Name";
    }
  }

  // if (props.user && props.claims.validated) {
  //   return (
  //     <div className="create-account-container">
  //       You already have an account!
  //     </div>
  //   );
  // }

  return (
    <div className="container mx-auto w-full lg:w-1/2">
      <form className="signup-form" onSubmit={onForumSubmit}>
        <div className="form-row">
          <label>email</label>
          <input ref={emailRef} type="email" placeholder="email address" />
        </div>
        <div className="form-row">
          <label>display name</label>
          <input ref={displayNameRef} placeholder="name to show on posts" />
        </div>
        <div className="form-row">
          <label>password</label>
          <input ref={passwordRef} type="password" />
        </div>
        <div className="form-row">
          <label>confirm password</label>
          <input ref={confirmPasswordRef} type="password" />
        </div>
        <div className="form-row">
          <label>code</label>
          <input ref={codeRef} defaultValue={props.code || ""} />
        </div>
        <button disabled={sending} className="btn btn-ok my-2">
          create my account
        </button>
        {sending && <div className="loader" />}
      </form>
      {window.location.hostname === "localhost" && (
        <button className="btn btn-danger" onClick={fill}>
          fill with test data
        </button>
      )}
      {errorMessage && <div className="text-danger">{errorMessage}</div>}
    </div>
  );
}

export default CreateAccount;
