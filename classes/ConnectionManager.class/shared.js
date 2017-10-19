module.exports = {
    events: [
        'connection',
        'handshake',
        'ready',
    ],
    ucfirst: str => str.charAt(0).toUpperCase() + str.slice(1),
};
