/* eslint-disable no-unused-vars */
function $(s) {
    return document.querySelector(s);
}

function $$(s) {
    return document.querySelectorAll(s);
}
/* eslint-enable no-unused-vars */

document.addEventListener('DOMContentLoaded', () => {
    $$('[data-confirm]').forEach((element) => {
        const confirmtext = element.dataset.confirm;

        if (confirmtext) {
            element.addEventListener('click', (e) => {
                // eslint-disable-next-line no-alert
                if (!confirm(confirmtext)) {
                    e.preventDefault();
                }
            });
        }
    });
});
