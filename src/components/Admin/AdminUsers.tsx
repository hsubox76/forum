import React, { useState, useEffect, ReactNode } from "react";
import {
  getAllUsers,
  verifyAllUsers,
  pwotAllUsers,
  migrateAllAvatars,
  toggleBan,
  toggleMod,
  toggleVal,
  migrateToTree,
} from "../../utils/dbhelpers";
import repeat from "lodash/repeat";
import sortBy from "lodash/sortBy";
import { RouteComponentProps } from "@reach/router";
import { UserAdminView } from "../../utils/types";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCaretDown, faCaretUp } from "@fortawesome/free-solid-svg-icons";

function AdminUsers(props: RouteComponentProps) {
  const [users, setUsers] = useState<UserAdminView[] | null>(null);
  const [sortField, setSortField] = useState("customClaims.validated");
  const [sortDirection, setSortDirection] = useState("desc");
  const [pageDisabled, setPageDisabled] = useState(false);
  const [showEmails, setShowEmails] = useState(false);

  useEffect(() => {
    getAllUsers(true).then((users) => setUsers(users));
  }, []);

  function onBanClick(uid: string, isBanned: boolean) {
    setPageDisabled(true);
    toggleBan(uid, !isBanned)
      .then(() => getAllUsers(true))
      .catch((e) => console.error(e))
      .finally(() => setPageDisabled(false));
  }

  function onModClick(uid: string, isMod: boolean) {
    setPageDisabled(true);
    toggleMod(uid, !isMod)
      .then(() => getAllUsers(true))
      .catch((e) => console.error(e))
      .finally(() => setPageDisabled(false));
  }

  function onValidateClick(uid: string, shouldVal: boolean) {
    setPageDisabled(true);
    toggleVal(uid, shouldVal)
      .then(() => getAllUsers(true))
      .catch((e) => console.error(e))
      .finally(() => setPageDisabled(false));
  }

  function toggleShowEmails() {
    setShowEmails(!showEmails);
  }

  function sortUsers(
    field: string,
    direction: string,
    usersToSort: UserAdminView[] | null
  ) {
    if (!usersToSort) return;
    let sortedUsers = sortBy(usersToSort, field);
    if (direction === "desc") {
      sortedUsers.reverse();
    }
    return sortedUsers;
  }

  function onSortClick(field: string) {
    let direction = "desc";
    if (sortField === field && sortDirection === "desc") {
      console.log("go asc");
      direction = "asc";
    }
    setSortField(field);
    setSortDirection(direction);
  }

  function SortableHeader({text, field}: { text?: string; field: string }) {
    let icon: ReactNode = null;
    if (field === sortField) {
      icon = (
        <span className="px-2">
          <FontAwesomeIcon
          className="text-ok"
            icon={sortDirection === "asc" ? faCaretUp : faCaretDown}
            size="lg"
          />
        </span>
      );
    }
    return (
      <th onClick={() => onSortClick(field)} className="cursor-pointer">
        <span className={field === sortField ? 'text-ok' : 'text-main'}>{text || field}</span>
        {icon}
      </th>
    );
  }

  if (pageDisabled) {
    return <div className="page-center">Updating the database.</div>;
  }

  const sortedUsers = sortUsers(sortField, sortDirection, users);

  return (
    <React.Fragment>
      <div className="flex space-x-2">
        <button className="btn btn-ok" onClick={() => verifyAllUsers(users)}>
          verify all users
        </button>
        <button className="btn btn-ok" onClick={() => pwotAllUsers(users)}>
          pwot all users
        </button>
        <button className="btn btn-ok" onClick={migrateAllAvatars}>
          migrate all avatars
        </button>
        <button className="btn btn-ok" onClick={migrateToTree}>
          migrate to tree structure
        </button>
        <button className="btn btn-ok" onClick={() => toggleShowEmails()}>
          {showEmails ? "hide" : "show"} user personal info
        </button>
      </div>
      {!sortedUsers && (
        <div className="page-center">
          <div className="loader loader-big" />
        </div>
      )}
      {sortedUsers && (
        <table>
          <thead>
            <tr>
              <SortableHeader text="Display Name" field="displayName" />
              <SortableHeader field="email" />
              <SortableHeader text="User ID" field="uid" />
              <th>Has Avatar</th>
              <SortableHeader text="validated" field="customClaims.validated" />
              <SortableHeader text="pwot" field="customClaims.pwot" />
              <SortableHeader text="mod" field="customClaims.mod" />
              <SortableHeader text="banned" field="disabled" />
            </tr>
          </thead>
          <tbody>
            {sortedUsers.map((user) => {
              const isAdmin = !!user.customClaims.admin;
              const isMod = !!user.customClaims.mod;
              const isBanned = user.disabled;
              return (
                <tr key={user.uid}>
                  <td>
                    {showEmails
                      ? user.displayName
                      : user.displayName[0] +
                        repeat("*", user.displayName.length - 1)}
                  </td>
                  <td>
                    {showEmails
                      ? user.email
                      : "--------------------------------------"}
                  </td>
                  <td>{user.uid}</td>
                  <td>{user.photoURL ? "av" : "no av"}</td>
                  <td>
                    <div className="flex">
                      {user.customClaims.validated ? "V" : "-"}
                      {!isAdmin && (
                        <button  className="btn btn-ok ml-1"
                          onClick={() =>
                            onValidateClick(
                              user.uid,
                              !user.customClaims.validated
                            )
                          }
                        >
                          {user.customClaims.validated ? "undo" : "val"}
                        </button>
                      )}
                    </div>
                  </td>
                  <td>{user.customClaims.pwot ? "V" : "-"}</td>
                  <td>
                    <div className="flex">
                      <div className="w-5">{isMod ? "M" : "-"}</div>
                      {!isAdmin && (
                        <button className="btn btn-ok ml-1" onClick={() => onModClick(user.uid, isMod)}>
                          {isMod ? "unmod" : "mod"}
                        </button>
                      )}
                    </div>
                  </td>
                  <td>
                    <div className="flex">
                      {isBanned ? "V" : "-"}
                      <button className="btn btn-ok ml-1" onClick={() => onBanClick(user.uid, isBanned)}>
                        {isBanned ? "unban" : "ban"}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </React.Fragment>
  );
}

export default AdminUsers;
