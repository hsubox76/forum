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
				.then(invites => this.setState({ invites: invites.sort((a, b) => (a.usedAt || 0) > (b.usedAt || 0)) }));
		});
	}
	render() {
		const usedInvites = this.state.invites.filter(invite => invite.wasUsed);
		const unusedInvites = this.state.invites.filter(invite => !invite.wasUsed);
		const unusedInvitesTable = unusedInvites.length > 0 && (
			<table>
				<thead>
					<tr>
						<th>Code</th>
						<th>Link</th>
						<th>Created At</th>
					</tr>
				</thead>
				<tbody>
				{unusedInvites.map(invite => (
					<tr key={invite.id}>
						<td>{invite.id}</td>
						<td>
							<input
								onClick={e => e.target.select()}
								onChange={e => e.preventDefault()}
								value={`https://${window.location.host}/code/${invite.id}`}
								className="invite-code"
							/>
						</td>
						<td>{invite.createdAt ? format(invite.createdAt, STANDARD_DATE_FORMAT) : '??'}</td>
					</tr>
				))}
				</tbody>
			</table>
		);
		const usedInvitesTable = usedInvites.length > 0 && (
			<table>
				<thead>
					<tr>
						<th>Code</th>
						<th>Used By</th>
						<th>Used At</th>
					</tr>
				</thead>
				<tbody>
				{usedInvites.map(invite => (
					<tr key={invite.id}>
						<td>{invite.id}</td>
						<td>{invite.usedBy}</td>
						<td>{invite.usedAt ? format(invite.usedAt, STANDARD_DATE_FORMAT) : '??'}</td>
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
						<input
							onClick={e => e.target.select()}
							onChange={e => e.preventDefault()}
							value={`https://${window.location.host}/code/${this.state.code}`}
							className="invite-code"
						/>}
          {this.state.code &&
						<div className="instructions">Give this link to a friend. It'll take them to a one-time
						use page where they can sign up.</div>}
          {this.state.inviteError &&
            <div className="invite-error">{this.state.inviteError}</div>}
        </form>
        <div className="admin-table">
					<div className="table-title">Invites You've Created</div>
					{unusedInvitesTable}
					{noInvitesMessage}
				</div>
				{usedInvites.length > 0 &&
					<div className="admin-table">
						<div className="table-title">Used Invites</div>
						{usedInvitesTable}
					</div>
				}
			</div>
		);
	}
}

export default Invite;
