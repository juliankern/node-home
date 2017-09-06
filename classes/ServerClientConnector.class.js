let _connections = {};

module.exports = () => {
    /**
     * Connector for Server-Client connections. This allows to register, evolve,
     * evaluate and add handlers to any received connection.
     *
     * @author  Dennis Sterzenbach <dennis.sterzenbach@gmail.com>
     */
    return class SmartNodeServerClientConnector {
        constructor() {

        }

        getConnectionId(connection) {
            return connection && connection.client && connection.client.id || '';
        }

        isValidConnection(connection) {
            return connection && (this.getConnectionId(connection) !== '');
        }

        register(connection) {
            if (!this.isValidConnection(connection)) {
                global.log('SmartNodeServerClientConnector: invalid connection');
                return false;
            }

            let id = this.getConnectionId(connection);

            _connections[id] = connection;
            global.log('SmartNodeServerClientConnector: register connection', id);

            return id;
        }

        addHandler(connectionId, type, handler) {
            let _connection = _connections[connectionId];

            if (_connection) {
                global.log('SmartNodeServerClientConnector: register handler', connectionId, type);

                _connection.on(type, handler);

                return true;
            }

            global.error('SmartNodeServerClientConnector: did not find connection', connectionId);

            return false;
        }

        unregister(connectionId) {
            if (connectionId in _connections) {
                global.log('SmartNodeServerClientConnector: unregister connection', connectionId);
    
                delete _connections[connectionId];

                return true;
            }

            return false;
        }
    };
};
