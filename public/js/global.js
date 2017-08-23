function $(s) {
    return document.querySelector(s);
}

function $$(s) {
    return document.querySelectorAll(s);
}

document.addEventListener("DOMContentLoaded", function(event) { 
    $$('[data-confirm]').forEach(function(element) {
        var confirmtext = element.dataset.confirm;
        
        if (confirmtext) {
            element.addEventListener('click', function(e) {
                if (!confirm(confirmtext)) {
                    e.preventDefault();
                } 
            });
        }
    })
})