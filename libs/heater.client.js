module.exports = {
    load,
    unload
};

function load(socket) {
    socket.emit('libloaded');
}

function unload(socket) {
    socket.emit('libunloaded');
}