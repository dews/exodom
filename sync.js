#!/usr/bin/env node

settings = {
    source: {
        url: 'taichung.exosite.com',
        themeId: '',
        username: 'calvinzheng@exosite.com',
        password: ''
    },
    target: {
        url: 'basco-dev.exosite.com',
        themeId: '',
        username: 'calvinzheng@exosite.com',
        password: ''
    }
};

// 3rd party
var Q = require('q'),
    debug = require('debug')('main'),
    program = require('commander'),
    request = require('request'),
    fs = require('fs-extra'),
    console = require('better-console'),
    cheerio = require('cheerio'),
    extend = require('extend');

var os = require('os'),
    path = require('path');

var uploader = require('./uploader.js');

Q.longStackSupport = true;

// constants
var COOKIE_PATH = os.tmpdir() + path.sep + '.wiget-uploader-cookie';
debug('cookie: ' + COOKIE_PATH);

program
    .version('0.0.1')
    .command('setup <save, restore, sync> [from_domain] [to_domain]')
    .action(function(cmd, fromDomain, toDomain, options) {
        program.cmd = cmd;
        program.opt = options;
        if (cmd === 'sync') {
            if (!fromDomain || !toDomain) {
                console.error('Miss from_domain or to_domain, please see help')
            } else {
                program.fromDomain = fromDomain;
                program.toDomain = toDomain;
                program.current = 'source';
            }
        } else if (cmd === 'save') {
            if (!fromDomain) {
                console.error('Miss from_domain, please see help')
            } else {
                program.fromDomain = fromDomain;
                program.current = 'source';
            }
        } else if (cmd === 'restore') {
            if (!fromDomain) {
                console.error('Miss to_domain, please see help')
            } else {
                program.toDomain = fromDomain;
                program.current = 'target';
            }
        }
    })
    .usage('setup <save, restore, sync> [path]')
    .option('-t, --theme [theme_id]', 'Upload theme. If theme_id ommit, deal all themes. If dont have default theme, create one. Please avoid same name.')
    .option('-d, --domain-config', 'Upload domanin config')
    .option('-w, --widget', 'Upload widget')
    .option('-u, --user <account:password,[account:password]>', 'If you choose sync you need enter two sets of account.')
    .option('-f, --force', 'Force update')
    .option('-p, --path <path>', 'Saving path, if ommit, using ./');

program.parse(process.argv);

var task = {
    themeId: settings.source.themeId || '',
    origPath: path.normalize(program.opt.path || './'),
    path: '',
    source: {
        domain: program.fromDomain || '',
        auth: {
            username: settings.source.username,
            password: settings.source.password
        },
        cookie: ''
    },
    target: {
        domain: program.toDomain || '',
        auth: {
            username: settings.target.username,
            password: settings.target.password
        },
        cookie: ''
    },
    // Can switch between source and target.
    current: program.current
};

task.path = task.origPath;

if (program.opt.user) {
    var ac = program.opt.user.split(',');
    var targetAc = ac[1];
    task.source.auth.username = ac[0].split(':')[0];
    task.source.auth.password = ac[0].split(':')[1];
    task.target.auth.username = targetAc ? targetAc.split(':')[0] : ac[0].split(':')[0];
    task.target.auth.password = targetAc ? targetAc.split(':')[1] : ac[0].split(':')[1];
} else {
    console.error('please enter you user acconut, use -u');
    return;
}

command(task);

function command(task) {
    if (program.cmd === 'save') {
        if (program.opt.theme) {
            downloadThemes(task);
        }

        if (program.opt.domainConfig) {
            downloadDomainConfig(task);
        }

    }

    if (program.cmd === 'restore') {
        task.current = 'target';

        if (program.opt.theme) {
            uploadThemes(task);
        }

        if (program.opt.domainConfig) {
            uploadDomainConfig(task);
        }
    }

    if (program.cmd === 'sync') {
        if (program.opt.theme) {
            downloadThemes(task).then(function(task) {
                task.current = 'target';
                uploadThemes(task);
            });
        } else if (program.opt.domainConfig) {
            downloadDomainConfig(task).then(function(task) {
                task.current = 'target';
                uploadDomainConfig(task);
            });
        } else {
            downloadThemes(task).then(function(task) {
                task.current = 'target';
                return uploadThemes(task);
            });
            downloadDomainConfig(task).then(function(task) {
                task.current = 'target';
                uploadDomainConfig(task);
            });
        }

    }
}

// var yaml = require('js-yaml')
// var config = loadConfig(WIDGET_CONFIG_NAME)

function downloadThemes(task) {
    return uploader.downloadTheme(task).then(function(task) {
        var deferred = Q.defer();
        var contain = JSON.parse(task.contain);
        var fsPath = path.join(task.origPath, 'theme/');
        var promise = [];
        contain.forEach(function(theme, i) {
            theme.name = theme.name.replace(/\s+/g, '_');
            promise.push(saveFile(fsPath + theme.name + '_' + theme.id + '.json', JSON.stringify(theme, null, 4)));
            promise.push(saveImage(fsPath + 'img_' + theme.name + '_' + theme.id + '/', theme));
        });

        Q.all(promise).then(function() {
            console.log('Save themes success');
            deferred.resolve(task);
        }, function() {
            console.log('Save themes fail');
            deferred.reject();
        });

        return deferred.promise;
    });
}

function uploadThemes(task) {
    var deferred = Q.defer();
    var promise = [];
    var fsPath = path.join(task.origPath, 'theme/');
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
                task.path = path.join(task.origPath, 'theme', fileName);
                promise.push(uploadTheme(task));
            });

            Q.all(promise).then(function() {
                console.log('Upload themes success');
                deferred.resolve();
            }, function() {
                console.log('Upload themes fail');
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
            return uploader.uploadTheme(task);
        } else {
            console.log('Theme %s not exist, create new theme', name);
            return uploader.createTheme(task)
                .then(function(task) {
                    task.themeId = task.contain.id;
                    return uploader.uploadTheme(task);
                });
        }
    }).then(function(task) {
        return uploadImage(task);
    }, function() {
        console.error('Upload theme fail');
        deferred.reject();
    }).then(function(task) {
        deferred.resolve();
    }, function() {
        console.error('Upload images fail');
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
                var writeStream = fs.createWriteStream(path + v + '.png', 'utf8');
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
    var imgPath = path.join(path.parse(task.path).dir, 'img_' + path.parse(task.path).name);
    var themeName = path.parse(task.path).name.replace(/\_\d{10}/g, '');

    authenticate(task).then(function(task) {
        return uploader.checkSession(task);
    }).then(function(task) {
        return saveCookie(task.cookie);
    }).then(function() {
        uploader.getThemeList(task).then(function(data) {
            var html = data.contain.split(/<body\s*>/g)[1].split(/<\/body\s*>/g)[0].replace(/(\r\n|\n|\r)/g, '');
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
                // for debug.
                fs.writeFileSync('./test.html', html, 'utf8');
                var $ = cheerio.load(html);
                var postId = $('form.computed').find('input[name="postid"]').attr('value');
                var themeId = $('form.computed').find('input[name="Theme_id"]').attr('value');
                var formName = $('form.computed').find('input[name="formname"]').attr('value');
                var form = {
                    formname: formName,
                    postid: postId,
                    Theme_id: themeId,
                    'Config[dashboard_background][background_color]': '666666'
                };

                fs.stat(imgPath + '/browser_tab_icon.png', function(err, stat) {
                    if (err == null) {
                        form.browser_tab_icon = fs.createReadStream(imgPath + '/browser_tab_icon.png');
                    }
                });
                fs.stat(imgPath + '/header_bkimage.png', function(err, stat) {
                    if (err == null) {
                        form.header_bkimage = fs.createReadStream(imgPath + '/header_bkimage.png');
                    }
                });
                fs.stat(imgPath + '/header_logo.png', function(err, stat) {
                    if (err == null) {
                        form.header_logo = fs.createReadStream(imgPath + '/header_logo.png');
                    }
                });
                fs.stat(imgPath + '/dashboard_thumbnail.png', function(err, stat) {
                    if (err == null) {
                        form.dashboard_thumbnail = fs.createReadStream(imgPath + '/dashboard_thumbnail.png');
                    }
                });

                task.form = form;

                uploader.updateTheme(task).then(function(data) {
                    deferred.resolve();
                });
            });
        });
    });
    return deferred.promise;
}

function downloadDomainConfig(task) {
    return uploader.downloadDomainConfig(task)
        .then(function(task) {
            task.contain = JSON.stringify(JSON.parse(task.contain), null, 4);
            return saveFile(task.origPath + 'domain_config.json', task.contain).then(function() {
                return task;
            });
        }).then(function(task) {
            console.log('Save domain config success');
            return task;
        }, function() {
            console.error('Save domain config fail');
        });;
}

function uploadDomainConfig(task) {
    return readFile(task, task.origPath + 'domain_config.json')
        .then(function(task) {
            task.current = 'target';
            return uploader.uploadDomainConfig(task);
        }).then(function() {
            console.log('Restore domain config success');
        }, function() {
            console.error('Restore domain config fail');
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
            console.error('Read file fail');
            deferred.reject('Failed to read file');
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
                deferred.reject('Failed to wirte file');
            });
    });

    return deferred.promise;
}

function authenticate(task) {
    var deferred = Q.defer();

    var useCookie = function(cookie) {
        debug(cookie);

        task[task.current].cookie = cookie;
        if (!cookie[task[task.current].domain]) {
            promptPwd('cookie not found ');
            return;
        }

        deferred.resolve(task);
    };

    var promptPwd = function(err) {
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
        .then(useCookie)
        .fail(promptPwd);

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
    return Q.nfcall(fs.readFile, COOKIE_PATH, 'utf8').then(JSON.parse);
}

function saveCookie(cookie) {
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

    config.style = (config.style || []).map(function(path) {
        return WIDGET_INIT_CWD + '/' + path
    })

    config.script = config.script.map(function(path) {
        return WIDGET_INIT_CWD + '/' + path
    }).concat('!gulpfile.js')

    config.auth = config.auth || {
        username: process.env.EXO_W_USER,
        password: process.env.EXO_W_PASS
    }

    return config
}