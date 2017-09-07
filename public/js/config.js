document.addEventListener('DOMContentLoaded', () => {
    const roomDropdown = $('select[name="room"]');

    checkRoomDropdown();

    roomDropdown.addEventListener('change', () => {
        checkRoomDropdown();
    });

    function checkRoomDropdown() {
        if (+roomDropdown.value === -1) {
            // new room selected
            $('.newroom').classList.remove('hidden');
        } else {
            $('.newroom').classList.add('hidden');
        }
    }
});
