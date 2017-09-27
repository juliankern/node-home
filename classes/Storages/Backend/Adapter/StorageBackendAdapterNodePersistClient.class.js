const NodePersist = require('node-persist');

module.exports = (logger) => {
    const StorageBackendAdapter = global.req('classes/Storages/Backend/Adapter/StorageBackendAdapter.class');

    return class StorageBackendAdapterNodePersistClient extends StorageBackendAdapter {
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
                .init({ dir: `storage/client/${this._config.pluginName}` })
                .then(() => {
                    this._logger.debug('Client storage inited!', this._config.pluginName);

                    if (this._config && this._config.callback) {
                        this._config.callback();
                    }
                });
        }

        async get(key) {
            return this._storage.getItem(key);
        }

        async set(key, value) {
            return this._storage.setItem(key, value);
        }
    };
};
