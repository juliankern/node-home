module.exports = (SmartNodeServer) => {
    /**
     * Collection of Event-Handlers registered on each socket connection.
     *
     * @author  Dennis Sterzenbach <dennis.sterzenbach@gmail.com>
     */
    return function(SmartNodeServerClientConnector, socket) {
        const socketEventHandlers = {};

        socketEventHandlers.register = async ({ configuration, configurationFormat, plugin }, cb) => {
            let clientData ={
                id: socket.client.id, 
                format: configurationFormat,
                plugin
            };

            // check if configuration already exists and if its valid
            if (configuration && SmartNodeServer.validConfiguration(configuration, configurationFormat)) {
                // valid configuration exists
                // => continue with loading
                clientData.socket = socket;
                clientData.config = configuration;

                socket.join(configuration.room);
            } else {
                // no configuration exists or it's not valid anymore
                // => stop here, and wait for configuration via web interface

                global.muted('Client has no configuration yet, waiting for web configuration');
            }

            SmartNodeServer.addClient(clientData);


            cb(Object.assign({}, clientData, { success: true }));
        }

        socketEventHandlers.disconnect = async (reason) => {
            SmartNodeServer.unloadServerPlugin(socket.client.id);
            SmartNodeServerClientConnector.unregister(socket.client.id, reason);

            global.warn('Client disconnected! ID:', socket.client.id, reason);
        };

        socketEventHandlers.pluginloaded = async () => {
            SmartNodeServer.clientPluginLoaded(socket.client.id, true)
                .catch((e) => { global.error('Server load plugin error (4)', e) });;
        };

        return socketEventHandlers;
    }
};

