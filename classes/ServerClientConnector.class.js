const Logger = global.SmartNode.require('classes/Log.class');

const connections = {};

/**
 * Connector for Server-Client connections. This allows to register, evolve,
 * evaluate and add handlers to any received connection.
 *
 * @author  Dennis Sterzenbach <dennis.sterzenbach@gmail.com>
 */
module.exports = class ServerClientConnector {
    constructor() {
        this._logger = new Logger();
    }

    getConnectionId(connection) {
        return (connection && connection.client && connection.client.id) || '';
    }

    isValidConnection(connection) {
        return connection && (this.getConnectionId(connection) !== '');
    }

    register(connection) {
        if (!this.isValidConnection(connection)) {
            this._logger.info('ServerClientConnector: invalid connection');
            return false;
        }

        const id = this.getConnectionId(connection);

        connections[id] = connection;
        this._logger.info('ServerClientConnector: register connection', id);

        return id;
    }

    addHandler(connectionId, type, handler) {
        const connection = connections[connectionId];

        if (connection) {
            this._logger.info('ServerClientConnector: register handler', connectionId, type);

            connection.on(type, handler);

            return true;
        }

        this._logger.error('ServerClientConnector: did not find connection', connectionId);

        return false;
    }

    unregister(connectionId) {
        if (connectionId in connections) {
            this._logger.info('ServerClientConnector: unregister connection', connectionId);

            delete connections[connectionId];

            return true;
        }

        return false;
    }
};
