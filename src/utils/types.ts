export enum LOADING_STATUS {
  LOADING = "loading",
  LOADED = "loaded",
  DELETING = "deleting",
  DELETED = "deleted",
  EDITING = "editing",
  SUBMITTING = "submitting",
  PERMISSIONS_ERROR = "permissions-error",
};
export interface Forum {
  id: string;
  name: string;
  order: number;
  readBy: { [uid: string]: number };
  unreadBy: string[];
  requiresClaims: string[];
  threadList: string[];
  updatedBy: string;
  updatedTime: number;
}

export interface Thread {
  id: string;
  createdBy: string;
  createdTime: number;
  updatedBy: string;
  updatedTime: number;
  forumId: string;
  isSticky: boolean;
  postCount: number;
  postIds: string[];
  priority: number;
  readBy: { [uid: string]: number };
  title: string;
  unreadBy: string[];
}

export interface PostFirestoreData {
  id: string;
  content: string;
  createdTime: number;
  parentForum: string;
  parentThread: string;
  uid: string;
  unreadBy: string[];
  updatedTime?: number;
  updatedBy?: string;
  reactions: { [key: string]: string[] };
}

export interface PostDisplayData extends PostFirestoreData {
  createdByUser: UserPublic;
  updatedByUser: UserPublic;
  index: number;
}

export interface UserPublic {
  id: string;
  displayName: string;
  mod?: boolean;
  admin?: boolean;
  photoURL?: string;
  pwot?: boolean;
  bio?: string;
}

export interface UserAdminView {
  id: string;
  uid: string;
  disabled: boolean;
  displayName: string;
  email: string;
  verifiedWithCode: boolean;
  verifiedDate: number;
  photoURL: string;
  customClaims: Claims;
  notifications?: {
    forums?: string[];
    threads?: string[];
    all?: boolean;
  }
}

export interface Invite {
  id: string;
  createdAt: number;
  createdByName: string;
  createdByUid: string;
  usedAt?: number;
  usedBy?: string;
  wasUsed: boolean;
}

export interface Claims {
  admin?: boolean;
  mod?: boolean;
  banned?: boolean;
  validated?: boolean;
  pwot?: boolean;
}

export interface DialogData {
  type?: string,
  message?: string,
  okText?: string,
  cancelText?: string,
  okClass?: string,
  onOk: (...args: any[]) => void,
  onCancel?: () => void,
  forumId?: string,
  threadId?: string
}

export interface QueryOption { orderBy: string | string[] };

export type ReactionType =
  | "laugh-beam"
  | "angry"
  | "surprise"
  | "sad-tear"
  | "heart"
  | "thumbs-up"
  | "thumbs-down";

  export interface Reaction {
    faName: ReactionType;
    desc: string;
  }