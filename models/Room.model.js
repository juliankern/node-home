const ServerStorage = global.SmartNode.require('classes/Storage2.class').Server;

module.exports = class RoomModel extends ServerStorage {
    constructor() {
        super();
    }

    async init() {
        await super.init();

        return super.model('rooms', {
            title: 'room schema',
            version: 0,
            type: 'object',
            properties: {
                name: {
                    type: 'string',
                    primary: true,
                },
            },
        });
    }
};
