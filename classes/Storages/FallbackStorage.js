module.exports = (logger) => {
    const mockConfig = {
        backendTypes: {
            client: 'ClientStorageBackend',
            server: 'ServerStorageBackend',
        },
        getSetting: function getSetting(type) {
            return (type === mockConfig.backendTypes.client) ? 'nodePersistClient' : 'nodePersistBackend';
        },
    };

    const prefix = 'classes/Storages/Backend/';
    const StorageProvider = global.SmartNode.require('classes/Storages/StorageProvider.class');
    const StorageBackendRegistry = new (global.SmartNode.require(`${prefix}StorageBackendRegistry.class`)(logger))(mockConfig);

    return {
        Server: class ServerStorage extends StorageProvider {
            constructor({ room, plugin } = {}, cb) {
                super();

                this._logger = logger;
                this._room = room;
                this._plugin = plugin;
                this._backend = StorageBackendRegistry.getServerStorageBackendAdapter({
                    prefix: [room, plugin],
                    callback: cb,
                });
            }

            async get(key) {
                return this._backend.get(key);
            }

            async set(key, value) {
                return this._backend.set(key, value);
            }
        },
        Client: class ClientStorage extends StorageProvider {
            constructor(pluginName, cb) {
                super();

                this._logger = logger;
                this._pluginName = pluginName;
                this._backend = StorageBackendRegistry.getClientStorageBackendAdapter({
                    pluginName,
                    callback: cb,
                });
            }

            async get(key) {
                return this._backend.get(key);
            }

            async set(key, value) {
                return this._backend.set(key, value);
            }
        },
    };
};
