#!/usr/bin/env node

// 3rd party
var debug = require('debug')('main'),
    program = require('commander'),
    request = require('request'),
    console = require('better-console'),
    prompt = require('prompt');

var path = require('path');
var utility = require('./utility.js');

program
    .usage('<domain> <-u> [option]')
    .option('-t, --theme [theme_id]', 'work on theme. If [theme_id] omit, deal all themes. If the theme not exist, create it. Please avoid themes have same name. [theme_id] not working now.')
    .option('-c, --client-models [deivce_rid]', 'work on client-models. If [deivce_rid] omit, use same as source domain.')
    .option('-d, --domain-config', 'work on domain config, if you want to upload, you need to have global admin.')
    .option('-w, --domain-widgets', 'work on domain widget')
    .option('-u, --user <account:password>', 'If you ommit password, you can input when prompt.')
    .option('-p, --path <path>', 'Save file path, if omit, using ./domainName');

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
    if (program.theme || program.domainConfig || program.domainWidgets || program.clientModels) {
        if (program.theme) {
            utility.downloadThemes(task);
        }
        if (program.domainConfig) {
            utility.downloadDomainConfig(task);
        }
        if (program.domainWidgets) {
            utility.downloadWidgets(task);
        }
        if (program.clientModels) {
            utility.downloadClientModels(task);
        }
    } else {
        utility.downloadThemes(task);
        utility.downloadDomainConfig(task);
        utility.downloadWidgets(task);
        utility.downloadClientModels(task);
    }
}