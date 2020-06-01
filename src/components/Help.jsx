import React from "react";

const Help = () => (
  <div className="container mx-auto">
    <h1 className="text-3xl text-main my-2">Help</h1>
    <h2 className="text-2xl">Tags</h2>
    <div className="flex border-b-2 border-main text-lg">
      <div className="w-20 p-1 font-medium">type</div>
      <div className="w-64 p-1 font-medium">example</div>
      <div className="p-1 font-medium">syntax</div>
    </div>
    <div className="help-row">
      <div className="label">bold</div>
      <div className="example font-medium">bold</div>
      <div className="text">[b]bold[/b]</div>
    </div>
    <div className="help-row">
      <div className="label">italic</div>
      <div className="example italic">italic</div>
      <div className="text">[i]italic[/i]</div>
    </div>
    <div className="help-row">
      <div className="label">spoiler</div>
      <div className="example">
        <span className="spoiler" style={{ color: "#555" }}>
          spoiler
        </span>
      </div>
      <div className="text">[spoiler]spoiler[/spoiler]</div>
    </div>
    <div className="help-row">
      <div className="label">image</div>
      <div className="example"></div>
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
      <div className="example">
        <span className="underline text-highlight">check this out</span>
      </div>
      <div className="text">[url="http://website.com"]check this out[/url]</div>
    </div>
    <div className="help-row">
      <div className="label">plain url</div>
      <div className="example">
        <span className="underline text-highlight">
          http://www.whatever.com
        </span>
      </div>
      <div className="text">
        paste any url and it will be clickable (not a tag)
      </div>
    </div>
  </div>
);

export default Help;
