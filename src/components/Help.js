import React from "react";
import "../styles/Help.css";

const Help = () => (
  <div className="help-page">
    <h1 className="title">Help</h1>
    <h2 className="header">Tags</h2>
    <div className="help-row">
      <div className="label bold">bold</div>
      <div className="text">[b]bold[/b]</div>
    </div>
    <div className="help-row">
      <div className="label italic">italic</div>
      <div className="text">[i]italic[/i]</div>
    </div>
    <div className="help-row">
      <div className="label">
        <span className="spoiler" style={{ color: "#555" }}>
          spoiler
        </span>
      </div>
      <div className="text">[spoiler]spoiler[/spoiler]</div>
    </div>
    <div className="help-row">
      <div className="label">image</div>
      <div className="text">
        <div className="aside">Specify width, height, both, or neither.</div>
        <div className="aside">
          (Note: images above 600 on desktop and 350 on mobile will be shrunk to
          that size.)
        </div>
        <div>[img]http://image-site.com/image.jpg[/img]</div>
        <div>[img width=400]http://image-site.com/image.jpg[/img]</div>
        <div>
          [img width=400 height=300]http://image-site.com/image.jpg[/img]
        </div>
      </div>
    </div>
    <div className="help-row">
      <div className="label">link</div>
      <div className="text">[url="http://website.com"]check this out[/url]</div>
    </div>
    <div className="help-row">
      <div className="label">plain url</div>
      <div className="text">paste any url and it will be clickable</div>
    </div>
  </div>
);

export default Help;
