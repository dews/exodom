// 3rd party
var Q = require('q'),
    debug = require('debug')('main'),
    request = require('request'),
    fs = require('fs-extra'),
    console = require('better-console'),
    cheerio = require('cheerio'),
    extend = require('extend');

var os = require('os'),
    path = require('path');

// constants
var COOKIE_PATH = os.tmpdir() + path.sep + '.wiget-uploader-cookie';
debug('cookie: ' + COOKIE_PATH);

var uploader = require('./uploader.js');

function downloadWidgets(task) {
    return uploader.downloadWidgets(task).then(function(task) {
        var widgets = JSON.parse(task.contain);
        var fsPath = path.join(task.origPath, 'domain_widgets.json');

        //about outputJsonSync https://github.com/jprichardson/node-fs-extra#outputfilefile-data-callback
        fs.outputJsonSync(fsPath, widgets);
        console.info('Download domain widgets successful');
        return task;
    });
}

function uploadWidgets(task) {
    return uploader.downloadWidgets(task).then(function(task) {
        var deferred = Q.defer();
        var fsPath = path.join(task.origPath, 'domain_widgets.json');
        var promise = [];
        var widgetsIdMap = {};
        var widgets = JSON.parse(task.contain);

        widgets.forEach(function(widget, i) {
            widgetsIdMap[widget.name] = widget.id;
        });

        fs.readJson(fsPath, function(err, widgets) {
            err && console.error('Read file fail');

            widgets.forEach(function(widget, i) {
                var taskClone = extend({}, task);
                if (!widgetsIdMap[widget.name]) {
                    console.info('Domain widget %s not exist, create a new widget', widget.name);
                    taskClone.widgetName = widget.name;
                    taskClone.widgetDescription = widget.description;
                    taskClone.code = widget.code;
                    promise.push(uploader.createWidget(taskClone));
                } else {
                    taskClone.widgetId = widgetsIdMap[widget.name];
                    taskClone.code = widget.code;
                    promise.push(uploader.updateWidget(taskClone));
                }
            });

            Q.all(promise).then(function(task) {
                console.info('Upload domain widgets successful');
                deferred.resolve(task);
            }, function() {
                console.info('Upload domain widgets failure');
                deferred.reject();
            });

        });

        return deferred.promise;
    });
}

function downloadThemes(task) {
    return uploader.downloadTheme(task).then(function(task) {
        var deferred = Q.defer();
        var contain = JSON.parse(task.contain);
        var fsPath = path.join(task.origPath, 'themes');
        var promise = [];
        contain.forEach(function(theme, i) {
            //replace empty space with '_'
            theme.name = theme.name.replace(/\s+/g, '_');

            promise.push(saveFile(path.join(fsPath, theme.name + '_' + theme.id + '.json'), JSON.stringify(theme, null, 4)));
            promise.push(saveImage(path.join(fsPath, 'img_' + theme.name + '_' + theme.id), theme));
        });

        Q.all(promise).then(function() {
            console.info('Download themes successful');
            deferred.resolve(task);
        }, function() {
            console.info('Download themes failure');
            deferred.reject();
        });

        return deferred.promise;
    });
}

function uploadThemes(task) {
    var deferred = Q.defer();
    var promise = [];
    var fsPath = path.join(task.origPath, 'themes/');
    var files = fs.readdirSync(fsPath);
    var filesName = [];
    var fileMap = {};

    files.forEach(function(v, i) {
        if (v.match(/.json/)) {
            filesName.push(v);
        }
    });

    uploader.downloadTheme(task)
        .then(function(task) {
            var targetThemes = JSON.parse(task.contain);
            task.idMap = {};

            targetThemes.forEach(function(v, i) {
                task.idMap[v.name] = {
                    id: v.id,
                    description: v.description
                };
            });

            filesName.forEach(function(fileName, i) {
                task.path = path.join(task.origPath, 'themes', fileName);
                promise.push(uploadTheme(task));
            });

            Q.all(promise).then(function() {
                console.info('Upload themes successful');
                deferred.resolve();
            }, function() {
                console.error('Upload themes failure');
                deferred.reject();
            });
        });

    return deferred.promise;
}

function uploadTheme(task) {
    // Avoid when do muti job at same time, effect each other.
    var cloneTask = JSON.parse(JSON.stringify(task));
    var deferred = Q.defer();

    readFile(cloneTask).then(function(task) {
        var name = task.fileContent.name;

        if (task.idMap[name]) {
            task.themeId = task.idMap[name].id;
            return uploadImage(task);
        } else {
            console.info('Theme %s not exist, create new theme', name);
            return uploader.createTheme(task).then(function(task) {
                task.themeId = task.contain.id;
                // for portal's bug(maybe..) after create new theme need use api first then uploadImage can
                // be successfulful.
                return uploader.uploadTheme(task);
            }).then(function(task) {
                return uploadImage(task);
            });
        }
    }).then(function(task) {
        return uploader.uploadTheme(task);
    }, function() {
        console.error('Upload theme failure');
        deferred.reject();
    }).then(function(task) {
        deferred.resolve();
    }, function() {
        console.error('Upload images failure');
        deferred.reject();
    });
    return deferred.promise;
}

function saveImage(path, theme) {
    var deferred = Q.defer();
    //if dir not exist, create it.
    fs.ensureDir(path, function(err) {
        if (err) {
            return console.error(err)
        }

        ['header_logo', 'header_bkimage', 'dashboard_thumbnail', 'browser_tab_icon'].forEach(function(v, i) {
            var url = theme.config[v];
            var options = {
                url: url,
                strictSSL: false,
                followRedirect: false
            };
            if (url) {
                var writeStream = fs.createWriteStream(path + '/' + v + '.png', 'utf8');
                request(options).pipe(writeStream).on('finish', function() {
                    deferred.resolve();
                });
            }
        });

    });

    return deferred.promise;
}

function uploadImage(task) {
    var deferred = Q.defer();
    var fileName = path.basename(task.path, '.json');
    var imgPath = path.join(path.dirname(task.path), 'img_' + fileName);
    var themeName = fileName.replace(/\_\d{10}/g, '');

    authenticate(task).then(function(task) {
        return uploader.checkSession(task);
    }).then(function(task) {
        return saveCookie(task.cookie);
    }).then(function() {
        uploader.getThemeList(task).then(function(data) {

            var html = data.contain.split(/<body\s*>/g)[1].split(/<\/body\s*>/g)[0].replace(/(\r\n|\n|\r)/g, '');
            fs.writeFileSync('./test.html', html, 'utf8');

            var $ = cheerio.load(html);
            var postId = $('#admin .title').parents('form').find('input[name="postid"]').attr('value');
            var value = $('#admin .title').parents('form').find('td:contains("' + themeName + '")').parents('tr').find('td:nth-child(2) input').attr('name');
            var form = {
                formname: "list_Theme",
                postid: postId
            };

            form[value] = '';
            task.form = form;

            uploader.getTheme(task).then(function(data) {
                var html = data.contain.split(/<body\s*>/g)[1].split(/<\/body\s*>/g)[0].replace(/(\r\n|\n|\r)/g, '');
                var $ = cheerio.load(html);
                var postId = $('form.computed').find('input[name="postid"]').attr('value');
                var themeId = $('form.computed').find('input[name="Theme_id"]').attr('value');
                var formName = $('form.computed').find('input[name="formname"]').attr('value');
                var form = {
                    formname: formName,
                    postid: postId,
                    Theme_id: themeId
                };

                if (chckFileExist(imgPath + '/browser_tab_icon.png')) {
                    form.browser_tab_icon = fs.createReadStream(imgPath + '/browser_tab_icon.png');
                }
                if (chckFileExist(imgPath + '/header_logo.png')) {
                    form.header_logo = fs.createReadStream(imgPath + '/header_logo.png');
                }
                if (chckFileExist(imgPath + '/header_bkimage.png')) {
                    form.header_bkimage = fs.createReadStream(imgPath + '/header_bkimage.png');
                }
                if (chckFileExist(imgPath + '/dashboard_thumbnail.png')) {
                    form.dashboard_thumbnail = fs.createReadStream(imgPath + '/dashboard_thumbnail.png');
                }

                task.form = form;

                uploader.updateTheme(task).then(function(task) {
                    var html = data.contain.split(/<body\s*>/g)[1].split(/<\/body\s*>/g)[0].replace(/(\r\n|\n|\r)/g, '');
                    // for debug.
                    deferred.resolve(task);
                });
            });
        });
    });
    return deferred.promise;
}

function chckFileExist(path) {
    try {
        fs.statSync(path);
        return true;
    } catch (e) {
        return false;
    }
}

function downloadDomainConfig(task) {
    return uploader.downloadDomainConfig(task)
        .then(function(task) {
            task.contain = JSON.stringify(JSON.parse(task.contain), null, 4);
            return saveFile(task.origPath + 'domain_config.json', task.contain).then(function() {
                return task;
            });
        }).then(function(task) {
            console.info('Download domain config successful');
            return task;
        }, function() {
            console.error('Download domain config failure');
        });;
}

function uploadDomainConfig(task) {
    return readFile(task, task.origPath + 'domain_config.json')
        .then(function(task) {
            task.current = 'target';

            // When target domain don't have pricing_planid1, upload would fail.
            if (task.fileContent.config) {
                task.fileContent.config.pricing_planid1 = '';
                task.fileContent.config.pricing_planid2 = '';
                task.fileContent.config.pricing_planid3 = '';
                task.fileContent.config.pricing_planid4 = '';
            }

            return uploader.uploadDomainConfig(task);
        }).then(function() {
            console.info('Upload domain config successful');
        }, function() {
            console.error('Upload domain config failure');
        });
}

function readFile(task, path) {
    var deferred = Q.defer();
    var fsReadFile = Q.denodeify(fs.readFile);
    this.path = path || task.path;

    fsReadFile(this.path, 'utf-8')
        .then(function(fileContent) {
            task.fileContent = JSON.parse(fileContent);
            deferred.resolve(task);
        }, function(err) {
            console.error('Read file failure');
            deferred.reject('failureed to read file');
        });

    return deferred.promise;
}

function saveFile(fsPath, contains) {
    var deferred = Q.defer();

    fs.ensureDir(path.dirname(fsPath), function() {
        var fsWriteFile = Q.denodeify(fs.writeFile);

        fsWriteFile(fsPath, contains)
            .then(function() {
                debug("The file was saved!");
                deferred.resolve();
            }).catch(function(err) {
                deferred.reject('failureed to wirte file');
            });
    });

    return deferred.promise;
}

function authenticate(task) {
    var deferred = Q.defer();

    var useCookie = function(cookie) {
        debug(cookie);
        cookieParesed = JSON.parse(cookie);
        task[task.current].cookie = cookie;

        if (!cookieParesed[task[task.current].domain]) {
            promptPwd('cookie not found ');
            return;
        }

        deferred.resolve(task);
    };

    var promptPwd = function() {
        debug('no cookies found');

        if (task[task.current].auth.username && task[task.current].auth.password) {
            deferred.resolve(task);
        } else if (task[task.current].auth.username) {
            debug('prompt');
            promptPassword().spread(function(pwd) {
                task[task.current].auth.password = pwd;
                deferred.resolve(task);
            });
        } else {
            deferred.reject('require authentication to proceed ');
        }
    };

    loadCookie()
        .then(useCookie, promptPwd);

    return deferred.promise;
}

function promptPassword() {
    var read = require('read');

    return Q.nfcall(read, {
        prompt: 'Password: ',
        silent: true
    });
}

function loadCookie() {
    return Q.nfcall(fs.readFile, COOKIE_PATH, 'utf8');
}

function saveCookie(cookie) {
    return Q.nfcall(fs.writeFile, COOKIE_PATH, JSON.stringify(cookie), 'utf8');
}

exports.downloadThemes = downloadThemes;
exports.uploadThemes = uploadThemes;
exports.downloadDomainConfig = downloadDomainConfig;
exports.uploadDomainConfig = uploadDomainConfig;
exports.downloadWidgets = downloadWidgets;
exports.uploadWidgets = uploadWidgets;