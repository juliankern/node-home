module.exports = {
    getValueByPath,
    setValueByPath,
    deleteByPath,
    findPort,
    object2pathlist,
    getObjectPaths
}

function getValueByPath(obj, path) {
    for (var i = 0, path = path.split('.'); i < path.length; i++) {
        if (!obj) break;
        obj = obj[path[i]];
    }

    return obj;
}

function setValueByPath(obj, path, value) {
    for (var i = 0, path = path.split('.'), curr = obj; i < path.length; i++) {
        if (!curr) break;
        if (!curr[path[i]]) curr[path[i]] = {};
        if (i === path.length - 1) { curr[path[i]] = value; break; }
        curr = curr[path[i]];
    }   

    return obj;
}

function deleteByPath(obj, path) {
    for (var i = 0, path = path.split('.'), curr = obj; i < path.length; i++) {
        if (!curr) break;
        if (i === path.length - 1) { delete curr[path[i]]; break; }
        curr = curr[path[i]];
    }   

    return obj;
}

async function findPort(start) {
    var port = start || 8000;

    function find(cb) {
        port++;

        var server = require('http').createServer();
        try {
            server.listen(port, (err) => {
                server.once('close', () => {
                    cb(port);
                });
                server.close();
            });
            server.on('error', (err) => {
                find(cb);
            });
        } catch (e) {
            find(cb);
        }
    }

    return new Promise((resolve, reject) => {
        find((port) => {
            resolve(port);
        })
    });
}

function object2pathlist(data, every) {
    var pathlist = {};

    getKeysForVar(pathlist, null, data)

    return pathlist;
    
    function getKeysForVar(pathlist, currentKey, data) {
        for (var key in data) {
            if (data[key] === Object(data[key])) {
                if (every) {
                    pathlist[(currentKey ? currentKey + '.' : '') + key] = data[key];
                }
                
                getKeysForVar(pathlist, (currentKey ? currentKey + '.' : '') + key, data[key])
            } else {
                pathlist[(currentKey ? currentKey + '.' : '') + key] = data[key];
            }
        }

        return pathlist;
    }
}

function getObjectPaths(obj, every) {
    return Object.keys(object2pathlist(obj, every));
}