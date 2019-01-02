const admin = require('./admin');

const firestore = admin.firestore();
firestore.settings({ timestampsInSnapshots: true });

module.exports = firestore;