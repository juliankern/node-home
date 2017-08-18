module.exports = (SmartNodeServer) => {
    const getOriginalEventHandlers = global.req('bin/socketEventHandlers')(SmartNodeServer);
    const Logger = global;
    const ATEAdapterConfig = {};
    const ATEAdapter = new (global.req('lib/ATEAdapter.class.js')(Logger));
    const ATEHandlerFactory = new (global.req('lib/ATEHandlerFactory.class.js')(Logger, ATEAdapter));

    ATEAdapter.init(ATEAdapterConfig);

    /**
     * Provides the Event-Handlers to register on a socket connection.
     *
     * @author  Dennis Sterzenbach <dennis.sterzenbach@gmail.com>
     */
    return class SocketEventHandlersProvider {
        provideHandlers(Connector, socket) {
            let originalHandlers = getOriginalEventHandlers(Connector, socket);
            let ateInterceptor = ATEHandlerFactory.getHandlerFactory(Connector, socket);
            
            for (let [name, originalHandlerFn] of Object.entries(originalHandlers)) {
                let newHandler = ateInterceptor(name, originalHandlerFn);

                originalHandlers[name] = newHandler;

                Logger.debug('SocketEventHandlersProvider.provideHandlers', name);
            }

            return originalHandlers;
        }
    };

}
