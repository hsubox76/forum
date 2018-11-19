import React, { Component } from 'react';
import '../styles/Admin.css';
import { getAllUsers, verifyAllUsers } from '../utils/dbhelpers';

class Admin extends Component {
	constructor() {
		super();
		this.state = {
			users: []
		};
	}
	componentDidMount() {
		getAllUsers().then(users => this.setState({ users }));
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
				<button className="button-edit" onClick={verifyAllUsers}>verify all users</button>
				<table>
					<tbody>
					{this.state.users.map(user => (
						<tr key={user.uid}>
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
