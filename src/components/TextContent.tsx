import React, { useContext, ReactNode } from "react";
import Linkify from "linkifyjs/react";
import escape from "lodash/escape";
import startsWith from "lodash/startsWith";
import trim from "lodash/trim";
import UserContext from "./UserContext";
import { getUser } from "../utils/dbhelpers";

const TAG_TYPES = {
  img: { className: "image" },
  url: { className: "link" },
  spoiler: { className: "spoiler" },
  b: { className: "bold" },
  i: { className: "italic" },
  quote: { className: "quote" },
  normal: { className: "normal" },
};

interface TagStates {
  b?: boolean,
  i?: boolean,
  spoiler?: boolean,
  currentUrl?: string | null,
};
interface TextNode extends TagStates {
  tagType : string | null;
  level: number;
  children: TextNode[];
  parent?: TextNode |null;
  text?: string;
  tagAttrs?: { [key: string]: string };
}


function linkifyAndLineBreak(
  text: string,
  tokenIndex: number,
  classes: string[],
  currentUrl?: string | null
) {
  let contentEls: ReactNode[] = [];
  let lines = [];
  if (text.includes("\n")) {
    lines = text.split("\n");
  } else {
    lines = [text];
  }
  lines.forEach((line, lineIndex) => {
    if (line) {
      if (currentUrl) {
        contentEls.push(<span key={`${tokenIndex}-${lineIndex}`}>{line}</span>);
      } else {
        const options = {
          className: "text-highlight underline",
        };
        const linkifiedLine = (
          <Linkify
            key={`${tokenIndex}-${lineIndex}`}
            // @ts-ignore
            className={classes.join(" ")}
            tagName="span"
            options={options}
          >
            {line}
          </Linkify>
        );
        contentEls.push(linkifiedLine);
      }
    }
    if (lineIndex !== lines.length - 1) {
      contentEls.push(
        <div key={`space-${tokenIndex}-${lineIndex}`} className="h-2" />
      );
    }
  });
  return contentEls;
}

const tagList = Object.keys(TAG_TYPES);
tagList.push("(?:url=[^\\]]+)");
tagList.push("(?:img [^\\]]+)");
tagList.push("(?:quote [^\\]]+)");
const tagRE = tagList.join("|");

const tagsWithProperties = ["img", "url", "quote"];

function extractTag(tag: string) {
  for (let i = 0; i < tagsWithProperties.length; i++) {
    if (startsWith(tag, tagsWithProperties[i])) {
      return tagsWithProperties[i];
    }
    if (startsWith(tag, "/")) {
      return tag.slice(1);
    }
  }
  return tag;
}

function getTagAttrs(tagString: string) {
  const tagParts = trim(tagString, "[]").split(" ");
  const tagAttrs: { [key: string]: string } = {};
  tagParts.forEach((part) => {
    if (part.includes("=")) {
      const pair = part.split(/=(.+)/, 2);
      tagAttrs[pair[0]] = trim(pair[1], '"');
    }
  });
  return tagAttrs;
}

const TextContent = (props: { content: string }) => {
  const context = useContext(UserContext);

  if (!props.content || typeof props.content !== "string") {
    return null;
  }
  const tokenDelimiterRE = new RegExp(`(\\[\\/?(?:${tagRE})\\])`);
  const tokens = props.content.split(tokenDelimiterRE);

  const root: TextNode = {
    level: 0,
    tagType: null,
    children: [],
    parent: null,
  };
  let currentNode = root;
  const tagLevels = Object.keys(TAG_TYPES).reduce(
    (obj: { [tagType: string]: number }, tagType) => {
      obj[tagType] = 0;
      return obj;
    },
    {}
  );

  const tagStates: { [key:string]: any} = {
    b: false,
    i: false,
    spoiler: false,
    currentUrl: null,
  };
  let currentUrl = null;

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (!token) {
      continue;
    }
    const tagMatch = token.match(/\[([^\]]+)\]/);
    const tagType = extractTag(tagMatch ? tagMatch[1] : "normal");
    const isBlockTag = tagType === "img" || tagType === "quote";
    const isTag = tagType !== "normal";
    const isClose = isTag && token[1] === "/";
    const tagAttrs = getTagAttrs(token);

    if (isBlockTag) {
      if (!isClose) {
        const newNode: TextNode = {
          tagType,
          level: ++tagLevels[tagType],
          children: [],
          parent: currentNode,
          ...tagStates,
          tagAttrs,
        };
        currentNode.children.push(newNode);
        currentNode = newNode;
      } else {
        if (!currentNode.parent) {
          break;
        }
        currentNode = currentNode.parent;
        tagLevels[tagType]--;
      }
    } else if (isTag) {
      if (isClose) {
        if (["b", "i", "spoiler"].includes(tagType)) {
          tagStates[tagType] = false;
        }
        if (tagType === "url") {
          currentUrl = null;
        }
      } else {
        if (["b", "i", "spoiler"].includes(tagType)) {
          tagStates[tagType] = true;
        }
        if (tagType === "url") {
          if (tagAttrs.url) {
            currentUrl = escape(tagAttrs.url);
          } else {
            currentUrl = "http://" + escape(tokens[i + 1]);
          }
        }
      }
    } else {
      currentNode.children.push({
        tagType: "text",
        level: tagLevels[tagType],
        text: token,
        children: [],
        ...tagStates,
        currentUrl,
      });
    }
  }

  let k = 0;
  function renderNode(node: { [key:string]: any }) {
    const classes = [];
    let quoteAuthor = "";
    if (node.tagType === "quote") {
      classes.push("border border-highlight mx-2 my-1 bg-light p-2");
      if (node.tagAttrs.name) {
        quoteAuthor = node.tagAttrs.name;
      }
      if (node.tagAttrs.uid) {
        if (context.usersByUid[node.tagAttrs.uid]) {
          quoteAuthor = context.usersByUid[node.tagAttrs.uid].displayName;
        } else {
          quoteAuthor = "?";
          // and fetch
          getUser(node.tagAttrs.uid, context, false);
        }
      }
    } else if (node.tagType === "bold") {
      classes.push("font-medium");
    } else if (node.tagType === "italic") {
      classes.push("italic");
    } else if (node.tagType === "img") {
      if (node.children[0]) {
        const url = encodeURI(node.children[0].text);
        return (
          <img
            alt="user inserted"
            key={"image-" + k++}
            src={url}
            width={node.tagAttrs.width || null}
            height={node.tagAttrs.height || null}
          />
        );
      }
    }
    return (
      <div key={node.level + "-" + k++} className={classes.join(" ")}>
        {node.tagType === "quote" && (
          <div className="font-medium text-sm bg-gray-300 p-1 mb-1">
            {quoteAuthor} said:
          </div>
        )}
        {node.children.map((child: TextNode, childIndex: number) => {
          if (child.tagType === "text") {
            if (!child.text) {
              return null;
            }
            const classes = [];
            let elementType = "span";
            if (child.b) {
              classes.push("bold");
            }
            if (child.i) {
              classes.push("italic");
            }
            if (child.spoiler) {
              classes.push("spoiler");
            }
            const props: { key: string, className: string, href?: string } = {
              key: node.level + "-" + k + "-" + childIndex,
              className: classes.join(" ")
            };
            if (child.currentUrl) {
              elementType = "a";
              props.href = child.currentUrl;
            }
            return React.createElement(
              elementType,
              props,
              linkifyAndLineBreak(child.text, k, classes, child.currentUrl)
            );
          } else {
            return renderNode(child);
          }
        })}
      </div>
    );
  }
  return renderNode(root);
};

export default TextContent;
