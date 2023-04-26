// import * as fs from 'node:fs/promises';

// export function readFile(filename: string): Promise<string> {
//     let readFilePromise: Promise<string>;
//     if (filename.startsWith("http://") || filename.startsWith("https://")) {
//         readFilePromise = fetchGETPromise(filename)
//     } else if (filename.startsWith("file://")) {
//         readFilePromise = fs.readFile(filename.replace("file://", "")).then(buffer => buffer.toString())
//     } else {
//         readFilePromise = fs.readFile(filename).then(buffer => buffer.toString())
//     }
//     return readFilePromise;
// }

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

// export function fetchPromise(url: string, header = new Map(), method = "GET", query = "", numTry = 0): Promise<any> {
//     let myHeaders = new Headers();
//     myHeaders.set('pragma', 'no-cache');
//     myHeaders.set('cache-control', 'no-cache');
//     header.forEach((value, key) => {
//         myHeaders.set(key, value);
//     });
//     let myInit: RequestInit = {
//         method: method,
//         // headers: myHeaders,
//         redirect: 'follow',
//     };
//     if (method.localeCompare("POST") == 0) {
//         myInit.body = query;
//     }
    
//         return fetch(url, myInit)
//             .then(response => {
//                 if (response.ok) {
//                     return response.blob().then(blob => blob.text())
//                 } else {
//                     throw response;
//                 }
//             }).catch(error => {
//                     console.error(error.type, error.message)
//             }).finally(() => {
//                 return;
//             });
// }

// export function fetchGETPromise(url, header = new Map()): Promise<any> {
//     return fetchPromise(url, header);
// }

// export function fetchPOSTPromise(url, query = "", header = new Map()): Promise<any> {
//     return fetchPromise(url, header, "POST", query);
// }