const utils = global.SmartNode.require('util/');
const Logger = global.SmartNode.require('classes/Log.class');

let SmartNodeServer;

module.exports = class ServerSocketEvents {
    constructor(socket, ServerClientConnector) {
        this._socket = socket;
        this._logger = new Logger();

        const eventHandlers = [
            'connected',
            'register',
            'disconnect',
            'clientpluginloaded',
        ];

        const connectionId = ServerClientConnector.register(socket);

        SmartNodeServer = global.SmartNode.getServerInstance();

        eventHandlers.forEach((name) => {
            ServerClientConnector.addHandler(connectionId, name, this[name].bind(this));
        });
    }

    async connected({ plugin, configurationFormat, displayName, id }, callback) {
        this._logger.info(`Client connected with ID: ${id}, Plugin: ${plugin}`);

        const clients = await SmartNodeServer.clients.registeredClients.getAll();

        if (!id || !Object.keys(clients).includes(id)) {
            const clientId = utils.findClientId(clients);

            SmartNodeServer.registerClient({
                id: clientId,
                socket: this._socket,
                plugin,
                configurationFormat,
                displayName,
            });

            callback({ id: clientId });
        } else {
            SmartNodeServer.connectClient(Object.assign({
                id,
                socket: this._socket,
                plugin,
                configurationFormat,
                displayName,
            }, { config: clients[id].config }));

            const client = SmartNodeServer.getClientById(id);

            callback({ id: client.id, config: client.config });
        }
    }

    async register({ id }, callback) {
        const client = await SmartNodeServer.clients.registeredClients.get(id);
        const configuration = client ? client.config : undefined;
        const configurationFormat = client ? client.configurationFormat : undefined;
        let eventname;
        let data;

        // check if configuration already exists and if its valid
        if (configuration && !SmartNodeServer.validConfiguration(configuration, configurationFormat)) {
            // valid configuration exists
            // => continue with loading
            this._socket.join(configuration.room);
            eventname = 'client-connect';

            data = { config: configuration };
        } else {
            // no configuration exists or it's not valid anymore
            // => stop here, and wait for configuration via web interface
            this._logger.info('Client has no configuration yet, waiting for web configuration');

            eventname = 'client-register';
        }

        await SmartNodeServer.loadServerPlugin(id).catch((e) => {
            this._logger.error('Server load plugin error (2)', e);
        });

        callback(data);

        SmartNodeServer.webNotifications.broadcast(eventname, SmartNodeServer.clients.connectedClients.get(id));
    }

    async disconnect(reason) {
        SmartNodeServer.disconnectClient(this._socket.client.id, reason);

        SmartNodeServer.webNotifications.broadcast('client-disconnect',
            await SmartNodeServer.clients.getClientBySocketId(this._socket.client.id));

        this._logger.warn('Client disconnected! ID:', this._socket.client.id, reason);
    }

    async clientpluginloaded() {
        SmartNodeServer.clientPluginLoaded(this._socket.client.id, true)
            .catch((e) => { this._logger.error('Server load plugin error (4)', e); });
    }
}
