
export function xhrGetPromise(url): Promise<string> {
    return new Promise(function (resolve, reject) {
        let xhr = new XMLHttpRequest();
        xhr.open('GET', url);
        xhr.onload = function () {
            if (xhr.status >= 200 && xhr.status < 300) {
                resolve(xhr.responseText);
            } else {
                reject({
                    url: decodeURIComponent(url),
                    encodedUrl: url,
                    response: xhr.responseText,
                    status: xhr.status,
                    statusText: xhr.statusText
                });
            }
        };
        xhr.onerror = function () {
            reject({
                url: decodeURIComponent(url),
                encodedUrl: url,
                response: xhr.responseText,
                status: xhr.status,
                statusText: xhr.statusText
            });
        };
        xhr.send();
    });
}
