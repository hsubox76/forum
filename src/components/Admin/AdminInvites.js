import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { STANDARD_DATE_FORMAT } from '../../utils/constants';
import {
	getAllInvites,
} from '../../utils/dbhelpers';

function AdminInvites(props) {
	const [invites, setInvites] = useState([]);
	
	useEffect(() => {
		getAllInvites().then(invites => setInvites(invites));
	}, []);

  return (
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
  );
}

export default AdminInvites;