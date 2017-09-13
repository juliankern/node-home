class ConnectedClientsList {
    constructor() {
        this._clients = {};
    }

    add(id) {
        this._clients[id] = {};
    }

    get(id) {
        return this._clients[id];
    }

    getAll() {
        return this._clients;
    }

    remove(id) {
        delete this._clients[id];
    }

    fill(id, data) {
        this._clients[id] = data;
    }

    exists(id) {
        return !!this._clients[id];
    }

    update(id, data) {
        if (this.exists(id)) {
            this._clients[id] = mergeDeep(this._clients[id], data);
        }
    }
}

class RegisteredClientsList {
    constructor(storage) {
        this._storage = storage;
        this._clients = {};
    }

    async _read() {
        // console.log('RegisteredClientsList _read()', await this._storage.get('clients'));

        this._clients = (await this._storage.get('clients')) || {};
        return this._clients;
    }

    async _write() {
        // console.log('RegisteredClientsList _write()', this._clients);
        // console.log('RegisteredClientsList isArray()', Array.isArray(this._clients));
        // console.trace();

        return this._storage.set('clients', this._clients);
    }

    async add(id) {
        // console.log('RegisteredClientsList add(id)', id);
        await this._read();
        Object.assign(this._clients, { [id]: { id } });
        return this._write();
    }

    async exists(id) {
        await this._read();
        // console.log('RegisteredClientsList exists(id)', id, this._clients);
        return !!this._clients[id];
    }

    async fill(id, data) {
        await this._read();
        this._clients[id] = data;
        return this._write();
    }

    async get(id) {
        await this._read();
        return this._clients[id];
    }

    async getAll() {
        await this._read();
        return this._clients;
    }

    async remove(id) {
        await this._read();
        delete this._clients[id];
        return this._write();
    }

    async update(id, data) {
        // console.log('RegisteredClientsList update(id, data)', id, data);
        // console.log('RegisteredClientsList update 1', await this.exists(id));

        if (await this.exists(id)) {
            this._clients[id] = mergeDeep(this._clients[id], data);
            return this._write();
        }

        return false;
    }
}

module.exports = () => class ConnectedClientRegistry {
    constructor(storage, parentServer) {
        this.storage = storage;
        this.parentServer = parentServer;

        this.connectedClients = new ConnectedClientsList();
        this.registeredClients = new RegisteredClientsList(this.storage);
    }

    async registerClient(data) {
        console.log('registerClient with data', data);

        await this.registeredClients.add(data.id);
        this.connectedClients.add(data.id);
        this.connectedClients.fill(data.id, {
            id: data.id,
            plugin: data.plugin,
            configurationFormat: data.configurationFormat,
            displayName: data.displayName,
            config: {},
            registered: Date.now(),
        });

        if (data.config) {
            await this.registeredClients.update(data.id, { config: data.config });
        }

        console.log('after register', await this.registeredClients.getAll());

        return this.connectClient(data);
    }

    async connectClient(data) {
        this.connectedClients.fill(data.id, this.parentServer.getNewPlugin(data));

        await this.updateClient(data.id, { lastConnection: Date.now(), connected: true });
        await this.cleanClientlist();

        return this.connectedClients.get(data.id);
    }

    async disconnectClient(id) {
        await this.parentServer.updateClientBySocketId(id, { connected: false });
        return this.parentServer.unloadServerPlugin(id);
    }

    async cleanClientlist() {
        const registeredClients = await this.registeredClients.getAll();

        Object.keys(registeredClients).forEach(async (id) => {
            if (
                (
                    // is not connected and last connection is older than 5 hours
                    !registeredClients[id].connected &&
                    registeredClients[id].lastConnection &&
                    (Date.now() - registeredClients[id].lastConnection) > 1000 * 60 * 60 * 5
                ) || (
                    // is registered, but had no connection
                    // & registration is older than 15 minutes
                    registeredClients[id].registered && !registeredClients[id].lastConnection &&
                    ((Date.now() - registeredClients[id].registered) > 1000 * 60 * 15)
                )
            ) {
                await this.registeredClients.remove(id);
            }
        });
    }

    getClientIdList() {
        return Object.keys(this.connectedClients.getAll());
    }

    getClientList() {
        return this.connectedClients.getAll();
    }

    getClientById(id) {
        return this.connectedClients.get(id);
    }

    getClientBySocketId(socketId) {
        return this.connectedClients.get(findClientIdBySocketId.call(this, socketId));

        function findClientIdBySocketId(id) {
            return this.getClientIdList()
                .find(clientId => this.connectedClients.get(clientId).socket.client.id === id);
        }
    }

    async updateClient(id, data) {
        if (data.config || data.connected || data.lastConnection) {
            if (data.config) await this.registeredClients.update(id, { config: data.config });
            if (data.connected) await this.registeredClients.update(id, { connected: data.connected });
            if (data.lastConnection) {
                await this.registeredClients.update(id, { lastConnection: data.lastConnection });
            }
        }

        const client = this.connectedClients.get(id);

        if (!client) {
            return undefined;
        }

        return Object.assign(client, data);
    }

    async updateClientBySocketId(id, data) {
        return this.updateClient(this.getClientBySocketId(id).id, data);
    }

    removeClient(id) {
        return this.connectedClients.remove(id);
    }

    removeClientBySocketId(id) {
        return this.removeClient(this.getClientBySocketId(id).id);
    }

    async deleteClient(id) {
        return this.registeredClients.remove(id);
    }

    unpairClient(clientId) {
        const connectedClient = this.connectedClients.get(clientId);

        global.log('ConnectedClientRegistry.unpairClient', clientId);

        return ((connectedClient && ('unpair' in connectedClient)) && connectedClient.unpair()) || undefined;
    }
};

/**
 * Simple object check.
 * @param item
 * @returns {boolean}
 */
function isObject(item) {
    return (item && typeof item === 'object' && !Array.isArray(item));
}

/**
 * Deep merge two objects.
 * @param target
 * @param ...sources
 */
function mergeDeep(target, ...sources) {
    if (!sources.length) return target;
    const source = sources.shift();

    if (isObject(target) && isObject(source)) {
        // eslint-disable-next-line no-restricted-syntax
        for (const key in source) {
            if (isObject(source[key])) {
                if (!target[key]) Object.assign(target, { [key]: {} });
                mergeDeep(target[key], source[key]);
            } else {
                Object.assign(target, { [key]: source[key] });
            }
        }
    }

    return mergeDeep(target, ...sources);
}

