#!/usr/bin/env node

settings = {
    signoff: {
        url: 'calvin.signoff.portalsapp',
        themeId: 3621901988,
        widgetId: 1846278371,
        domainSettings: '',
        username: 'calvinzheng@exosite.com',
        password: 'm03ru/3'
    },
    production: {
        url: 'basco-dev.exosite.com',
        theme: '',
        widget: '',
        domainSettings: ''
    }
};

// 3rd party
var Q = require('q'),
    debug = require('debug')('main');

var fs = require('fs'),
    os = require('os'),
    path = require('path');

Q.longStackSupport = true;

var uploader = require('./widget-uploader.js');

// constants
var COOKIE_PATH = os.tmpdir() + path.sep + '.wiget-uploader-cookie';

debug('cookie: ' + COOKIE_PATH);

// process host, widgetId and files

var task = {};

task.host = settings.signoff.url;
task.widgetId = settings.signoff.widgetId;
task.themeId = settings.signoff.themeId;
task.production = {};
task.production.url = settings.production.url;
// normalize file paths
var filePath = path.join(process.cwd(), './savetest.json');
task.files = path.normalize(filePath);

// session control
task.auth = {};
task.auth.username = settings.signoff.username;
task.auth.password = settings.signoff.password;

// var yaml = require('js-yaml')

// var config = loadConfig(WIDGET_CONFIG_NAME)

// var signoff = config.build.signoff
// var production = config.build.production

function downloadDomainConfig() {
    return uploader.downloadDomainConfig(task);
}

function uploadDomainConfig(file) {
    console.log('file ', file);

    task.file = file.contain;
    return uploader.uploadDomainConfig(task);
}

function readFile(task) {
    var deferred = Q.defer();

    var fsReadFile = Q.denodeify(fs.readFile);

    // debug(task);
    // @todo concat all files
    var allLoading = fsReadFile(task.file, 'utf8');

    Q.all(allLoading).then(function (fileContents) {
        task.widgetContent = fileContents.join('');
        debug('file length: ' + task.widgetContent.length);
        deferred.resolve(task);
    })

    // fsReadFile(task.files[0], 'utf - 8 ').then(function(fileContent) {
    //     task.widgetContent = fileContent;
    //     deferred.resolve(task);
    // })

    .fail(function (err) {
        deferred.reject('Failed to read file');
    });

    return deferred.promise;
}

// current goal is to save session (the jar)

function endTask(task) {
    return Q.all([saveCookie(task.cookie)]).then(task);
}

function loadCookie(cookiePath) {
    return Q.nfcall(fs.readFile, COOKIE_PATH, 'utf8').then(JSON.parse);
}

function saveCookie(cookie, cookiePath) {
    return Q.nfcall(fs.writeFile, COOKIE_PATH, JSON.stringify(cookie), 'utf8');
}

function loadConfig(filename) {
    var config = {}
    var file = WIDGET_INIT_CWD + '/' + filename

    if (fs.existsSync(file + '.json')) {
        config = JSON.parse(fs.readFileSync(file + '.json'))
    } else if (fs.existsSync(file + '.yml')) {
        config = yaml.safeLoad(fs.readFileSync(file + '.yml'))
    } else {
        throw 'Missing ' + WIDGET_CONFIG_NAME + ' file.'
    }

    if (!config.name) throw 'Missing name in config'
    if (!config.build) throw 'Missing build in config'
    if (!config.script) throw 'Missing script in config'

    config.template = config.template || []

    config.style = (config.style || []).map(function (path) {
        return WIDGET_INIT_CWD + '/' + path
    })

    config.script = config.script.map(function (path) {
        return WIDGET_INIT_CWD + '/' + path
    }).concat('!gulpfile.js')

    config.auth = config.auth || {
        username: process.env.EXO_W_USER,
        password: process.env.EXO_W_PASS
    }

    return config
}

exports.downloadDomainConfig = downloadDomainConfig;
exports.uploadDomainConfig = uploadDomainConfig;