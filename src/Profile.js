import React, { Component } from 'react';
import firebase from 'firebase';
import 'firebase/firestore';

class Profile extends Component {
  constructor() {
    super();
		this.db = firebase.firestore();
    this.displayNameRef = React.createRef();
    this.state = {
      passwordEmailState: 'start',
      profileChangeState: 'start'
    };
  }
  handleSubmitChanges = (e) => {
    e.preventDefault();
    this.setState({ profileChangeState: 'sending' });
    const profileUpdate = this.props.user.updateProfile({
      displayName: this.displayNameRef.current.value
    });
		const dbUpdate = this.db.collection("users").doc(this.props.user.uid).update({
        displayName: this.displayNameRef.current.value,
    });
    Promise.all([profileUpdate, dbUpdate]).then(() => {
      this.setState({ profileChangeState: 'sent' });
    });
  }
  handleResetPassword = () => {
    this.setState({passwordEmailState: 'sending'});
    firebase.auth().sendPasswordResetEmail(
      this.props.user.email, null)
    .then(() => {
      // Password reset email sent.
      this.setState({passwordEmailState: 'sent'});
    })
    .catch((error) => {
      // Error occurred. Inspect error.code.
    });
  }
  render() {
    let passwordResetEl = (
      <div>
        <a className="reset-password-link" onClick={this.handleResetPassword}>Reset password</a>
      </div>
    );
    if (this.state.passwordEmailState === 'sent') {
      passwordResetEl = (
        <div>
          <div>Password reset link sent to {this.props.user.email}.</div>
          <div><a className="reset-password-link" onClick={this.handleResetPassword}>Send again</a></div>
        </div>
      );
    } else if (this.state.passwordEmailState === 'sending') {
      passwordResetEl = <div className="loader"></div>
    }
    return (
      <form className="profile-container" onSubmit={this.handleSubmitChanges}>
        <div><label>Change display name:</label></div>
        <div>
          <input
            ref={this.displayNameRef}
            disabled={this.profileChangeState === 'sending'}
            className="display-name-input"
            defaultValue={this.props.user.displayName}
          />
        </div>
        <div>
          {this.state.profileChangeState !== 'sending' && <button>Submit</button>}
          {this.state.profileChangeState === 'sending' && <div className="loader"></div>}
        </div>
        {this.state.profileChangeState === 'sent' && <div>Profile updated.</div>}
        <div>
          {passwordResetEl}
        </div>
      </form>
    );
  }
}

export default Profile;