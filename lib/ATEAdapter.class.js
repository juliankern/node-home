module.exports = (logger) => {
    const ATE = require('../../node-smartnode-ATE/lib/antitroubleengine')(logger);

    ////////////////////////////////////////////////////////////////////////////////////////////////

    /**
     * Adapter to connect the smarthome-server to the ATE logic.
     *
     * @author  Dennis Sterzenbach <dennis.sterzenbach@gmail.com>
     */
    return class ATEAdapter {
        constructor() {

        }

        init(config) {
            this.ate = new ATE(config);

            return this;
        }

        handle(event) {
            logger.debug('ATEAdapter.handle', event);

            this.ate.handle(event);

            return this;
        }

        attachToSocket(socket) {
            this.ateSocket = socket;

            return this;
        }
    };

};