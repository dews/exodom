// 3rd party
var Q = require('q'),
    debug = require('debug')('main'),
    request = require('request'),
    fs = require('fs-extra'),
    console = require('better-console'),
    cheerio = require('cheerio'),
    extend = require('extend'),
    prompt = require('prompt');

prompt.message = '';
prompt.delimiter = '';

var os = require('os'),
    path = require('path');

// constants
var COOKIE_PATH = os.tmpdir() + path.sep + '.wiget-api-cookie';
debug('cookie: ' + COOKIE_PATH);

var api = require('./api.js');

function domainAlive(task) {
    var promises = [];
    if (task.source) {
        promises.push(api.domainAlive(task.source.domain).fail(function(res) {
            process.exit();
        }));
    }

    if (task.target) {
        promises.push(api.domainAlive(task.target.domain).fail(function(res) {
            process.exit();
        }));
    }
    return Q.all(promises);
}

function downloadWidgets(task) {
    return api.downloadWidgets(task).then(function(task) {
        var widgets = JSON.parse(task.contain);
        var fsPath = path.join(task.origPath, 'domain_widgets.json');

        //about outputJsonSync https://github.com/jprichardson/node-fs-extra#outputfilefile-data-callback
        fs.outputJsonSync(fsPath, widgets);
        console.info('Successfully downloaded domain widgets');
        return task;
    });
}

function uploadWidgets(task) {
    return api.downloadWidgets(task).then(function(task) {
        var fsPath = path.join(task.origPath, 'domain_widgets.json');
        var promise = [];
        var deferred = Q.defer();
        var widgetsIdMap = {};
        var widgets = JSON.parse(task.contain);

        widgets.forEach(function(widget, i) {
            widgetsIdMap[widget.name] = widget.id;
        });

        fs.readJson(fsPath, function(err, widgets) {
            if (err) {
                console.error('Failed to read domain_widgets.json');
                deferred.reject(task);
                return task;
            }

            widgets.reduce(function(soFar, widget, i) {
                return soFar.then(function() {
                    var deferred2 = Q.defer();

                    if (!widgetsIdMap[widget.name]) {
                        console.info('Domain widget %s does not exist, creating new widget...', widget.name);
                        task.widgetName = widget.name;
                        task.widgetDescription = widget.description;
                        task.code = widget.code;
                        return api.createWidget(task);
                    }

                    if (!task.interactive) {
                        console.info('Domain widget %s exists, skipped update', widget.name);
                        return Q();
                    }

                    prompt.start();

                    prompt.get([{
                        name: 'exist',
                        message: 'Overwrite the existing ' + '[' + widget.name + ']' + ' widget?',
                        validator: /y[es]*|n[o]?/,
                        warning: 'Must respond with yes or no',
                        default: 'no'
                    }], function(err, result) {
                        if (result.exist === 'yes' || result.exist === 'y') {
                            var taskClone = extend({
                                code: widget.code,
                                widgetId: widgetsIdMap[widget.name]
                            }, task);

                            api.updateWidget(taskClone).then(function() {
                                deferred2.resolve();
                            });
                        } else {
                            console.info('Skipped widget: [%s]', widget.name);
                            deferred2.resolve();
                        }
                    });

                    return deferred2.promise;
                });
            }, Q('')).then(function(task) {
                console.info('Successfully uploaded domain widgets');
                deferred.resolve(task);
            }, function() {
                console.error('Failed to upload domain widgets');
                deferred.reject(task);
            });
        });

        return deferred.promise;
    }).then(function(task) {
        return task;
    }, function(task) {
        return task;
    });
}

function downloadThemes(task) {
    var fsPath = path.join(task.origPath, 'themes');
    return removeFile(fsPath).then(function () {
            return api.downloadTheme(task);
        }).then(function(task) {
            var contain = JSON.parse(task.contain);
            var promise = [];

            contain.forEach(function(theme, i) {
                //replace empty space with '_'
                theme.name = theme.name.replace(/\s+/g, '_');

                promise.push(saveFile(path.join(fsPath, theme.name + '_' + theme.id + '.json'), JSON.stringify(theme, null, 4)));
                promise.push(saveImage(path.join(fsPath, 'img_' + theme.name + '_' + theme.id), theme));
            });

            return Q.all(promise).then(function() {
                console.info('Successfully downloaded themes');
                return task;
            }, function() {
                console.error('Failed to download themes');
                return task;
            });
        });
}

function uploadThemes(task) {
    var fsPath = path.join(task.origPath, 'themes/');
    var files;
    var filesName = [];

    try {
        files = fs.readdirSync(fsPath);
    } catch (e) {
        console.error('Failed to read themes file');
        debug(e);
        return Q(task);
    }

    files.forEach(function(v, i) {
        if (v.match(/.json/)) {
            filesName.push(v);
        }
    });

    return api.downloadTheme(task)
        .then(function(task) {
            var targetThemes = JSON.parse(task.contain);
            task.idMap = {};

            targetThemes.forEach(function(v, i) {
                task.idMap[v.name] = {
                    id: v.id,
                    description: v.description
                };
            });

            return filesName.reduce(function(soFar, fileName, i) {
                return soFar.then(function() {
                    task.path = path.join(task.origPath, 'themes', fileName);
                    return uploadTheme(task);
                });
            }, Q(''));
        }).then(function(task) {
            console.info('Successfully uploaded themes');
            return task;
        }, function(task) {
            console.info('Failed to upload themes');
            return task;
        });
}

function uploadTheme(task) {
    // Avoid when do muti job at same time, effect each other.
    var cloneTask = JSON.parse(JSON.stringify(task));

    return readFile(cloneTask).then(function(task) {
        var name = task.fileContent.name;

        if (task.idMap[name]) {
            if (task.interactive) {
                var deferred = Q.defer();

                prompt.get([{
                    name: 'exist',
                    message: 'Overwrite the existing ' + '[' + name + ']' + ' theme?',
                    validator: /y[es]*|n[o]?/,
                    warning: 'Must respond with yes or no',
                    default: 'no'
                }], function(err, result) {
                    if (result.exist === 'yes' || result.exist === 'y') {
                        task.themeId = task.idMap[name].id;
                        deferred.resolve(task);
                    } else {
                        console.info('Skipped theme [%s]', name);
                        deferred.reject(task);
                    }
                });

                return Q(deferred.promise).then(function(task) {
                    return uploadImage(task).then(function(task) {
                        return api.uploadTheme(task);
                    });
                }, function(task) {
                    // skip update theme
                    return task;
                });
            } else {
                console.info('Theme [%s] exists, skipped update', name);
                return task;
            }
        } else {
            console.info('Theme [%s] does not exist, creating new theme...', name);
            return api.createTheme(task).then(function(task) {
                task.themeId = task.contain.id;
                // for portal's bug(maybe..) after create new theme need use api first then uploadImage can
                // be successful.
                return api.uploadTheme(task);
            }).then(function(task) {
                return uploadImage(task);
            });
        }
    }).then(function(task) {
        return task;
    }, function() {
        console.error('Failed to upload theme [%s]', task.fileContent.name);
        return task;
    });
}

function saveImage(path, theme) {
    var deferred = Q.defer();
    //if dir not exist, create it.
    fs.ensureDir(path, function(err) {
        if (err) {
            return console.error(err);
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
        return api.checkSession(task);
    }).then(function(task) {
        return saveCookie(task.cookie);
    }).then(function() {
        api.getThemeList(task).then(function(data) {
            var html = data.contain.split(/<body\s*>/g)[1].split(/<\/body\s*>/g)[0].replace(/(\r\n|\n|\r)/g, '');
            fs.writeFileSync('./test.html', html, 'utf8');

            var $ = cheerio.load(html);
            var postId = $('#admin .title').parents('form').find('input[name="postid"]').attr('value');
            var value = $('#admin .title').parents('form').find('td:contains("' + themeName + '")').parents('tr').find('td:nth-child(2) input').attr('name');
            var form = {
                formname: 'list_Theme',
                postid: postId
            };

            form[value] = '';
            task.form = form;

            api.getTheme(task).then(function(data) {
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

                api.updateTheme(task).then(function(task) {
                    var html = data.contain.split(/<body\s*>/g)[1].split(/<\/body\s*>/g)[0].replace(/(\r\n|\n|\r)/g, '');
                    // for debug.
                    deferred.resolve(task);
                });
            });
        });
    });
    return deferred.promise;
}

function downloadClientModels(task) {
    return getClientModelList(task).then(function(task) {
        var clientModels = JSON.parse(task.contain);
        var fsPath = path.join(task.origPath, 'client_models.json');

        //about outputJsonSync https://github.com/jprichardson/node-fs-extra#outputfilefile-data-callback
        fs.outputJsonSync(fsPath, clientModels);
        console.info('Successfully downloaded client models');
        return task;
    });
}

function uploadClientModels(task) {
    var deferred = Q.defer();
    var fsPath = path.join(task.origPath, 'client_models.json');

    fs.readJson(fsPath, function(err, clientModels) {
        if (err) {
            console.error('Failed to read client_models.json');
            deferred.reject(task);
        }

        getClientModelList(task).then(function(task) {
            var existClientModels = JSON.parse(task.contain);
            var waitConfirm = [];

            return clientModels.reduce(function(soFar, clientModel) {
                return soFar.then(function() {
                    var deferred = Q.defer();
                    var simplifyId = clientModel.id.split('/')[1];
                    var taskClone = extend({
                        clientModels: {
                            ClientModel_id: '',
                            Name: simplifyId,
                            Friendly: clientModel.name || '',
                            // check user input rid
                            CloneRID: task.CloneRID || clientModel.cloneRID,
                            Vendor: task[task.current].domain.split('.')[0],
                            ViewID: '0000000000',
                            ExampleSN: clientModel.exampleSN,
                            SharedSN: clientModel.sharedSN,
                            ConvertSN: clientModel.convertSN,
                            AlternateSN: clientModel.alternateSN,
                            NoteSetup: clientModel.noteSetup,
                            NoteName: clientModel.noteName,
                            NoteLocation: clientModel.noteLocation,
                            Description: clientModel.description,
                            ConfirmPage: clientModel.confirmPage,
                            CompanyName: clientModel.companyName,
                            ContactEmail: clientModel.contactEmail,
                            ':published': clientModel[':published'].toString()
                        }
                    }, task);

                    if (!existClientModels.some(function(existClientModel) {
                            return simplifyId === existClientModel.id.split('/')[1];
                        })) {
                        console.info('Client model [%s] does not exist, creating new client model...', simplifyId);
                        return createClientModel(taskClone);
                    }

                    if (!task.interactive) {
                        console.info('Client model [%s] exists, skipped update', simplifyId);
                        return '';
                    }

                    prompt.start();

                    prompt.get([{
                        name: 'exist',
                        message: 'Overwrite the existing ' + '[' + simplifyId + ']' + ' client model?',
                        validator: /y[es]*|n[o]?/,
                        warning: 'Must respond with yes or no',
                        default: 'no'
                    }], function(err, result) {
                        if (result.exist === 'yes' || result.exist === 'y') {
                            var taskClone = extend({
                                request: clientModel
                            }, task);

                            updateClientModel(taskClone).then(function(task) {
                                deferred.resolve();
                            });
                        } else {
                            console.info('Skipped client model [%s]', simplifyId);
                            deferred.resolve();
                        }
                    });

                    return deferred.promise;
                });
            }, Q([]));

        }).then(function(task) {
            console.info('Successfully uploaded client models');
            deferred.resolve(task);
        }, function(reject) {
            console.error('Failed to upload client models');
            deferred.reject(task);
        });
    });

    return deferred.promise;
}

function createClientModel(task) {
    var deferred = Q.defer();

    authenticate(task).then(function(task) {
        return api.checkSession(task);
    }).then(function(task) {
        return saveCookie(task.cookie);
    }).then(function() {

        api.getClientModelPage(task).then(function(data) {
            var html = data.contain.split(/<body\s*>/g)[1].split(/<\/body\s*>/g)[0].replace(/(\r\n|\n|\r)/g, '');
            var $ = cheerio.load(html);

            task.form = extend({
                formname: $('form.computed').find('input[name="formname"]').attr('value'),
                postid: $('form.computed').find('input[name="postid"]').attr('value')
            }, task.clientModels);

            api.createClientModel(task).then(function(task) {
                var html = data.contain.split(/<body\s*>/g)[1].split(/<\/body\s*>/g)[0].replace(/(\r\n|\n|\r)/g, '');
                fs.writeFileSync('./test.html', html, 'utf8');

                // check create really successful
                var $ = cheerio.load(html);

                if ($('table>caption.title~tbody>tr>td:nth-child(6)').filter(function() {
                        return $(this).text() == task.clientModels.Name;
                    }).length) {
                    deferred.resolve(task);
                } else {

                    console.error('Failed to create client model ' + '[' + task.clientModels.Name + ']');

                    var notice = $('#admin .notice p').text();

                    if (notice) {
                        console.error('Error shown in Portals - ', notice);
                    }

                    deferred.reject(task);
                }
            });
        });

    });

    return deferred.promise;
}

function updateClientModel(task) {
    return api.updateClientModel(task);
}

function getClientModelList(task) {
    return api.getClientModelList(task);
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
    return api.downloadDomainConfig(task)
        .then(function(task) {
            task.contain = JSON.stringify(JSON.parse(task.contain), null, 4);
            return saveFile(task.origPath + '/domain_config.json', task.contain).then(function() {
                return task;
            });
        }).then(function(task) {
            console.info('Successfully downloaded domain config');
            return task;
        }, function() {
            console.error('Failed to download domain config');
            return task;
        });
}

function uploadDomainConfig(task) {
    return readFile(task, task.origPath + '/domain_config.json')
        .then(function(task) {
            task.current = 'target';

            // When target domain don't have pricing_planid1, upload would fail.
            // so reset it, prevent trouble.
            if (task.fileContent.config) {
                task.fileContent.config.pricing_planid1 = '';
                task.fileContent.config.pricing_planid2 = '';
                task.fileContent.config.pricing_planid3 = '';
                task.fileContent.config.pricing_planid4 = '';
            }

            return api.uploadDomainConfig(task).then(function() {
                console.info('Successfully uploaded domain config');
                return task;
            }, function() {
                console.error('Failed to upload domain config');
                return task;
            });
        }, function() {
            console.error('Failed to read domain_config.json');
            return task;
        });
}

function readFile(task, path) {
    var deferred = Q.defer();
    var fsReadFile = Q.nfbind(fs.readFile);
    this.path = path || task.path;

    fsReadFile(this.path, 'utf-8')
        .then(function(fileContent) {
            task.fileContent = JSON.parse(fileContent);
            deferred.resolve(task);
        }, function(err) {
            // console.error('Failed to read file');
            deferred.reject('Failed to read file');
        });

    return deferred.promise;
}

function removeFile(path) {
    var deferred = Q.defer();
    var fsRemove = Q.nfbind(fs.remove);
    this.path = path || task.path;

    fsRemove(path).then(function() {
        deferred.resolve();
    },function(err) {
        console.error('Failed to remove file');
        deferred.reject('Failed to remove file');
    });

    return deferred.promise;
}

function saveFile(fsPath, contains) {
    var deferred = Q.defer();

    fs.ensureDir(path.dirname(fsPath), function() {
        var fsWriteFile = Q.nfbind(fs.writeFile);

        fsWriteFile(fsPath, contains)
            .then(function() {
                debug('File saved!');
                deferred.resolve();
            }).catch(function(err) {
                deferred.reject('Failed to read file');
            });
    });

    return deferred.promise;
}

function authenticate(task) {
    var deferred = Q.defer();

    var useCookie = function(cookie) {
        debug(cookie);
        cookieParsed = JSON.parse(cookie);
        task[task.current].cookie = cookie;

        if (!cookieParsed[task[task.current].domain]) {
            promptPwd('cookie not found ');
            return;
        }

        deferred.resolve(task);
    };

    var promptPwd = function() {

        if (task[task.current].auth.username && task[task.current].auth.password) {
            deferred.resolve(task);
        } else if (task[task.current].auth.username) {
            debug('prompt');
            promptPassword().spread(function(pwd) {
                task[task.current].auth.password = pwd;
                deferred.resolve(task);
            });
        } else {
            deferred.reject('Requires authentication to proceed');
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

exports.domainAlive = domainAlive;

exports.downloadThemes = downloadThemes;
exports.uploadThemes = uploadThemes;

exports.downloadDomainConfig = downloadDomainConfig;
exports.uploadDomainConfig = uploadDomainConfig;

exports.downloadWidgets = downloadWidgets;
exports.uploadWidgets = uploadWidgets;

exports.downloadClientModels = downloadClientModels;
exports.uploadClientModels = uploadClientModels;