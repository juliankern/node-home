require('../util/global.js');

const pkg = global.req('package.json');
const cli = require('cli');

cli.enable('version');
cli.setApp(pkg.name, pkg.version);

const options = cli.parse({ plugin: ['p', 'The plugin which should be used', 'string', false] });

if (!options.plugin) {
    global.error('You need to provide a plugin name!');
    process.exit(1);
}

// ////////////////////////////////////////////////////////

const SmartNodeClient = global.req('classes/Client.class');
const client = new SmartNodeClient(options.plugin);

// ////////////////////////////////////////////////////////

client.init().catch((e) => { global.error('Client init error', e); });
