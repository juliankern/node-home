const NodePersist = require('node-persist');

module.exports = (logger) => {
    const StorageBackendAdapter = global.req('classes/Storages/Backend/Adapter/StorageBackendAdapter.class');

    return class StorageBackendAdapterNodePersistServer extends StorageBackendAdapter {
        constructor(config) {
            super(config);

            this._config = config;
            this._logger = logger;

            this._logger.debug('CONFIG', config, this);

            this.initStorage();
        }

        initStorage() {
            this._storage = NodePersist;
            this._storage
                .init({ dir: 'storage/server' })
                .then(() => {
                    this._logger.debug('Server storage inited!');

                    if (this._config && this._config.callback) {
                        this._config.callback();
                    }
                });
        }

        buildPath(key) {
            // console.log('buildPath', key, [this._room, this._plugin, key].filter(e => !!e).join('.'));
            return [].concat(this._config.prefixes).concat([key]).filter(e => !!e).join('.');
        }

        async get(key) {
            // console.log('Storage: get', this.buildPath(key), (await this._storage.getItem(this.buildPath(key))));
            return this._storage.getItem(this.buildPath(key));
        }

        async set(key, value) {
            // console.log('Storage: __set', this.buildPath(key), value);
            return this._storage.setItem(this.buildPath(key), value);
        }
    };
};
