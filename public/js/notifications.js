(() => {
    const socket = window.io();

    socket.on('broadcast', (data) => {
        newNotification(data.notification);
    });

    const notificationlist = $('.notificationlist');

    const source = $('script#notification').innerHTML;
    const template = window.Handlebars.compile(source);

    function newNotification(data) {
        let autoHideTime;
        const element = htmlToElement(template(data));

        if (!('autoHide' in data)) {
            data.autoHide = 5 * 1000; // eslint-disable-line no-param-reassign
        }

        element.querySelector('[data-dismiss]').addEventListener('click', () => {
            hideNotification(element);
        });

        if (data.autoHide) {
            autoHideTime = 5 * 1000;

            if (data.autoHide === 10) {
                autoHideTime = 10 * 1000;
            } else if (data.autoHide === 20) {
                autoHideTime = 20 * 1000;
            }
        }

        const newElement = notificationlist.appendChild(element);
        setTimeout(() => {
            newElement.classList.remove('hidden');

            if (autoHideTime) {
                setTimeout(() => {
                    hideNotification(element);
                }, autoHideTime);
            }
        }, 100);
    }

    function hideNotification(element) {
        element.classList.add('hidden');
        element.addEventListener('transitionend', () => {
            element.remove();
        });
    }

    function htmlToElement(html) {
        const tpl = document.createElement('template');
        tpl.innerHTML = html;
        return tpl.content.firstChild;
    }
})();
