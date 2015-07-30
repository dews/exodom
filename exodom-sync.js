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
    .usage('<source domain> [target domain] -u [options]')
    .option('-c, --client-models [device_rid]', 'Sync client-models. If [device_rid] is omitted, use the same [device_rid] as the source domain\'s.')
    .option('-d, --domain-config', 'Sync domain config. Requires global admin access to upload.')
    .option('-i, --interactive', 'Show hints. Prompt users to overwrite existing themes, client models, domain widgets. If this option is not used, existing objects will be skipped.')
    .option('-p, --path <path>', 'Save files at the selected path, the default path is "./domain_url')
    .option('-t, --theme [theme_id]', 'Sync themes. Domains should not have themes with the same name.')
    .option('-u, --user <account:password,[account:password]>', 'Passwords can be omitted, users wll be prompted to input them. Two sets of credentials are required.')
    .option('-w, --domain-widgets', 'Sync domain widgets.');

program.parse(process.argv);

if (!program.args.length) {
    program.outputHelp();
    return;
}

if (program.args.length !== 2) {
    console.error('Please enter a source domain and a target domain');
    return;
}

if (!/\./g.test(program.args[0]) || !/\./g.test(program.args[1])) {
    console.error('Please enter correct domain name');
    return;
}

var path = program.path ? path.join(program.path, program.args[0]) : path.normalize(program.args[0]);
var task = {
    themeId: '',
    origPath: path,
    path: path,
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
    // help switch between source and target.
    current: 'source'
};

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
                name: 'Password for source domain: ',
                required: true,
                hidden: true
            }, {
                name: 'Password for target domain: ',
                required: true,
                hidden: true
            }], function(err, result) {
                task.source.auth.password = result['Password for source domain: '];
                task.target.auth.password = result['Password for target domain: '];
                utility.domainAlive(task).then(function() {
                    distribute();
                });
            });

        } else {
            prompt.get([{
                name: 'Password for both domains: ',
                required: true,
                hidden: true
            }], function(err, result) {
                task.source.auth.password = result['Password for both domains: '];
                task.target.auth.password = result['Password for both domains: '];
                utility.domainAlive(task).then(function() {
                    distribute();
                });
            });
        }

    }

} else {
    console.error('Please include your user account with -u');
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