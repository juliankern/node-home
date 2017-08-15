module.exports = (SmartNodeServer) => {
    /**
     * Collection of Event-Handlers registered on each socket connection.
     *
     * @author  Dennis Sterzenbach <dennis.sterzenbach@gmail.com>
     */
    return function(SmartNodeServerClientConnector, socket) {
        const socketEventHandlers = {};

        socketEventHandlers.register = async (data, cb) => {
            SmartNodeServer.addClient(socket.client.id, {
                socket,
                id: socket.client.id, 
                config: data
            });

            socket.join(data.room);

            cb(Object.assign({}, data, { success: true }));
        };

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

