import React, { Component } from 'react';
import '../styles/Admin.css';
import { format } from 'date-fns';
import { STANDARD_DATE_FORMAT } from '../utils/constants';
import { getAllUsers,
	getAllInvites,
	verifyAllUsers,
	getRoles,
	toggleBan
} from '../utils/dbhelpers';

class Admin extends Component {
	constructor() {
		super();
		this.state = {
			users: [],
			invites: [],
			roles: {}
		};
	}
	componentDidMount() {
		getAllUsers().then(users => this.setState({ users }));
		getAllInvites().then(invites => this.setState({ invites }));
		getRoles().then(roles => this.setState({ roles }));
	}
	onBanClick = (uid, isBanned) => {
		toggleBan(uid, !isBanned);
		getRoles().then(roles => this.setState({ roles }));
	}
	render() {
		if (!this.props.user.isAdmin) {
			return (
				<div className="admin-container">
					Sorry! You don't have permissions!
				</div>
			);
		}
		const admins = this.state.roles.admins || { ids: [] };
		const bannedUsers = this.state.roles.bannedUsers || { ids: [] };
		return (
			<div className="admin-container">
				<div className="table-title">Invites</div>
				<table>
					<thead>
						<tr>
							<th>Code</th>
							<th>Was Used?</th>
							<th>Used By</th>
							<th>Created By</th>
							<th>Created At</th>
						</tr>
					</thead>
					<tbody>
					{this.state.invites.map(invite => (
						<tr key={invite.id}>
							<td>{invite.id}</td>
							<td>{invite.wasUsed ? 'yes' : 'no'}</td>
							<td>{invite.wasUsed && invite.usedBy}</td>
							<td>{invite.createdByName}</td>
							<td>{invite.createdAt ? format(invite.createdAt, STANDARD_DATE_FORMAT) : '??'}</td>
						</tr>
					))}
					</tbody>
				</table>
				<hr />
				<div className="table-title">Users</div>
				<button className="button-edit" onClick={verifyAllUsers}>verify all users</button>
				<table>
					<thead>
						<tr>
							<th>Display Name</th>
							<th>Email</th>
							<th>Has Avatar</th>
							<th>Verified</th>
							<th>Role</th>
							<th>Banned</th>
						</tr>
					</thead>
					<tbody>
					{this.state.users.map(user => {
						const isAdmin = admins.ids.includes(user.uid);
						const isBanned = bannedUsers.ids.includes(user.uid);
						return (
							<tr key={user.uid}>
								<td>{user.displayName}</td>
								<td>{user.email}</td>
								<td>{user.avatarUrl ? 'av' : 'no av'}</td>
								<td>{user.verifiedWithCode ? 'V' : '-'}</td>
								<td>{isAdmin ? 'admin' : '-'}</td>
								<td>{isBanned ? 'V' : '-'}</td>
								<td>
									<button onClick={() => this.onBanClick(user.uid, isBanned)}>
										{isBanned ? 'unban' : 'ban'}
									</button>
								</td>
							</tr>
						);
					})}
					</tbody>
				</table>
			</div>
		);
	}
}

export default Admin;
