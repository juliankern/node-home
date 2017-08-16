require('../util/global.js');

const pkg = global.req('package.json');

const cli = require('cli');
cli.enable('version');
cli.setApp(pkg.name, pkg.version);
const options = cli.parse({ config: [ 'c', 'A config file to use', 'file', false ] });

if (!options.config) {
    global.error('You need to provide a valid config file!');
    process.exit(1);
}

const config = global.req(options.config);

//////////////////////////////////////////////////////////

const SmartNodeClient = global.req('classes/SmartNodeClient.class');
const client = new SmartNodeClient(config);

//////////////////////////////////////////////////////////

client.init().catch((e) => { global.error('Client init error', e) });
