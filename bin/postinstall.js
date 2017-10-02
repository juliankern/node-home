#!/usr/bin/env node

const pkg = require('../package.json');
const fs = require('fs');
const path = require('path');

let config = {};

config.installed = 'local';
config.datapath = 'storage';

if (!!process.env.npm_config_global) {
    config.installed = 'global';
    config.datapath = process.env.APPDATA ?  process.env.APPDATA + '/SmartNode' : (process.platform == 'darwin' ? process.env.HOME + '/Library/Application Support/SmartNode' : process.env.HOME + '/.SmartNode')
}

config.datapath = path.normalize(config.datapath);

Object.assign(pkg, { config }, { _comment: "Created by SmartNode postinstall script. See package-original.json." });

let data = {};
Object.keys(pkg).sort().forEach(function(key) {
    data[key] = pkg[key];
});

fs.copyFile(path.normalize(__dirname + '/../package.json'), path.normalize(__dirname + '/../package-original.json'), (err) => {
    if (err) throw err;
    console.log('package.json copied.');
});

fs.writeFile(path.normalize(__dirname + '/../package.json'), JSON.stringify(data, null, '  '), 'utf8', (err) => {
    if (err) throw err;
    console.log('New package.json created.');
});