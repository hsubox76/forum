// Import and initialize the Firebase Admin SDK.
require('./admin');

const httpsSetters = require('./https-setters.js');
const httpsGetters = require('./https-getters.js');
const triggers = require('./triggers.js');

module.exports = Object.assign({}, httpsSetters, httpsGetters, triggers);
