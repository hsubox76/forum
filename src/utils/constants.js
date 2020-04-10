export const STANDARD_DATE_FORMAT = "hh:mm a MMM dd, yyyy";
export const COMPACT_DATE_FORMAT = "hh:mma MM/dd/yy";

export const POSTS_PER_PAGE = 15;

export const LOADING_STATUS = {
  LOADING: "loading",
  LOADED: "loaded",
  DELETING: "deleting",
  DELETED: "deleted",
  EDITING: "editing",
  SUBMITTING: "submitting",
  PERMISSIONS_ERROR: "permissions-error"
};

export const reactions = [
  { faName: "laugh-beam", desc: "laugh" },
  { faName: "angry", desc: "angry" },
  { faName: "surprise", desc: "surprised" },
  { faName: "sad-tear", desc: "sad" },
  { faName: "heart", desc: "love" },
  { faName: "thumbs-up", desc: "thumbs up" },
  { faName: "thumbs-down", desc: "thumbs down" }
];

export const ROLE_PROP = {
  admins: "isAdmin",
  moderators: "isMod",
  bannedUsers: "isBanned"
};
