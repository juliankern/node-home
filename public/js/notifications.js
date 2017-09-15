const socket = window.io();

socket.on('debug', (data) => {
    console.log('Debug message received:', data);
});

socket.on('broadcast', (data) => {
    console.log('broadcast received:', data);
});
