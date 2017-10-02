const utils = global.SmartNode.require('util/');
const Logger = global.SmartNode.require('classes/Log.class');

/**
 * Collection of Event-Handlers registered on each socket connection.
 *
 * @author  Dennis Sterzenbach <dennis.sterzenbach@gmail.com>
 * @author  Julian Kern <mail@juliankern.com>
 */
module.exports = SmartNodeServer => class SocketEventsHandler {
    constructor(socket, ServerClientConnector) {
        this._socket = socket;
        this._logger = new Logger();

        const eventHandlers = [
            'connected',
            'register',
            'disconnect',
            'pluginloaded',
        ];

        const connectionId = ServerClientConnector.register(socket);

        eventHandlers.forEach((name) => {
            ServerClientConnector.addHandler(connectionId, name, this[name].bind(this));
        });
    }

    async connected({ plugin, configurationFormat, displayName, id }, cb) {
        this._logger.info(`Client connected with ID: ${id}, Plugin: ${plugin}`);

        const clients = await SmartNodeServer.clients.registeredClients.getAll();

        if (!id || !clients[id]) {
            const clientId = utils.findClientId(clients);

            SmartNodeServer.registerClient({
                id: clientId,
                socket: this._socket,
                plugin,
                configurationFormat,
                displayName,
            });

            cb({ id: clientId });
        } else {
            SmartNodeServer.connectClient(Object.assign({
                id,
                socket: this._socket,
                plugin,
                configurationFormat,
                displayName,
            }, { config: clients[id].config }));

            const client = SmartNodeServer.getClientById(id);

            cb({ id: client.id, config: client.config });
        }
    }

    async register({ id }, cb) {
        const client = await SmartNodeServer.clients.registeredClients.get(id);
        const configuration = client ? client.config : undefined;
        const configurationFormat = client ? client.configurationFormat : undefined;
        let eventname;

        // check if configuration already exists and if its valid
        if (configuration && !SmartNodeServer.validConfiguration(configuration, configurationFormat)) {
            // valid configuration exists
            // => continue with loading
            this._socket.join(configuration.room);
            eventname = 'client-connect';

            cb({ config: configuration });
        } else {
            // no configuration exists or it's not valid anymore
            // => stop here, and wait for configuration via web interface
            this._logger.info('Client has no configuration yet, waiting for web configuration');

            eventname = 'client-register';
            cb();
        }

        SmartNodeServer.webNotifications.broadcast(eventname, SmartNodeServer.clients.connectedClients.get(id));
    }

    async disconnect(reason) {
        SmartNodeServer.disconnectClient(this._socket.client.id, reason);

        SmartNodeServer.webNotifications.broadcast('client-disconnect',
            await SmartNodeServer.clients.getClientBySocketId(this._socket.client.id));

        this._logger.warn('Client disconnected! ID:', this._socket.client.id, reason);
    }

    async pluginloaded() {
        SmartNodeServer.clientPluginLoaded(this._socket.client.id, true)
            .catch((e) => { this._logger.error('Server load plugin error (4)', e); });
    }
};
