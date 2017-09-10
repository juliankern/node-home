module.exports = () => class ConnectedClientRegistry {
    constructor(storage, parentServer) {
        this.storage = storage;
        this.parentServer = parentServer;

        this.clients = {};
    }

    async registerClient(data) {
        global.log('registerClient', data);
        const savedClients = (await this.storage.get('clients')) || [];

        savedClients[data.id] = {
            id: data.id,
            plugin: data.plugin,
            configurationFormat: data.configurationFormat,
            displayName: data.displayName,
            config: {},
        };

        if (data.config) {
            savedClients[data.id].config = data.config;
        }

        await this.storage.set('clients', savedClients);
        global.log('CLIENTLIST', await this.storage.get('clients'));

        this.connectClient(data);

        return savedClients[data.id];
    }

    connectClient(data) {
        global.log('connectClient', data);
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

        function findClientIdBySocketId(id) {
            return this.getClientIdList()
                .find(clientId => this.getClientById(clientId).socket.client.id === id);
        }
    }

    async updateClient(id, data) {
        if (data.config) {
            const savedClients = await this.storage.get('clients');
            global.log('updateCOnfig, saved clients:', savedClients);
            savedClients[id].config = data.config;
            await this.storage.set('clients', savedClients);
        }

        const client = this.getClientById(id);

        if (!client) {
            return undefined;
        }

        return Object.assign(client, data);
    }

    async updateClientBySocketId(id, data) {
        return this.updateClient(this.getClientBySocketId(id).id, data);
    }

    removeClient(id) {
        return delete this.clients[id];
    }

    removeClientBySocketId(id) {
        return this.removeClient(this.getClientBySocketId(id).id);
    }

    async deleteClient(id) {
        const savedClients = await this.storage.get('clients');
        delete savedClients[id];
        await this.storage.set('clients', savedClients);
    }

    unpairClient(clientId) {
        const connectedClient = this.getClientById(clientId);

        global.log('ConnectedClientRegistry.unpairClient', clientId);

        return ((connectedClient && ('unpair' in connectedClient)) && connectedClient.unpair()) || undefined;
    }
};
