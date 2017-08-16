require('../util/global.js');

const pkg = global.req('package.json');

const cli = require('cli');
cli.enable('version');
cli.setApp(pkg.name, pkg.version);

const cliOptions = cli.parse({ 
    port: [ 'p', 'A port to use instead of autodiscover', 'int', null ]
});

//////////////////////////////////////////////////////////

const SmartNodeServerClientConnector = global.req('classes/SmartNodeServerClientConnector.class.js')();
const ServerClientConnector = new SmartNodeServerClientConnector();
const SmartNodeServer = new (global.req('classes/SmartNodeServer.class.js'))();

const socketEventHandlers = require('./socketEventHandlers')(SmartNodeServer);

//////////////////////////////////////////////////////////

SmartNodeServer.init(cliOptions.port, ServerClientConnector, socketEventHandlers)
    .catch((e) => { global.error('Server init error', e) });

//////////////////////////////////////////////////////////

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

    SmartNodeServer.io.close();

    if (err) global.error(err.stack);

    if(SmartNodeServer.bonjour.published) {
        SmartNodeServer.bonjour.published = false;
        SmartNodeServer.bonjour.unpublishAll(() => {
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