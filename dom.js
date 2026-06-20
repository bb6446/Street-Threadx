const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const fs = require('fs');
// This is fake DOM but we can render the tsx if we compile it.
// Well, we can't easily compile React into real HTML without rendering.
