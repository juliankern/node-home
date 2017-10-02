// require('babel-polyfill');
const RxDB = require('rxdb');

const pkg = global.SmartNode.require('package.json');

RxDB.plugin(require('pouchdb-adapter-node-websql'));

module.exports = {
    Server: class ServerStorage {
        constructor() {
            this.db = {};
        }

        async init() {
            this.db = await RxDB.create({
                name: `${pkg.config ? pkg.config.datapath : 'storage'}/serverstorage`,
                adapter: 'websql',
            });
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
