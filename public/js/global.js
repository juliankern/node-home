/* eslint-disable no-unused-vars */
function $(s) {
    return document.querySelector(s);
}

function $$(s) {
    return document.querySelectorAll(s);
}
/* eslint-enable no-unused-vars */

document.addEventListener('DOMContentLoaded', function() { 
    $$('[data-confirm]').forEach(function(element) {
        var confirmtext = element.dataset.confirm;
        
        if (confirmtext) {
            element.addEventListener('click', function(e) {
                if (!confirm(confirmtext)) {
                    e.preventDefault();
                } 
            });
        }
    });
});