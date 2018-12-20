import React, { useState, useEffect } from 'react';
import '../styles/Admin.css';
import { format } from 'date-fns';
import { STANDARD_DATE_FORMAT } from '../utils/constants';
import { getAllUsers,
	getAllInvites,
	verifyAllUsers,
	getRoles,
	toggleBan,
	toggleMod,
	getIsAdmin
} from '../utils/dbhelpers';

function Admin(props) {
	const [users, setUsers] = useState([]);
	const [invites, setInvites] = useState([]);
	const [roles, setRoles] = useState({});
	const [isAdmin, setIsAdmin] = useState(false);
	
	useEffect(() => {
		getAllUsers().then(users => setUsers(users));
		getAllInvites().then(invites => setInvites(invites));
		getRoles().then(roles => setRoles(roles));
		getIsAdmin().then(adminStatus => setIsAdmin(adminStatus))
	}, []);
	
	function onBanClick(uid, isBanned) {
		toggleBan(uid, !isBanned);
		getRoles().then(roles => setRoles(roles));
	}
	
	function onModClick(uid, isMod) {
		toggleMod(uid, !isMod);
		getRoles().then(roles => setRoles(roles));
	}
	
	if (!isAdmin) {
		return (
			<div className="admin-container">
				Sorry! You don't have permissions!
			</div>
		);
	}
	const admins = roles.admins || { ids: [] };
	const moderators = roles.moderators || { ids: [] };
	const bannedUsers = roles.bannedUsers || { ids: [] };
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
				{invites.map(invite => (
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
				{users.map(user => {
					const userIsAdmin = admins.ids.includes(user.uid);
					const isMod = moderators.ids.includes(user.uid);
					const isBanned = bannedUsers.ids.includes(user.uid);
					const role = userIsAdmin ? 'admin' : (isMod ? 'mod' : '-');
					return (
						<tr key={user.uid}>
							<td>{user.displayName}</td>
							<td>{user.email}</td>
							<td>{user.avatarUrl ? 'av' : 'no av'}</td>
							<td>{user.verifiedWithCode ? 'V' : '-'}</td>
							<td>{role}</td>
							<td>
								<button onClick={() => onModClick(user.uid, isMod)}>
									{isMod ? 'unmod' : 'mod'}
								</button>
							</td>
							<td>{isBanned ? 'V' : '-'}</td>
							<td>
								<button onClick={() => onBanClick(user.uid, isBanned)}>
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

export default Admin;
