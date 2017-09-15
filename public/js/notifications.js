const socket = window.io();

socket.on('debug', (data) => {
    console.log('Debug message received:', data);
});
