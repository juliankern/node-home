require('babel-polyfill');
var RxDB = require('rxdb');
RxDB.plugin(require('pouchdb-adapter-node-websql'));

module.exports = {
    Server: () => RxDB.create({ name: 'serverstorage', adapter: 'websql' }),
    Client: () => {
    },
};
