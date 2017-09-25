const ServerStorage = global.req('classes/Storage2.class').Server;
var RxDB = require('rxdb');

module.exports = async () => {
    console.dir(RxDB);
    const db = await ServerStorage();

    return db.collection({
        name: 'rooms',
        schema: {
            title: 'room schema',
            version: 0,
            type: 'object',
            properties: {
                name: {
                    type: 'string',
                    primary: true
                }
            }
        }
    });
};
