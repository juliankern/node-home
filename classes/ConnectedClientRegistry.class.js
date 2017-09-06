module.exports = () => {
    return class ConnectedClientRegistry {
        constructor(storage, parentServer) {
            this.storage = storage;
            this.parentServer = parentServer;

            this.clients = {};
        }

        registerClient(data) {
            let savedClients = this.storage.get('clients');

            savedClients[data.id] = {
                id: data.id,
                plugin: data.plugin,
                configurationFormat: data.configurationFormat,
                displayName: data.displayName,
                config: {}
            };

            if (data.config) {
                savedClients[data.id].config = data.config;
            }

            this.storage.set('clients', savedClients);

            this.connectClient(data);

            return savedClients[data.id];
        }

        connectClient(data) {
            this.clients[data.id] = this.parentServer.getNewPlugin(data);

            return this.getClientById(data.id);
        }

        getClientIdList() {
            return Object.keys(this.clients);
        }

        getClientList() {
            return this.clients;
        }

        getClientById(id) {
            return this.clients[id];
        }

        getClientBySocketId(socketId) {
            return this.getClientById(findClientIdBySocketId.call(this, socketId));

            function findClientIdBySocketId(socketId) {
                return this.getClientIdList().find((clientId) => {
                    return this.getClientById(clientId).socket.client.id === socketId;
                });
            }
        }

        updateClient(id, data) {
            if (data.config) {
                let savedClients = this.storage.get('clients');
                savedClients[id].config = data.config;
                this.storage.set('clients', savedClients);
            }

            let client = this.getClientById(id);

            if (!client) {
                return undefined;
            }

            return Object.assign(client, data);
        }

        updateClientBySocketId(id, data) {
            return this.updateClient(this.getClientBySocketId(id).id, data);
        }

        removeClient(id) {
            return delete this.clients[id];
        }

        removeClientBySocketId(id) {
            return this.removeClient(this.getClientBySocketId(id).id);
        }

        deleteClient(id) {
            let savedClients = this.storage.get('clients');
            delete savedClients[id];
            this.storage.set('clients', savedClients);
        }

        unpairClient(clientId) {
            let connectedClient = this.getClientById(clientId);

            global.log('ConnectedClientRegistry.unpairClient', clientId);
            
            return (connectedClient && ('unpair' in connectedClient)) && connectedClient.unpair() || undefined;
        }

    };
};