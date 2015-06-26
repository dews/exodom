#!/usr/bin/env node

// 3rd party
var console = require('better-console'),
    debug = require('debug')('main'),
    Q = require('q'),
    program = require('commander'),
    prompt = require('prompt'),
    request = require('request'),
    extend = require('extend');

var path = require('path');
var utility = require('./utility.js');

program
    .usage('<source domain> [target domain] <-u> [option]')
    .option('-c, --client-models [device_rid]', 'Work on client-models. If [device_rid] omit, use same as source domain')
    .option('-d, --domain-config', 'Work on domain config, if you want to upload, you need to have global admin')
    .option('-i, --interactive', 'Show hint, let you decide update existing theme, client or not. When this option is omit, skip update existing theme, client')
    .option('-p, --path <path>', 'Saving path, if omit, using ./domainName')
    .option('-t, --theme [theme_id]', 'work on theme. Please avoid themes have same name.')
    .option('-u, --user <account:password,[account:password]>', 'First is for source domain, second is for target domain. If you ommit the password, you can input when prompt')
    .option('-w, --domain-widgets', 'work on widget');

program.parse(process.argv);

if (!program.args.length) {
    program.outputHelp();
    return;
}

if (program.args.length !== 2) {
    console.error('Please enter target domain and source domain');
    return;
}

if (!/\./g.test(program.args[0]) || !/\./g.test(program.args[1])) {
    console.error('Please enter correct domain name');
    return;
}

var task = {
    themeId: '',
    origPath: path.normalize(program.path || program.args[0] || './'),
    path: '',
    source: {
        domain: program.args[0] || '',
        auth: {
            username: '',
            password: ''
        },
        cookie: ''
    },
    target: {
        domain: program.args[1] || '',
        auth: {
            username: '',
            password: ''
        },
        cookie: ''
    },
    interactive: program.interactive,
    // Can switch between source and target.
    current: 'source'
};

task.path = task.origPath;

if (program.user) {
    var ac = program.user.split(',');
    var targetAc = ac[1];
    task.source.auth.username = ac[0].split(':')[0];
    task.source.auth.password = ac[0].split(':')[1];
    task.target.auth.username = targetAc ? targetAc.split(':')[0] : ac[0].split(':')[0];
    task.target.auth.password = targetAc ? targetAc.split(':')[1] : ac[0].split(':')[1];

    if (ac[0].split(':')[1] && (targetAc ? targetAc.split(':')[1] : ac[0].split(':')[1])) {
        distribute();
    } else {
        prompt.start();

        if (targetAc) {
            prompt.get([{
                name: 'password for source domain',
                required: true,
                hidden: true
            }, {
                name: 'password for target domain',
                required: true,
                hidden: true
            }], function(err, result) {
                task.source.auth.password = result['password for source domain'];
                task.target.auth.password = result['password for target domain'];
                distribute();
            });

        } else {
            prompt.get([{
                name: 'password for both domain',
                required: true,
                hidden: true
            }], function(err, result) {
                task.source.auth.password = result['password for both domain'];
                task.target.auth.password = result['password for both domain'];
                distribute();
            });
        }

    }

} else {
    console.error('Please enter you user acconut, use -u');
    return;
}

function distribute() {
    var promises = [];

    if (program.theme || program.domainConfig || program.domainWidgets || program.clientModels) {
        if (program.theme) {
            promises.push(function(task) {
                task.current = 'source';

                return utility.downloadThemes(task).then(function(task) {
                    task.current = 'target';

                    return utility.uploadThemes(task);
                });

            });
        }
        if (program.domainConfig) {
            promises.push(function(task) {
                task.current = 'source';

                return utility.downloadDomainConfig(task).then(function(task) {
                    task.current = 'target';

                    return utility.uploadDomainConfig(task);
                });
            });
        }
        if (program.domainWidgets) {
            promises.push(function(task) {
                task.current = 'source';

                return utility.downloadWidgets(task).then(function(task) {
                    task.current = 'target';

                    return utility.uploadWidgets(task);
                });
            });
        }
        if (program.clientModels) {
            promises.push(function(task) {
                task.current = 'source';

                return utility.downloadClientModels(task).then(function(task) {
                    task.current = 'target';

                    return utility.uploadClientModels(task);
                });
            });
        }

        promises.reduce(function(soFar, f) {

            return soFar.then(f);
        }, Q(task));

    } else {
        var taskClone = extend({}, task);

        utility.downloadThemes(taskClone).then(function(task) {
            task.current = 'target';

            return utility.uploadThemes(task);
        }).then(function() {
            taskClone = extend({}, task);

            return utility.downloadDomainConfig(taskClone);
        }).then(function(task) {
            task.current = 'target';

            return utility.uploadDomainConfig(task);
        }).then(function() {
            taskClone = extend({}, task);

            return utility.downloadWidgets(taskClone);
        }).then(function(task) {
            task.current = 'target';

            return utility.uploadWidgets(task);
        }).then(function() {
            taskClone = extend({}, task);

            return utility.downloadClientModels(taskClone);
        }).then(function(task) {
            task.current = 'target';

            return utility.uploadClientModels(task);
        });
    }
}