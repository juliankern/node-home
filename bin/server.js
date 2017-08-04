require('../util/global.js');
global.log('');
const pkg = global.req('package.json');

const fs = require('fs');
const storage = require('node-persist');
const cli = require('cli');
const bonjour = require('bonjour')();

cli.enable('version');
cli.setApp(pkg.name, pkg.version)
const options = cli.parse({
    port: [ 'p', 'A port to use instead of autodiscover', 'int', null ]
});

const app = require('http').createServer((req, res) => {
    res.writeHead(200);
    res.end('Hello World');
});
const io = require('socket.io')(app);

storage.initSync({
    dir: 'storage/server'
});

storage.setItemSync('clients', {});

(async () => {
    let port = options.port || (await findPort());

    app.listen(port, () => {
        bonjour.publish({ name: 'node-home Server', type: 'node-home', port: port });

        global.success(`Home server up and running, broadcasting via bonjour on port ${port}`);
    });
    
    io.on('connection', (socket) => {
        global.log('Client connected');

        socket.on('register', async (data, cb) => {
            let clients = await storage.getItem('clients');
            clients[socket.client.id] = {};
            clients[socket.client.id].room = data.room;
            clients[socket.client.id].type = data.type;
            
            await storage.setItem('clients', clients);

            global.success('Client registered! ID: ', socket.client.id, data);

            socket.join(data.room);

            global.muted('Clientlist: ', clients);

            cb(Object.assign(data, { success: true }));
        });

        socket.on('disconnect', async (reason) => {
            global.warn('Client disconnected! ID:', socket.client.id, reason);
            let clients = await storage.getItem('clients');
            delete clients[socket.client.id];
            
            await storage.setItem('clients', clients);

            global.muted('Clientlist: ', clients);
        });

        socket.on('libloaded', async () => {
            global.success(`Client ${socket.client.id} has loaded it's library`);

            //> TODO start loading own server libs, announce as accessory etc

            let clients = await storage.getItem('clients');
            clients[socket.client.id].loaded = true;
            
            await storage.setItem('clients', clients);
        })
    });
})();

function findPort(start) {
    var portrange = start || 8000;

    function find(cb) {
        var port = portrange;
        portrange += 1;

        var server = require('http').createServer();
        server.listen(port, (err) => {
            server.once('close', () => {
                cb(port);
            });
            server.close();
        });
        server.on('error', (err) => {
            find(cb);
        });
    }

    return new Promise((resolve, reject) => {
        find((port) => {
            resolve(port);
        })
    });
}

function exitHandler(options, err) {
    if (err) {
        global.error('System error!', err);
    }

    io.close();

    bonjour.unpublishAll(() => {
        global.success('Bonjour service unpublished!');

        if (options.cleanup) {

        }

        if (options.exit) process.exit();
    });


    if (err) global.error(err.stack);
}

//do something when app is closing
process.on('exit', exitHandler.bind(null, { cleanup: true }));

//catches ctrl+c event
process.on('SIGINT', exitHandler.bind(null, { exit: true, cleanup: true }));

//catches uncaught exceptions
process.on('uncaughtException', exitHandler.bind(null, { exit: true }));