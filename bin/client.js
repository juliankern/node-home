// ////////////////////////////////////////////////////////
// System checks

if (+process.version.replace('v', '').split('.')[0] < 8) {
    // eslint-disable-next-line no-console
    throw console.error('\n\x1B[1;31mYou need to upgrade to NodeJS 8 to run this application!\x1B[0m');
}

// //////////////////////////////////////////////////////

require('../util/global.js');

const pkg = global.SmartNode.require('package.json');

const Logger = global.SmartNode.require('classes/Log.class');
const masterlogger = new Logger();

console.log(''); // eslint-disable-line no-console

const cli = require('cli');
const cluster = require('cluster');

cli.enable('version');
cli.setApp('bin/client.js', pkg.version);

const options = cli.parse({
    plugin: ['p', 'The plugin which should be used', 'string', false],
    server: ['s', 'Server to connect to including port - if empty, bonjour will be used', 'string', false],
    obonjour: [false, 'Disable bonjour to let clients connect by the server address', 'bool', false],
    disableRestart: [false, 'Disable auto-restart of server if it crashes', 'bool', false],
    restartDelay: [false, 'How long the restart should be delayed after exit', 'int', 1000],
    maxRestarts: [false, 'Maximum number of automatic restarts before it should stop - set to -1 to disable', 'int', 5],
});

if (!options.plugin) {
    masterlogger.error('You need to provide a plugin name!');
    process.exit(1);
}

// ////////////////////////////////////////////////////////

if (cluster.isMaster) {
    let restartCount = 0;
    let forcedRestart = false;
    let forcedExit = false;

    // ////////////////////////////////////////////////////////
    masterlogger.info(`Master client process is running with ID ${process.pid}`);

    let child = cluster.fork();

    cluster.on('exit', (worker) => {
        if (forcedExit) return;

        if (forcedRestart) {
            child = restartChild();
            forcedRestart = false;
            restartCount = 0;
        } else {
            masterlogger.warn(`Child with ID ${worker.process.pid} exited`);

            if (!options.disableRestart &&
                (
                    options.maxRestarts === -1 ||
                    options.maxRestarts > restartCount
                )
            ) {
                setTimeout(() => {
                    child = restartChild();
                }, options.restartDelay);

                restartCount++;
            } else {
                masterlogger.warn('Maximum numbers of automatic restarts reached. Exiting.');
                process.exit(1);
            }
        }
    });

    process.stdin.resume();
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (data) => {
        if ((`${data}`).trim().toLowerCase() === 'rs') {
            masterlogger.info('Restarting server process NOW!');
            child.send('close');
            forcedRestart = true;
        }
    });

    process.on('SIGINT', () => {
        masterlogger.warn('SIGINT caught!!');
        child.send('close');
        forcedExit = true;
    });
} else {
    const logger = new Logger('child');

    logger.info(`Child process started with ID ${process.pid}`);

    const SmartNodeClient = global.SmartNode.require('classes/Client.class');
    const client = new SmartNodeClient(options, () => {
        client.init()
            .catch((e) => { logger.error('Client init error', e); });
    });

    // do something when app is closing
    process.on('message', (msg) => {
        if (msg === 'close') {
            exitHandler.call([client, logger]);
        }
    });
    process.on('exit', exitHandler.bind([client, logger]));
    process.on('SIGINT', exitHandler.bind([client, logger]));
    process.on('uncaughtException', exitHandler.bind([client, logger]));
}

// ///////////////////////////////////////////////////////

function restartChild() {
    return cluster.fork();
}

/**
 * exit handler for cleanup and stuff
 *
 * @author Julian Kern <mail@juliankern.com>
 *
 * @param  {object} err Holding the error messages
 */
function exitHandler(err) {
    const [client, logger] = this;
    logger.info('SmartNode client exiting...');

    if (err) {
        logger.error('System error!', err);
    }

    client.close(process.exit);
}
