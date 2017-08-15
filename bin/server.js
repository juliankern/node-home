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

const SmartNodeServerClientConnector = global.req('classes/SmartNodeServerClientConnector.class.js')();
const ServerClientConnector = new SmartNodeServerClientConnector();

const SmartNodeServer = new (global.req('classes/SmartNodeServer.class.js'))();
const SmartNodeRouter = global.req('classes/SmartNodeRouter.class.js')(SmartNodeServer);

const socketEventHandlers = require('./socketEventHandlers')(SmartNodeServer);

init(ServerClientConnector, socketEventHandlers).catch((e) => { global.error('Server init error', e) });

//////////////////////////////////////////////////////////

/**
 * init function
 *
 * @author Julian Kern <mail@juliankern.com>
 */
async function init(Connector, getEventHandlersForSocketFn) {
    let port = cliOptions.port || (await utils.findPort());

    server.listen(port, () => {
        bonjour.publish({ name: 'SmartNode Server', type: 'smartnode', port: port });
        bonjour.published = true;

        global.success(`SmartNode server up and running, broadcasting via bonjour on port ${port}`);
    });

    new SmartNodeRouter(app);

    io.on('connection', (socket) => {
        global.log('Client connected:', socket.client.id);

        let connectionId = Connector.register(socket);

        if (connectionId === false) {
            global.log('ERROR! Failed to register connection for new Client', socket.client.id);

        } else {
            let handlers = getEventHandlersForSocketFn(Connector, socket);

            global.log('Registering handlers for', connectionId);

            for (var [name, handler] of Object.entries(handlers)) {
                Connector.addHandler(connectionId, name, handler);
            }

        }
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