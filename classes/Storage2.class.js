require('babel-polyfill');
var RxDB = require('rxdb');
RxDB.plugin(require('pouchdb-adapter-node-websql'));

module.exports = {
    Server: class ServerStorage {
        constructor() {
            this.db = {};
        }

        async init() {
            this.db = await RxDB.create({ name: 'serverstorage', adapter: 'websql' });
        }

        async model(name, schema) {
            if (schema) {
                await this.db.collection({
                    name,
                    schema,
                });
            }

            return this.db[name];
        }
    },
    Client: () => {},
};
