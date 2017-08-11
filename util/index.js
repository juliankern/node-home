module.exports = {
    getValueByPath: (obj, path) => {
        for (var i = 0, path = path.split('.'); i < path.length; i++) {
            if (!obj) break;
            obj = obj[path[i]];
        }

        return obj;
    },
    findPort: async (start) => {
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
    },
    object2pathlist: (data) => {
        var pathlist = {};

        getKeysForVar(pathlist, null, data)

        return pathlist;
        
        function getKeysForVar(pathlist, currentKey, data) {
            for (var key in data) {
                if (data[key] === Object(data[key])) {
                    getKeysForVar(pathlist, (currentKey ? currentKey + '.' : '') + key, data[key])
                } else {
                    pathlist[(currentKey ? currentKey + '.' : '') + key] = data[key];
                }
            }

            return pathlist;
        }
    }
}