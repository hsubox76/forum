import React, { Component } from 'react';
import '../styles/Admin.css';
import { format } from 'date-fns';
import { STANDARD_DATE_FORMAT } from '../utils/constants';
import { getAllUsers, getAllInvites, verifyAllUsers } from '../utils/dbhelpers';

class Admin extends Component {
	constructor() {
		super();
		this.state = {
			users: [],
			invites: []
		};
	}
	componentDidMount() {
		getAllUsers().then(users => this.setState({ users }));
		getAllInvites().then(invites => this.setState({ invites }));
	}
	render() {
		if (!this.props.user.isAdmin) {
			return (
				<div className="admin-container">
					Sorry! You don't have permissions!
				</div>
			);
		}
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
					<tbody>
					{this.state.users.map(user => (
						<tr key={user.uid}> {/* oops this is is doc id not uid! */}
							<td>{user.displayName}</td>
							<td>{user.email}</td>
							<td>{user.avatarUrl ? 'av' : 'no av'}</td>
							<td>{user.verifiedWithCode ? 'V' : 'no'}</td>
						</tr>
					))}
					</tbody>
				</table>
			</div>
		);
	}
}

export default Admin;
