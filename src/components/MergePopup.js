import React, { useRef } from "react";
import "../styles/Dialog.css";
import {
  useSubscribeToCollection
} from "../utils/hooks";
import { format } from "date-fns";
import {
  COMPACT_DATE_FORMAT
} from "../utils/constants";

export default function MergePopup({
  forumId,
  threadId,
  okText = "ok",
  cancelText = "cancel",
  okClass = "edit",
  onClose = () => {},
  onOk = () => {},
  onCancel = () => {}
}) {
  const threads = useSubscribeToCollection(`forums/${forumId}/threads`, [
    { orderBy: ["priority", "desc"] },
    { orderBy: ["updatedTime", "desc"] }
  ]);

  const selectRef = useRef();

  function handleOkClick () {
    onOk(selectRef.current.value);
    onClose();
  };

  function handleCancelClick () {
    onCancel();
    onClose();
  };

  const selectBox = threads && (
    <select name="thread-select" ref={selectRef}>
      {threads.filter(thread => thread.id !== threadId).map(thread => (
        <option key={thread.id} value={thread.id}>{thread.title} ({thread.postCount} posts) (updated {format(thread.updatedTime, COMPACT_DATE_FORMAT)})</option>
      ))}
    </select>
  );

  return (
    <div className="dialog-container">
      <div className="dialog-box merge-popup">
        <div>
          <label className="top" htmlFor="thread-select">Merge this thread with:</label>
          {selectBox}
        </div>
        <div className="dialog-buttons">
          <button className="button-cancel" onClick={handleCancelClick}>
            {cancelText}
          </button>
          <button
            className={"button-" + okClass}
            onClick={handleOkClick}
          >
            {okText}
          </button>
        </div>
      </div>
    </div>
  );
}
