'use strict';
// core
var util = require('util'),
    path = require('path');
var i = 0;

// 3rd party
var Q = require('q'),
    extend = require('extend'),
    request = require('request'),
    debug = require('debug')('widget-html'),
    console = require('better-console'),
    CLI = require('clui'),
    Spinner = CLI.Spinner;
var spinner = new Spinner('requesting');

function domainAlive(domainUrl) {
    var options = {
        url: 'https://' + domainUrl,
        method: 'get',
        strictSSL: false
    };

    return Q.Promise(function(resolve, reject, notify) {
        request(options, function(err, response, body) {
            if (err) {
                if (err.code === 'ENOTFOUND') {
                    console.error('Can\'t connect the [' + err.hostname + '] domain.');
                } else {
                    console.error(err);
                }
                reject();
            } else if (body === '403 Forbidden') {
                console.error('Server respond: ' + body);
                reject();
            } else {
                resolve();
            }
        });
    });
}

function createWidget(task) {
    debug('createWidget');
    debug(task.widgetName);
    // debug(body);

    var url = 'https://' + task[task.current].domain + '/api/portals/v1/widget-scripts/';
    var opt = {
        url: url,
        json: {
            name: task.widgetName,
            description: task.widgetDescription,
            code: task.code
        },
        method: 'post'
    };

    return html(opt, task);
}

function updateWidget(task) {
    debug('uploadDomainWidget');
    debug(task.code);
    // debug(body);

    var url = 'https://' + task[task.current].domain + '/api/portals/v1/widget-scripts/' + task.widgetId;
    var opt = {
        json: {
            code: task.code
        },
        url: url,
        method: 'put'
    };

    return html(opt, task);
}

function downloadWidgets(task) {
    var url = 'https://' + task[task.current].domain + '/api/portals/v1/widget-scripts/';
    var opt = {
        url: url,
        method: 'get'
    };

    return html(opt, task);
}

function createTheme(task) {
    debug('createTheme');
    var url = 'https://' + task[task.current].domain + '/api/portals/v1/themes/';

    var opt = {
        url: url,
        json: {
            name: task.fileContent.name,
            description: task.fileContent.description
        },
        method: 'post'
    };

    return html(opt, task);
}

function downloadTheme(task) {
    debug('downloadTheme');
    // If task.themeId is null, would download all themes.
    var url = 'https://' + task[task.current].domain + '/api/portals/v1/themes/' + task.themeId;
    var opt = {
        url: url,
        method: 'get'
    };

    return html(opt, task);
}

function uploadTheme(task) {
    debug('uploadTheme');

    var url = 'https://' + task[task.current].domain + '/api/portals/v1/themes/' + task.themeId;
    var opt = {
        url: url,
        json: task.fileContent,
        method: 'put'
    };

    return html(opt, task);
}


function downloadDomainConfig(task) {
    debug('downloadDomainConfig');

    var url = 'https://' + task[task.current].domain + '/api/portals/v1/domains/_this';
    var opt = {
        url: url,
        method: 'put'
    };

    return html(opt, task);
}

function uploadDomainConfig(task) {
    debug('uploadDomainConfig');
    debug(task.file);

    var url = 'https://' + task[task.current].domain + '/api/portals/v1/domains/_this';
    var opt = {
        url: url,
        json: task.fileContent,
        method: 'put'
    };

    return html(opt, task).fail(function() {
        console.error('You need globe permission.');
    });
}

// Not by API, use portal interface, cookie
function getThemeList(task) {
    var url = 'https://' + task[task.current].domain + '/admin/theme';
    var opt = {
        url: url,
        method: 'get'
    };

    return htmlCookie(opt, task);
}

// Not by API, use portal interface, cookie
function getTheme(task) {
    var url = 'https://' + task[task.current].domain + '/admin/theme';
    var opt = {
        url: url,
        form: task.form,
        method: 'post'
    };

    return htmlCookie(opt, task);
}

// Not API, this is use portal interface and cookies.
function updateTheme(task) {
    var url = 'https://' + task[task.current].domain + '/admin/theme';
    var opt = {
        url: url,
        formData: task.form,
        method: 'post'
    };

    return htmlCookie(opt, task);
}

// Not API, this is use portal interface and cookies.
function getClientModelPage(task) {
    var url = 'https://' + task[task.current].domain + '/admin/managemodels';
    var opt = {
        url: url,
        method: 'get'
    };

    return htmlCookie(opt, task);
}

function createClientModel(task) {
    var url = 'https://' + task[task.current].domain + '/admin/managemodels';
    var opt = {
        url: url,
        formData: task.form,
        method: 'post'
    };

    return htmlCookie(opt, task);
}

function getClientModelList(task) {
    var url = 'https://' + task[task.current].domain + '/api/portals/v1/client-models/';
    var opt = {
        url: url,
        method: 'get'
    };

    return html(opt, task);
}

function updateClientModel(task) {
    delete task.request.domainID;
    delete task.request.vendor;
    var url = 'https://' + task[task.current].domain + '/api/portals/v1/client-models/' + task[task.current].domain.split('.')[0] + '/' + task.request.id.split('/')[1];
    var opt = {
        url: url,
        json: task.request,
        method: 'put'
    };

    return html(opt, task);
}

function checkSession(task) {
    var deferred = Q.defer();
    var signinPage = 'https://' + task[task.current].domain + '/login';
    var signinRequest = 'https://' + task[task.current].domain + '/process';
    var login_opt = {
        headers: {
            'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/35.0.1916.114 Safari/537.36'
        },
        strictSSL: false
    };

    // setup request option
    var opt = extend({}, login_opt);
    opt.followRedirect = false;
    opt.jar = request.jar();

    if (task.cookie && task.cookie[task[task.current].domain]) {
        debug(task.cookie[task[task.current].domain]);
        opt.jar.setCookie(task.cookie[task[task.current].domain], 'http://' + task[task.current].domain);
    }

    request.get(signinPage, opt, function(err, response, body) {
        if (err) {
            deferred.reject(err);
            return;
        }

        // redirect to home
        if (response.statusCode == 303 && body.trim() == 'https://' + task[task.current].domain + '/manage/home') {
            deferred.resolve(task);

            return;
        }

        // at production domain it have a empty space: "value="accountlogin" \/>", but at signoff it doesn't: "value="accountlogin"\/>"
        // so format like "value="accountlogin"\s*\/>""
        var matches = body.match(/<input type="hidden" name="formname" value="accountlogin"\s*\/><input type="hidden" name="postid" value="([a-z0-9]+)"\s*\/>/);

        if (!matches) {
            debug('post id not found');
            console.error('signin page unavailable');
            deferred.reject('signin page unavailable');
            return;
        }

        // debug(matches[1]);
        var form = {
            formname: 'accountlogin',
            postid: matches[1],
            'form[user]': task[task.current].auth.username,
            'form[pass]': task[task.current].auth.password
        };

        opt.headers.Origin = 'https://' + task[task.current].domain;
        opt.headers.Refer = 'https://' + task[task.current].domain + '/login';

        request.post(signinRequest, opt, function(err, response, body) {
            debug('form post result:' + response.statusCode);

            body = body.trim();

            if (err) {
                deferred.reject(err);
                return;
            }

            // success
            if (response.statusCode == 303) {
                // task.jar = opt.jar;
                task.cookie = (task.cookie || {});
                task.cookie[task[task.current].domain] = opt.jar.getCookieString('https://' + task[task.current].domain);

                deferred.resolve(task);
                return;
            }

            deferred.reject('sign in failed (' + response.statusCode + ')');

        }).form(form);
    });

    return deferred.promise;
}

function html(opt, task) {
    debug('upload');

    spinner.start();

    var deferred = Q.defer();
    var options = extend({
        auth: task[task.current].auth,
        strictSSL: false,
        followRedirect: false
    }, opt);

    request(options, function(err, response, body) {
        debug(response);
        debug(body);

        spinner.stop();

        if (err) {
            console.error('deferred ', err);
            debug(err);
            deferred.reject(err);
            return;
        }

        if ((response.statusCode == 200 || response.statusCode == 201) && (body || opt.method === 'put')) {
            task.contain = body;
            deferred.resolve(task);
            debug(opt.method + 'success');
            return;
        } else if (response.statusCode == 303) {
            console.error('Invalid Email or Password.');
        }

        console.error('Server respond: ', body);
        deferred.reject(opt.method + ' failed');
    });

    return deferred.promise;
}

// use cookie as auth
function htmlCookie(opt, task) {
    debug('upload');

    spinner.start();

    var _opt = {
        headers: {
            'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/35.0.1916.114 Safari/537.36'
        },
        strictSSL: false
    };
    var deferred = Q.defer();
    var options = extend({
        jar: request.jar()
    }, _opt, opt);

    options.jar.setCookie(task.cookie[task[task.current].domain], 'http://' + task[task.current].domain);

    request(options, function(err, response, body) {
        debug(response);
        debug(body);

        spinner.stop();

        if (err) {
            console.error('err, body ', err, body);
            debug(err);
            deferred.reject(err);
            return;
        }

        debug('status: ' + response.headers.status);

        if ((response.statusCode == 200 || response.statusCode == 201) && (body || opt.method === 'put')) {
            task.contain = body;
            deferred.resolve(task);
            debug(opt.method + 'success');
            return;
        } else if (response.statusCode == 100 || response.statusCode == 500) {
            console.error('You need globe permission.');
        }

        console.error('Server respond: ', body);
        deferred.reject(opt.method + ' failed');
    });

    return deferred.promise;
}

exports.checkSession = checkSession;
exports.domainAlive = domainAlive;

exports.createTheme = createTheme;
exports.downloadTheme = downloadTheme;
exports.getTheme = getTheme;
exports.getThemeList = getThemeList;
exports.updateTheme = updateTheme;
exports.uploadTheme = uploadTheme;

exports.downloadDomainConfig = downloadDomainConfig;
exports.uploadDomainConfig = uploadDomainConfig;

exports.createWidget = createWidget;
exports.downloadWidgets = downloadWidgets;
exports.updateWidget = updateWidget;

exports.createClientModel = createClientModel;
exports.getClientModelList = getClientModelList;
exports.getClientModelPage = getClientModelPage;
exports.updateClientModel = updateClientModel;