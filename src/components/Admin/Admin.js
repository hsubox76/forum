import React, { useState, useEffect } from "react";
import "../../styles/Admin.css";
import { Router, Redirect, Link } from "@reach/router";
import AdminInvites from "./AdminInvites";
import AdminUsers from "./AdminUsers";
import { getClaims } from "../../utils/dbhelpers";

function Admin() {
  const [userIsAdmin, setUserIsAdmin] = useState(false);

  useEffect(() => {
    getClaims().then(claims => setUserIsAdmin(claims.admin));
  }, []);

  if (!userIsAdmin) {
    return (
      <div className="admin-container">Sorry! You don't have permissions!</div>
    );
  }

  function isActive({ isCurrent }) {
    return isCurrent ? { className: "tab selected" } : null;
  }
  return (
    <div className="admin-container">
      <div className="tabs">
        <Link getProps={isActive} className="tab" to="users">
          Users
        </Link>
        <Link getProps={isActive} className="tab" to="invites">
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
