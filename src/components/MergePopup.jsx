import React, { useRef } from "react";
import { useSubscribeToCollection } from "../utils/hooks";
import { format } from "date-fns";
import { COMPACT_DATE_FORMAT } from "../utils/constants";

export default function MergePopup({
  forumId,
  threadId,
  okText = "ok",
  cancelText = "cancel",
  okClass = "danger",
  onClose = () => {},
  onOk = () => {},
  onCancel = () => {},
}) {
  const threads = useSubscribeToCollection(`forums/${forumId}/threads`, [
    { orderBy: ["priority", "desc"] },
    { orderBy: ["updatedTime", "desc"] },
  ]);

  const selectRef = useRef();

  function handleOkClick() {
    onOk(selectRef.current.value);
    onClose();
  }

  function handleCancelClick() {
    onCancel();
    onClose();
  }

  const selectBox = threads && (
    <select className="mx-1 p-1 border-2 border-main rounded" ref={selectRef}>
      {threads
        .filter((thread) => thread.id !== threadId)
        .map((thread) => (
          <option key={thread.id} value={thread.id}>
            {thread.title} ({thread.postCount} posts) (updated{" "}
            {format(thread.updatedTime, COMPACT_DATE_FORMAT)})
          </option>
        ))}
    </select>
  );

  return (
    <div className="dialog-container">
      <div className="bg-white border-2 border-main rounded p-4">
        <div className="my-4">
          <label className="text-lg" htmlFor="thread-select">
            Merge this thread with:
          </label>
          {selectBox}
        </div>
        <div className="flex space-x-2">
          <button className="btn btn-neutral" onClick={handleCancelClick}>
            {cancelText}
          </button>
          <button className={"btn btn-" + okClass} onClick={handleOkClick}>
            {okText}
          </button>
        </div>
      </div>
    </div>
  );
}
