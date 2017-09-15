// ////////////////////////////////////////////////////////
// System checks

if (+process.version.replace('v', '').split('.')[0] < 8) {
    // eslint-disable-next-line no-console
    throw console.error('\n\x1B[1;31mYou need to upgrade to NodeJS 8 to run this application!\x1B[0m');
}

// //////////////////////////////////////////////////////

require('../util/global.js');

global.log('');

const pkg = global.req('package.json');
const cli = require('cli');

cli.enable('version');
cli.setApp('bin/server.js', pkg.version);

const cliOptions = cli.parse({
    port: ['p', 'Websocket port to use instead of autodiscover', 'int', null],
    web: ['w', 'Port for the website to use', 'int', null],
    nobonjour: ['n', 'Disable bonjour to let clients connect by the server address', 'bool', false],
});

// ////////////////////////////////////////////////////////

const SmartNodeServerClientConnector = global.req('classes/ServerClientConnector.class.js');
const ServerClientConnector = new SmartNodeServerClientConnector();
let socketEventHandlers = {};
const SmartNodeServer = new (global.req('classes/Server.class.js'))(() => {
    socketEventHandlers = require('./socketEventHandlers')(SmartNodeServer); // eslint-disable-line global-require
    SmartNodeServer
        .init(cliOptions, ServerClientConnector, socketEventHandlers)
        .catch((e) => { global.error('Server init error', e); });
});

// ////////////////////////////////////////////////////////

// eslint-disable-next-line global-require
if (process.title === 'npm' && require('os').type().includes('Windows')) {
    global.warn('If you want to see the fontend, you\'ll need to run "npm run watch-scss" as well to compile CSS!');
    global.log('');
}

// ////////////////////////////////////////////////////////

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

    SmartNodeServer.close(process.exit);
}

// do something when app is closing
process.on('exit', exitHandler);
process.on('SIGINT', exitHandler);
process.on('uncaughtException', exitHandler);
