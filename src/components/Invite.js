import React, { Component } from 'react';
import '../styles/Admin.css';
import { format } from 'date-fns';
import { STANDARD_DATE_FORMAT } from '../utils/constants';
import { generateInviteCode, getAllInvitesFor } from '../utils/dbhelpers';

class Invite extends Component {
	constructor() {
		super();
		this.state = {
			code: null,
			inviteError: null,
			invites: []
		};
	}
	componentDidMount = () => {
		getAllInvitesFor(this.props.user.uid)
			.then(invites => this.setState({ invites }));
	}
	onGenerateCode = (e) => {
		e.preventDefault();
		const createdByName = `${this.props.user.displayName} (${this.props.user.email})`;
		generateInviteCode(createdByName, this.props.user.uid).then(code => {
			this.setState({ code });
			getAllInvitesFor(this.props.user.uid)
				.then(invites => this.setState({ invites }));
		});
	}
	render() {
		const invitesTable = this.state.invites.length > 0 && (
			<table>
				<thead>
					<tr>
						<th>Code</th>
						<th>Was Used?</th>
						<th>Used By</th>
						<th>Created At</th>
					</tr>
				</thead>
				<tbody>
				{this.state.invites.map(invite => (
					<tr key={invite.id}>
						<td>{invite.id}</td>
						<td>{invite.wasUsed ? 'yes' : 'no'}</td>
						<td>{invite.wasUsed && invite.usedBy}</td>
						<td>{invite.createdAt ? format(invite.createdAt, STANDARD_DATE_FORMAT) : '??'}</td>
					</tr>
				))}
				</tbody>
			</table>
		);
		const noInvitesMessage = !this.state.invites.length && (
			<div>You haven't created any invites yet.</div>
		);
		return (
			<div className="invite-container">
        <form className="invite-gen-form" onSubmit={this.onGenerateCode}>
          <button className="button-edit">generate invite code</button>
          {this.state.code &&
          	<div className="invite-code">{this.state.code}</div>}
          {this.state.code &&
          	<div className="instructions">Give this code to a friend. They'll need to create an account
          	first, and then after that's done, they'll need to enter this code
          	once (hopefully) to get access to the forum.</div>}
          {this.state.inviteError &&
            <div className="invite-error">{this.state.inviteError}</div>}
        </form>
        <div className="admin-table">
					<div className="table-title">Invites You've Created</div>
					{invitesTable}
					{noInvitesMessage}
				</div>
			</div>
		);
	}
}

export default Invite;
