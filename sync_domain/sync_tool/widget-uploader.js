'use strict';

// core
var util = require('util'),
    path = require('path');

// 3rd party
var Q = require('q'),
    extend = require('extend'),
    request = require('request'),
    debug = require('debug')('widget-uploader');

var _opt = {
    strictSSL: false,
    followRedirect: false
};

/**
 *  upload file based on the task body
 *
 */

function uploadWidget(task) {
    debug('uploadWidget');
    debug(task.widgetContent);

    var body = {
        code: task.widgetContent
    };
    // debug(body);

    var url = 'https://' + task.host + '/api/portals/v1/widget-scripts/' + task.widgetId;

    extend(task, {
        json: body,
        jar: request.jar(),
        followRedirect: false
    });

    return uploader('put', url, task);
}

function downloadTheme(task) {
    debug('downloadTheme');

    var url = 'https://' + task.host + '/api/portals/v1/themes/' + task.themeId;

    extend(task, _opt);

    return uploader('get', url, task);
}

function uploadTheme(task) {
    debug('uploadTheme');
    debug(task.widgetContent);

    var url = 'https://' + task.host + '/api/portals/v1/themes/' + task.themeId;

    var opt = extend({
        json: body,
        jar: request.jar()
    }, _opt);

    opt.followRedirect = false;

    return uploader('put', url, opt);
}

function downloadDomainConfig(task) {
    debug('downloadDomainConfig');

    var url = 'https://' + task.host + '/api/portals/v1/domains/_this';

    extend(task, _opt);

    return uploader('put', url, task);
}

function uploadDomainConfig(task) {
    debug('uploadDomainConfig');
    debug(task.file);

    var url = 'https://' + task.host + '/api/portals/v1/domains/_this';
    var body = task.file;

    extend(task, {
        body: body,
        "content-type": "application/json",
        followRedirect: false
    }, _opt);

    return uploader('put', url, task);
}

function uploader(reqType, url, task) {
    console.log('upload');

    var deferred = Q.defer();
    var options = extend({
        method: reqType,
        url: url,
        jar: request.jar()
    }, task);

    if (task.auth && task.auth.username && task.auth.password) {
        options.auth = task.auth;
    }

    request(options, function (err, response, body) {
        debug(response);
        debug(body);

        if (err) {
            console.log('deferred ', err);
            debug(err);
            deferred.reject(err);
            return;
        }

        debug('status: ' + response.headers.status);

        if (response.statusCode == 200 && body) {
            task.contains = body;
            deferred.resolve(task);
            debug(reqType + 'success');
            return;
        }

        deferred.reject(reqType + ' failed');
    });

    return deferred.promise;
}

exports.uploadWidget = function (task) {
    return uploadWidget(task);
};

exports.downloadTheme = function (task) {
    return downloadTheme(task);
};

exports.uploadTheme = function (task) {
    return uploadTheme(task);
};

exports.downloadDomainConfig = function (task) {
    return downloadDomainConfig(task);
};

exports.uploadDomainConfig = function (task) {
    return uploadDomainConfig(task);
};