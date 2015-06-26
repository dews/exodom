#!/usr/bin/env node

// 3rd party
var console = require('better-console'),
    debug = require('debug')('main'),
    Q = require('q'),
    program = require('commander'),
    prompt = require('prompt'),
    request = require('request');

var path = require('path');
var utility = require('./utility.js');

program
    .usage('<domain> <-u> [option]')
    .option('-c, --client-models [device_rid]', 'Work on client-models. If [device_rid] omit, use same as source domain')
    .option('-d, --domain-config', 'Work on domain config, if you want to upload, you need to have global admin')
    .option('-p, --path <path>', 'Save file path, if omit, using ./domainName')
    .option('-t, --theme [theme_id]', 'work on theme. Please avoid themes have same name.')
    .option('-u, --user <account:password>', 'If you ommit password, you can input when prompt')
    .option('-w, --domain-widgets', 'work on domain widget');

program.parse(process.argv);

if (!program.args.length) {
    program.outputHelp();
    return;
}

if (!/\./g.test(program.args[0])) {
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
    interactive: program.interactive,
    // Can switch between source and target.
    current: 'source'
};

task.path = task.origPath;

if (program.user) {
    var ac = program.user.split(',');
    task.source.auth.username = ac[0].split(':')[0];

    if (ac[0].split(':')[1]) {
        task.source.auth.password = ac[0].split(':')[1];
        distribute();
    } else {
        prompt.start();
        prompt.get([{
            name: 'password',
            required: true,
            hidden: true
        }], function(err, result) {
            task.source.auth.password = result.password;
            distribute();
        });
    }
} else {
    console.error('please enter you user acconut, use -u');
    return;
}

function distribute() {
    var promises = [];

    if (program.theme || program.domainConfig || program.domainWidgets || program.clientModels) {
        if (program.theme) {
            promises.push(utility.downloadThemes);
        }
        if (program.domainConfig) {
            promises.push(utility.downloadDomainConfig);
        }
        if (program.domainWidgets) {
            promises.push(utility.downloadWidgets);
        }
        if (program.clientModels) {
            promises.push(utility.downloadClientModels);
        }

        promises.reduce(function(soFar, f) {
            return soFar.then(f);
        }, Q(task));
    } else {
        utility.downloadThemes(task).then(function() {
            return utility.downloadDomainConfig(task);
        }).then(function() {
            return utility.downloadWidgets(task);
        }).then(function() {
            return utility.downloadClientModels(task);
        });

    }
}