const utils = global.req('util/');
/**
 * Collection of Event-Handlers registered on each socket connection.
 *
 * @author  Dennis Sterzenbach <dennis.sterzenbach@gmail.com>
 */
module.exports = SmartNodeServer => (SmartNodeServerClientConnector, socket) => {
    const socketEventHandlers = {};

    socketEventHandlers.connected = async ({ plugin, configurationFormat, displayName, id }, cb) => {
        global.muted(`Client connected with ID: ${id}, Plugin: ${plugin}`);

        const clients = await SmartNodeServer.clients.registeredClients.getAll();

        if (!id || !clients[id]) {
            const clientId = utils.findClientId(clients);

            SmartNodeServer.registerClient({
                id: clientId,
                socket,
                plugin,
                configurationFormat,
                displayName,
            });

            cb({ id: clientId });
        } else {
            SmartNodeServer.connectClient(Object.assign({
                id,
                socket,
                plugin,
                configurationFormat,
                displayName,
            }, { config: clients[id].config }));

            const client = SmartNodeServer.getClientById(id);

            cb({ id: client.id, config: client.config });
        }
    };

    socketEventHandlers.register = async ({ id }, cb) => {
        const client = await SmartNodeServer.clients.registeredClients.get(id);
        const configuration = client ? client.config : undefined;
        const configurationFormat = client ? client.configurationFormat : undefined;

        // check if configuration already exists and if its valid
        if (configuration && !SmartNodeServer.validConfiguration(configuration, configurationFormat)) {
            // valid configuration exists
            // => continue with loading

            socket.join(configuration.room);

            cb({ config: configuration });
        } else {
            // no configuration exists or it's not valid anymore
            // => stop here, and wait for configuration via web interface
            global.muted('Client has no configuration yet, waiting for web configuration');
            // global.debug('getAll()', await SmartNodeServer.clients.registeredClients.getAll());
            // global.debug('id', id);
            // global.debug('client', client);
            // global.debug('configuration', configuration);
            // global.debug('validConfiguration', 
            //  SmartNodeServer.validConfiguration(configuration, configurationFormat));

            cb();
        }
    };

    socketEventHandlers.disconnect = async (reason) => {
        SmartNodeServer.disconnectClient(socket.client.id);
        SmartNodeServerClientConnector.unregister(socket.client.id, reason);

        global.warn('Client disconnected! ID:', socket.client.id, reason);
    };

    socketEventHandlers.pluginloaded = async () => {
        SmartNodeServer.clientPluginLoaded(socket.client.id, true)
            .catch((e) => { global.error('Server load plugin error (4)', e); });
    };

    return socketEventHandlers;
};

