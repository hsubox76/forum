import React, { useState, useEffect } from 'react';
import { getAllUsers,
	verifyAllUsers,
	pwotAllUsers,
	migrateAllAvatars,
	toggleBan,
	toggleMod,
	toggleVal,
	migrateToTree
} from '../../utils/dbhelpers';
import repeat from 'lodash/repeat';
import sortBy from 'lodash/sortBy';

function AdminUsers(props) {
	const [users, setUsers] = useState([]);
	const [sortField, setSortField] = useState('customClaims.validated');
	const [sortDirection, setSortDirection] = useState('desc');
	const [pageDisabled, setPageDisabled] = useState(false);
	const [showEmails, setShowEmails] = useState(false);
	
	useEffect(() => {
    getAllUsers(true)
      .then(users => sortUsers(sortField, sortDirection, users));
	}, []);
	
	function onBanClick(uid, isBanned) {
		setPageDisabled(true);
		toggleBan(uid, !isBanned)
			.then(() => getAllUsers(true))
			.then(users => sortUsers(sortField, sortDirection, users))
			.catch(e => console.error(e))
			.finally(() => setPageDisabled(false));
	}
	
	function onModClick(uid, isMod) {
		setPageDisabled(true);
		toggleMod(uid, !isMod)
			.then(() => getAllUsers(true))
			.then(users => sortUsers(sortField, sortDirection, users))
			.catch(e => console.error(e))
			.finally(() => setPageDisabled(false));
	}
	
	function onValidateClick(uid, shouldVal) {
		setPageDisabled(true);
		toggleVal(uid, shouldVal)
			.then(() => getAllUsers(true))
			.then(users => sortUsers(sortField, sortDirection, users))
			.catch(e => console.error(e))
			.finally(() => setPageDisabled(false));
	}

	function toggleShowEmails() {
		setShowEmails(!showEmails);
  }

  function sortUsers(field, direction, usersToSort) {
    let sortedUsers = sortBy(usersToSort, field);
    if (direction === 'desc') {
      sortedUsers.reverse();
    }
    setSortField(field);
    setSortDirection(direction);
    setUsers(sortedUsers);
  }

  function onSortClick(field) {
    let direction = 'desc';
    if (sortField === field && sortDirection === 'desc') {
      console.log('go asc');
      direction = 'asc';
    }
    sortUsers(field, direction, users);
  }

  function SortButton(props) {
    let iconClass = 'none';
    if (props.field === sortField) {
      iconClass = sortDirection === 'asc' ? 'up' : 'down';
    }
    return (
      <button className="button-sort" onClick={() => onSortClick(props.field)}>
        <div className={'sort-icon ' + iconClass} />
      </button>
    );
  }
  
	if (pageDisabled) {
		return (
			<div className="admin-container">
				Updating the database.
			</div>
		);
  }
  
  console.log('Moderator list: ', users.filter(user => user.customClaims.mod).map(user => user.displayName).join(', '));
  
  return (
    <React.Fragment>
      <button className="button-edit" onClick={() => verifyAllUsers(users)}>verify all users</button>
      <button className="button-edit" onClick={() => pwotAllUsers(users)}>pwot all users</button>
      <button className="button-edit" onClick={migrateAllAvatars}>migrate all avatars</button>
      <button className="button-edit" onClick={migrateToTree}>migrate to tree structure</button>
      <button className="button-edit" onClick={() => toggleShowEmails()}>
        {showEmails ? 'hide' : 'show'} user personal info
      </button>
      <table>
        <thead>
          <tr>
            <th>Display Name <SortButton field="displayName" /></th>
            <th>Email <SortButton field="email" /></th>
            <th>UserID <SortButton field="uid" /></th>
            <th>Has Avatar</th>
            <th>Validated <SortButton field="customClaims.validated" /></th>
            <th>PWOT <SortButton field="customClaims.pwot" /></th>
            <th>Is Mod <SortButton field="customClaims.mod" /></th>
            <th>Banned <SortButton field="disabled" /></th>
          </tr>
        </thead>
        <tbody>
        {users.map(user => {
          const isAdmin = user.customClaims.admin;
          const isMod = user.customClaims.mod;
          const isBanned = user.disabled;
          return (
            <tr key={user.uid}>
              <td>{showEmails ? user.displayName : user.displayName[0] + repeat('*', user.displayName.length - 1)}</td>
              <td>{showEmails ? user.email : '--------------------------------------'}</td>
              <td>{user.uid}</td>
              <td>{user.photoURL ? 'av' : 'no av'}</td>
              <td>
                <div className="action-cell">
                  {user.customClaims.validated ? 'V' : '-'}
                  {!isAdmin && (
                    <button onClick={() => onValidateClick(user.uid, !user.customClaims.validated)}>
                    {user.customClaims.validated ? 'undo' : 'val'}
                    </button>
                  )}
                </div>
              </td>
              <td>{user.customClaims.pwot ? 'V' : '-'}</td>
              <td>
                <div className="action-cell">
                  {isMod ? 'M' : '-'}
                  {!isAdmin && (
                    <button onClick={() => onModClick(user.uid, isMod)}>
                    {isMod ? 'unmod' : 'mod'}
                    </button>
                  )}
                </div>
              </td>
              <td>
                <div className="action-cell">
                  {isBanned ? 'V' : '-'}
                  <button onClick={() => onBanClick(user.uid, isBanned)}>
                    {isBanned ? 'unban' : 'ban'}
                  </button>
                </div>
              </td>
            </tr>
          );
        })}
        </tbody>
      </table>
    </React.Fragment>
  );
}

export default AdminUsers;