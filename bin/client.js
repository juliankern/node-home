// ////////////////////////////////////////////////////////
// System checks

if (+process.version.replace('v', '').split('.')[0] < 8) {
    // eslint-disable-next-line no-console
    throw console.error('\n\x1B[1;31mYou need to upgrade to NodeJS 8 to run this application!\x1B[0m');
}

// //////////////////////////////////////////////////////

require('../util/global.js');

const Logger = global.req('classes/Log.class');
const logger = new Logger();

console.log(''); // eslint-disable-line no-console

const pkg = global.req('package.json');
const cli = require('cli');

cli.enable('version');
cli.setApp('bin/client.js', pkg.version);
const options = cli.parse({
    plugin: ['p', 'The plugin which should be used', 'string', false],
    server: ['s', 'Server to connect to including port - if empty, bonjour will be used', 'string', false],
});

if (!options.plugin) {
    logger.error('You need to provide a plugin name!');
    process.exit(1);
}

// ////////////////////////////////////////////////////////

const SmartNodeClient = global.req('classes/Client.class');
const client = new SmartNodeClient(options, () => {
    client.init()
        .catch((e) => { logger.error('Client init error', e); });
});

// ///////////////////////////////////////////////////////

/**
 * exit handler for cleanup and stuff
 *
 * @author Julian Kern <mail@juliankern.com>
 *
 * @param  {object} err Holding the error messages
 */
function exitHandler(err) {
    logger.info('SmartNode client exiting...');

    if (err) {
        logger.error('System error!', err);
    }

    client.close(process.exit);
}

// do something when app is closing
process.on('exit', exitHandler);
process.on('SIGINT', exitHandler);
process.on('uncaughtException', exitHandler);
