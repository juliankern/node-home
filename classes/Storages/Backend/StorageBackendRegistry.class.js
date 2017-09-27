module.exports = (logger) => {
    const prefix = 'classes/Storages/Backend/Adapter/StorageBackendAdapterNodePersist';
    const StorageBackendAdapterNodePersistServer = (global.req(`${prefix}Server.class`))(logger);
    const StorageBackendAdapterNodePersistClient = (global.req(`${prefix}Client.class`))(logger);

    const AvailableBackends = {
        nodePersistBackend: StorageBackendAdapterNodePersistServer,
        nodePersistClient: StorageBackendAdapterNodePersistClient,
    };

    return class StorageBackendRegistry {
        constructor(appConfig) {
            this._config = appConfig;
            this._logger = logger;
        }

        getServerStorageBackendAdapter(params) {
            if (!this.serverStorageBackendAdapter) {
                const backendName = this._config.getSetting(this._config.backendTypes.server);
                const BackendImplementation = AvailableBackends[backendName];

                this._logger.info('StorageBackendRegistry.getServerStorageBackendAdapter - configured backend:' +
                    `"${backendName}" => using implementation "${BackendImplementation.name}"`);

                this.serverStorageBackendAdapter = new BackendImplementation(params);
            }

            return this.serverStorageBackendAdapter;
        }

        getClientStorageBackendAdapter(params) {
            const backendName = this._config.getSetting(this._config.backendTypes.client);
            const BackendImplementation = AvailableBackends[backendName];

            this._logger.info('StorageBackendRegistry.getClientStorageBackendAdapter - configured backend: ' +
                `"${backendName}" => using implementation "${BackendImplementation.name}"`);

            return new BackendImplementation(params);
        }
    };
};
