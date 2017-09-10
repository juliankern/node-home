module.exports = (SmartNodePlugin) => class ConnectedClientRegistry {
    constructor(storage, parentServer) {
        this.storage = storage;
        this.parentServer = parentServer;

        this.clients = {};
    }

    async registerClient(data) {
        console.log('registerClient', data);
        let savedClients = (await this.storage.get('clients')) || [];

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

        await this.storage.set('clients', savedClients);
        console.log('CLIENTLIST', await this.storage.get('clients'));

        this.connectClient(data);

        return savedClients[data.id];
    }

    connectClient(data) {
        console.log('connectClient', data);
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

    async updateClient(id, data) {
        if (data.config) {
            let savedClients = await this.storage.get('clients');
            console.log('updateCOnfig, saved clients:', savedClients);
            savedClients[id].config = data.config;
            await this.storage.set('clients', savedClients);
        }

        let client = this.getClientById(id);

        if (!client) {
            return undefined;
        }

        return Object.assign(client, data);
    }

    async updateClientBySocketId(id, data) {
        return await this.updateClient(this.getClientBySocketId(id).id, data);
    }

    removeClient(id) {
        return delete this.clients[id];
    }

    removeClientBySocketId(id) {
        return this.removeClient(this.getClientBySocketId(id).id);
    }

    async deleteClient(id) {
        let savedClients = await this.storage.get('clients');
        delete savedClients[data.id];
        await this.storage.set('clients', savedClients);
    }

    unpairClient(clientId) {
        let connectedClient = this.getClientById(clientId);

        global.log('ConnectedClientRegistry.unpairClient', clientId);
        
        return (connectedClient && ('unpair' in connectedClient)) && connectedClient.unpair() || undefined;
    }
};
