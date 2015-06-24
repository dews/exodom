#!/usr/bin/env node

// 3rd party
var debug = require('debug')('main'),
    program = require('commander'),
    request = require('request'),
    console = require('better-console'),
    extend = require('extend'),
    prompt = require('prompt');

var path = require('path');
var utility = require('./utility.js');

program
    .usage('<source domain> [target domain] <-u> [option]')
    .option('-t, --theme [theme_id]', 'work on theme. If [theme_id] omit, deal all themes. If the theme not exist, create it. Please avoid themes have same name. [theme_id] not working now.')
    .option('-c, --client-models [deivce_rid]', 'work on client-models. If [deivce_rid] omit, use same as source domain.')
    .option('-d, --domain-config', 'work on domain config, if you want to upload, you need to have global admin.')
    .option('-w, --domain-widgets', 'work on widget')
    .option('-u, --user <account:password,[account:password]>', 'First is for source domain, second is for target domain. If you ommit password, you can input when prompt.')
    .option('-p, --path <path>', 'Saving path, if omit, using ./domainName');

program.parse(process.argv);

if (!program.args.length) {
    program.outputHelp();
    return;
}

if (program.args.length !== 2) {
    console.error('please enter target domain and source domain');
    return;
}

if (!/\./g.test(program.args[0]) || !/\./g.test(program.args[1])) {
    console.error('please enter correct domain name');
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
    console.error('please enter you user acconut, use -u');
    return;
}

function distribute() {
    if (program.theme || program.domainConfig || program.domainWidgets || program.clientModels) {
        if (program.theme) {
            utility.downloadThemes(task).then(function(task) {
                task.current = 'target';
                utility.uploadThemes(task);
            });
        }
        if (program.domainConfig) {
            utility.downloadDomainConfig(task).then(function(task) {
                task.current = 'target';
                utility.uploadDomainConfig(task);
            });
        }
        if (program.domainWidgets) {
            utility.downloadWidgets(task).then(function(task) {
                task.current = 'target';
                utility.uploadWidgets(task);
            });
        }
        if (program.clientModels) {
            utility.downloadClientModels(task).then(function(task) {
                task.current = 'target';
                utility.uploadClientModels(task);
            });
        }
    } else {
        var taskClone = extend({}, task);
        utility.downloadThemes(taskClone).then(function(task) {
            task.current = 'target';
            utility.uploadThemes(task);
        });

        taskClone = extend({}, task);
        utility.downloadDomainConfig(taskClone).then(function(task) {
            task.current = 'target';
            utility.uploadDomainConfig(task);
        });

        taskClone = extend({}, task);
        utility.downloadWidgets(taskClone).then(function(task) {
            task.current = 'target';
            utility.uploadWidgets(task);
        });

        taskClone = extend({}, task);
        utility.downloadClientModels(taskClone).then(function(task) {
            task.current = 'target';
            utility.uploadClientModels(task);
        });
    }
}