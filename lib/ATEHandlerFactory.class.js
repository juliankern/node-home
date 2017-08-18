module.exports = (Logger, ATEAdapter) => {

    // const ateLogger = console.log;

    /**
     * Factory to create ATE event handlers to intercept the events.
     *
     * @author  Dennis Sterzenbach <dennis.sterzenbach@gmail.com>
     */
    return class ATEHandlerFactory {
        getHandlerFactory(Connector, socket) {

            return function getHandlerForType(type, orgHandler) {
                Logger.debug('ATEHandlerFactory.getHandlerForType', type);

                switch (type) {
                    case 'register':
                        return async (data, cb) => {
                            let event = generateEvent(type, socket.client.id, data);

                            if (ATEAdapter.handle(event)) {
                                return orgHandler(data, cb);
                            }

                            return null;
                        };

                    case 'disconnect':
                        return async (reason) => {
                            let event = generateEvent(type, socket.client.id, reason);

                            if (ATEAdapter.handle(event)) {
                                return orgHandler(reason);
                            }

                            return null;
                        };

                }

                return orgHandler;
            };

            function generateEvent(type, clientId, payload) {
                let event = {};

                event.type = type;
                event.clientId = clientId;
                event.payload = payload;

                return event;
            }

        }
    };

};

function enhanceEvent(type, event) {
    event.ateEventType = type;
    return event;
}
