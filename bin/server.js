require('../util/global.js');

const pkg = global.req('package.json');

const bonjour = require('bonjour')();
const utils = global.req('util');

const app = require('express')();
const server = require('http').Server(app);
const io = require('socket.io')(server);

const cli = require('cli');
cli.enable('version');
cli.setApp(pkg.name, pkg.version);
const cliOptions = cli.parse({ port: [ 'p', 'A port to use instead of autodiscover', 'int', null ]});

//////////////////////////////////////////////////////////

if (process.title === 'npm' && require('os').type().includes('Windows')) {
    global.warn('If you want to see the fontend, you\'ll need to run "npm run watch-scss" as well to compile CSS!');
    global.log('');
}

if (+process.version.replace('v', '').split('.')[0] < 8) {
    global.error('You need to upgrade to NodeJS 8 to run this application!');
    process.exit(1);
}

//////////////////////////////////////////////////////////

const SmartNodeServer = new (global.req('classes/SmartNodeServer.class.js'))();
const SmartNodeRouter = global.req('classes/SmartNodeRouter.class.js')(SmartNodeServer);

init().catch((e) => { global.error('Server init error', e) });

//////////////////////////////////////////////////////////

/**
 * init function
 *
 * @author Julian Kern <mail@juliankern.com>
 */
async function init() {
    let port = cliOptions.port || (await utils.findPort());

    server.listen(port, () => {
        bonjour.publish({ name: 'SmartNode Server', type: 'smartnode', port: port });
        bonjour.published = true;

        global.success(`SmartNode server up and running, broadcasting via bonjour on port ${port}`);
    });

    new SmartNodeRouter(app);
    
    io.on('connection', (socket) => {
        global.log('Client connected:', socket.client.id);

        socket.on('register', async (data, cb) => {
            SmartNodeServer.addClient(socket.client.id, {
                socket,
                id: socket.client.id, 
                config: data
            });

            socket.join(data.room);

            cb(Object.assign({}, data, { success: true }));
        });

        socket.on('disconnect', async (reason) => {
            SmartNodeServer.unloadServerPlugin(socket.client.id);

            global.warn('Client disconnected! ID:', socket.client.id, reason);
        });

        socket.on('pluginloaded', async () => {
            SmartNodeServer.clientPluginLoaded(socket.client.id, true)
                .catch((e) => { global.error('Server load plugin error (4)', e) });;
        })
    });
}

/**
 * exit handler for cleanup and stuff
 *
 * @author Julian Kern <mail@juliankern.com>
 *
 * @param  {object} err Holding the error messages
 */
function exitHandler(err) {
    global.log('SmartNode exiting...');

    if (err) {
        global.error('System error!', err);
    }

    io.close();

    if (err) global.error(err.stack);

    if(bonjour.published) {
        bonjour.published = false;
        bonjour.unpublishAll(() => {
            global.warn('Bonjour service unpublished!');

            SmartNodeServer.getClientIdList().forEach((id) => { 
                if (SmartNodeServer.getClientById(id).loaded) SmartNodeServer.unloadServerPlugin(id); 
            });

            process.exit();
        });
    } else {
        SmartNodeServer.getClientIdList().forEach((id) => { 
            if (SmartNodeServer.getClientById(id).loaded) SmartNodeServer.unloadServerPlugin(id); 
        });

        process.exit();
    }
}

//do something when app is closing
process.on('exit', exitHandler);
process.on('SIGINT', exitHandler);
process.on('uncaughtException', exitHandler);