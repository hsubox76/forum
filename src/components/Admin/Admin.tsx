import React, { useState, useEffect } from "react";
import { Router, Redirect, Link, RouteComponentProps } from "@reach/router";
import AdminInvites from "./AdminInvites";
import AdminUsers from "./AdminUsers";
import { getClaims } from "../../utils/dbhelpers";

interface AdminProps extends RouteComponentProps {
}

function Admin(props: AdminProps) {
  const [userIsAdmin, setUserIsAdmin] = useState(false);

  useEffect(() => {
    getClaims().then((claims) => setUserIsAdmin(!!claims.admin));
  }, []);

  if (!userIsAdmin) {
    return (
      <div className="container mx-auto">
        Sorry! You don't have permissions!
      </div>
    );
  }

  const tabClasses = "px-2 py-1 border-2 rounded";

  function isActive({ isCurrent }: {isCurrent: boolean}) {
    return isCurrent ? { className: tabClasses + " border-main" } : {};
  }
  return (
    <div className="container mx-auto">
      <div className="flex space-x-2 my-2">
        <Link getProps={isActive} className={tabClasses} to="users">
          Users
        </Link>
        <Link getProps={isActive} className={tabClasses} to="invites">
          Invites
        </Link>
      </div>
      <Router basepath="/admin">
        <AdminInvites path="/invites" />
        <AdminUsers path="/users" />
        <Redirect noThrow from="/" to="/admin/users" />
      </Router>
    </div>
  );
}

export default Admin;
