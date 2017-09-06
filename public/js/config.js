document.addEventListener('DOMContentLoaded', function() { 
    var roomDropdown = $('select[name="room"]');

    checkRoomDropdown();

    roomDropdown.addEventListener('change', function() {
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