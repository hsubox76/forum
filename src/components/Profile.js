import React, { Component } from 'react';
import firebase from 'firebase/app';
import 'firebase/firestore';
import 'firebase/auth';
import 'firebase/storage';
import '../styles/Profile.css';

class Profile extends Component {
  constructor() {
    super();
		this.db = firebase.firestore();
    this.displayNameRef = React.createRef();
    this.fileInputRef = React.createRef();
    this.storageRef = firebase.storage().ref();
    this.state = {
      passwordEmailState: 'start',
      profileChangeState: 'start',
      avatarError: null
    };
  }
  handleSubmitChanges = (e) => {
    e.preventDefault();
    const profileUpdatePromises = [];
    if (this.displayNameRef.current.value !== this.props.user.displayName) {
      profileUpdatePromises.push(
        this.props.user.updateProfile({
          displayName: this.displayNameRef.current.value
        })
      );
      profileUpdatePromises.push(
        this.db.collection("users").doc(this.props.user.uid).update({
            displayName: this.displayNameRef.current.value,
        })
      );
    }
    if (this.fileInputRef.current.files && this.fileInputRef.current.files.length > 0) {
      profileUpdatePromises.push(this.uploadAvatar());
    }
    if (profileUpdatePromises.length > 0) {
      this.setState({ profileChangeState: 'sending' });
      Promise.all(profileUpdatePromises).then(() => {
        this.setState({
          profileChangeState: 'sent',
          avatarError: null,
          avatarBlocking: false,
          previewUrl: null
        });
      });
    } else {
      this.setState({ profileChangeState: 'nochanges' });
    }
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
  uploadAvatar = () => {
    const file = this.fileInputRef.current.files[0];
    const parts = file.name.split('.');
    const extension = parts[parts.length - 1];
    const userId = this.props.user.uid;
    const avatarImageRef = this.storageRef.child(`avatars/${userId}.${extension}`);
    return avatarImageRef.put(file)
      .then(snapshot => snapshot.ref.getDownloadURL())
      .then(url => this.db.collection('users').doc(userId).update({ avatarUrl: url }));
  }
  onAvatarSelect = (e) => {
    this.setState({ previewUrl: null, avatarError: null, avatarBlocking: false });
    const file = e.target.files[0];
    if (file.size > 200000) {
      this.setState({ avatarError: 'File size is too big (bytes not pixels).', avatarBlocking: true });
    }
    if (!file.type.includes('image')) {
      this.setState({ avatarError: 'This doesn\'t seem to be an image file.', avatarBlocking: true });
    }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      if (img.width > img.height || img.width < img.height) {
        this.setState({ avatarError: 'Image is not square, it may get stretched when displayed.', avatarBlocking: this.state.avatarBlocking || false });
      }
    };
    img.src = url;
    this.setState({ previewUrl: url });
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
        <div><label>Current avatar:</label></div>
        <div>
          {this.props.user.avatarUrl
            ? <img className="avatar-profile" alt="User's Avatar" src={this.props.user.avatarUrl} />
            : 'none'}
        </div>
        {this.state.previewUrl && (
          <div>
            <div><label>Avatar to upload:</label></div>
            <div>
              {this.props.user.avatarUrl
                ? <img className="avatar-profile" alt="New Avatar" src={this.state.previewUrl} />
                : 'none'}
            </div>
            <button className="button-cancel" type="nosubmit" onClick={() => {this.setState({ previewUrl: null });}}>cancel</button>
          </div>
          )
        }
        <div><label>Upload avatar:</label></div>
        <div>
          <input 
            ref={this.fileInputRef}
            type="file"
            onChange={this.onAvatarSelect}
          />
        </div>
        <div>
          {this.state.profileChangeState !== 'sending' && <button>Submit</button>}
          {this.state.profileChangeState === 'sending' && <div className="loader"></div>}
        </div>
        {this.state.profileChangeState === 'sent' && <div>Profile updated.</div>}
        {this.state.profileChangeState === 'nochanges' && <div>You haven't made any changes.</div>}
        {this.state.avatarError && <div className="avatar-error">{this.state.avatarError}</div>}
        <div>
          {passwordResetEl}
        </div>
      </form>
    );
  }
}

export default Profile;