'use strict';

// core
var util = require('util'),
    path = require('path');

// 3rd party
var Q = require('q'),
    extend = require('extend'),
    request = require('request'),
    debug = require('debug')('widget-html'),
    console = require('better-console');

var _opt = {
    strictSSL: false,
    followRedirect: false
};

function uploadWidget(task) {
    debug('uploadWidget');
    debug(task.fileContent);

    var body = {
        code: task.fileContent
    };
    // debug(body);

    var url = 'https://' + task[task.current].domain + '/api/portals/v1/widget-scripts/' + task.widgetId;

    extend(task, {
        json: body,
        followRedirect: false
    });

    return html('put', url, task);
}

function createTheme(task) {
    debug('createTheme');
    var url = 'https://' + task.toDomain + '/api/portals/v1/themes/';

    extend(task, {
        json: task.fileContent,
    }, _opt);

    return html('post', url, task);
}

function downloadTheme(task) {
    debug('downloadTheme');
    // If task.themeId is null, would download all themes.
    var url = 'https://' + task[task.current].domain + '/api/portals/v1/themes/' + task.themeId;

    extend(task, _opt);

    return html('get', url, task);
}

function uploadTheme(task) {
    debug('uploadTheme');

    var url = 'https://' + task.toDomain + '/api/portals/v1/themes/' + task.themeId;

    extend(task, {
        json: task.fileContent,
    }, _opt);

    return html('put', url, task);
}


function downloadDomainConfig(task) {
    debug('downloadDomainConfig');

    var url = 'https://' + task.fromDomain + '/api/portals/v1/domains/_this';

    extend(task, _opt);

    return html('put', url, task);
}

function uploadDomainConfig(task) {
    debug('uploadDomainConfig');
    debug(task.file);

    var url = 'https://' + task.toDomain + '/api/portals/v1/domains/_this';

    extend(task, {
        json: task.fileContent
    }, _opt);

    return html('put', url, task);
}



function fetchTheme(task) {
    var url = 'https://' + task.fromDomain + '/admin/theme';

    return html('get', url, task);
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
        // debug(task.cookie[task[task.current].domain]);
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

        // need authentication
        var matches = body.match(/<input type="hidden" name="formname" value="accountlogin" \/><input type="hidden" name="postid" value="([a-z0-9]+)" \/>/);

        if (!matches) {
            debug('post id not found');
            deferred.reject('signin page unavailable');
            return;
        }

        // debug(matches[1]);
        var form = {
            formname: 'accountlogin',
            postid: matches[1],
            'form[user]': task.auth.username,
            'form[pass]': task.auth.password
        };

        opt.headers.Origin = 'https://' + task[task.current].domain;
        opt.headers.Refer = 'https://' + task[task.current].domain + '/login';
        request.post(signinRequest, opt, function(err, response, body) {

            debug('formpost result:' + response.statusCode);

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

function html(reqType, url, task) {
    debug('upload');

    var deferred = Q.defer();
    var options = extend({
        method: reqType,
        url: url,
        jar: request.jar(),
    }, task);

    if (task.auth && task.auth.username && task.auth.password) {
        options.auth = task.auth;
    }
    request(options, function(err, response, body) {
        debug(response);
        debug(body);

        if (err) {
            console.error('deferred ', err);
            debug(err);
            deferred.reject(err);
            return;
        }

        debug('status: ' + response.headers.status);

        if ((response.statusCode == 200 || response.statusCode == 201) && (body || reqType === 'put')) {
            task.contain = body;
            deferred.resolve(task);
            debug(reqType + 'success');
            return;
        } else if (response.statusCode == 500) {
            console.error('You need globe permission.');
        }

        deferred.reject(reqType + ' failed');
    });

    return deferred.promise;
}

exports.uploadWidget = function(task) {
    return uploadWidget(task);
};

exports.createTheme = createTheme;

exports.downloadTheme = downloadTheme;

exports.fetchTheme = fetchTheme;

exports.uploadTheme = uploadTheme;

exports.downloadDomainConfig = downloadDomainConfig;

exports.uploadDomainConfig = uploadDomainConfig;

exports.checkSession = checkSession;

