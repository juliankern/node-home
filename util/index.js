const randomstring = require('randomstring');

module.exports = {
    arraysEqual,
    getValueByPath,
    setValueByPath,
    deleteByPath,
    findPort,
    findClientId,
    object2pathlist,
    getObjectPaths,
    randomInt,
};

function findClientId(clients) {
    let id;
    const cond = true;

    while (cond) {
        id = randomstring.generate({ length: 12, readable: true });
        /* istanbul ignore else */
        if (!clients || !clients[id]) { break; }
    }

    return id;
}

function randomInt(min, max) {
    return Math.floor(Math.random() * ((max - min) + 1)) + min;
}

// eslint-disable-next-line no-unused-vars
function getValueByPath(obj, path) {
    const pathArray = path.split('.');

    /* eslint-disable no-param-reassign */
    for (let i = 0; i < pathArray.length; i++) {
        if (!obj) break;
        obj = obj[pathArray[i]];
    }
    /* eslint-enable no-param-reassign */

    return obj;
}

function setValueByPath(obj, path, value) {
    const pathArray = path.split('.');

    let arrayMatch;
    let currPath;

    for (let i = 0, curr = obj; i < pathArray.length; i++) {
        currPath = pathArray[i];
        if (!curr) break;

        /* eslint-disable no-cond-assign */
        // if the path is supposed to set an array via [n]
        if (arrayMatch = pathArray[i].match(/\[(\d)+\]/)) {
            /* eslint-enable no-cond-assign */
            currPath = pathArray[i].replace(/\[(\d)+\]/, '');
            if (!curr[currPath]) curr[currPath] = [];
            curr[currPath][arrayMatch[1]] = value;
        } else {
            if (!curr[pathArray[i]]) curr[pathArray[i]] = {};
            if (i === pathArray.length - 1) { curr[pathArray[i]] = value; break; }
            curr = curr[pathArray[i]];
        }
    }

    return obj;
}

// eslint-disable-next-line no-unused-vars
function deleteByPath(obj, path) {
    const pathArray = path.split('.');

    for (let i = 0, curr = obj; i < pathArray.length; i++) {
        if (!curr) break;
        if (i === pathArray.length - 1) { delete curr[pathArray[i]]; break; }
        curr = curr[pathArray[i]];
    }

    return obj;
}

async function findPort(start) {
    let port = start || 8000;

    return new Promise((resolve) => {
        // eslint-disable-next-line no-shadow
        find((port) => {
            resolve(port);
        });
    });

    function find(cb) {
        port++;

        // eslint-disable-next-line global-require
        const server = require('http').createServer();
        try {
            server.listen(port, () => {
                server.once('close', () => {
                    cb(port);
                });
                server.close();
            });
            /* istanbul ignore next */
            server.on('error', () => {
                /* istanbul ignore next */
                find(cb);
            });
        } catch (e) {
            /* istanbul ignore next */
            find(cb);
        }
    }
}

function object2pathlist(data, every) {
    const pathlist = {};

    getKeysForVar(pathlist, null, data);

    return pathlist;

    // eslint-disable-next-line no-shadow
    function getKeysForVar(pathlist, currentKey, data) {
        // eslint-disable-next-line no-restricted-syntax
        for (const key in data) {
            if (data[key] === Object(data[key])) {
                if (every) {
                    // eslint-disable-next-line no-param-reassign
                    pathlist[(currentKey ? `${currentKey}.` : '') + key] = data[key];
                }

                getKeysForVar(pathlist, (currentKey ? `${currentKey}.` : '') + key, data[key]);
            } else {
                // eslint-disable-next-line no-param-reassign
                pathlist[(currentKey ? `${currentKey}.` : '') + key] = data[key];
            }
        }

        return pathlist;
    }
}

function getObjectPaths(obj, every) {
    return Object.keys(object2pathlist(obj, every));
}

function arraysEqual(arr1, arr2) {
    if (arr1.length !== arr2.length) return false;

    for (let i = arr1.length; i--;) {
        if (arr1[i] !== arr2[i]) return false;
    }

    return true;
}
