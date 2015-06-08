#!/usr/bin/env node

// 3rd party
var debug = require('debug')('main'),
    program = require('commander'),
    request = require('request'),
    console = require('better-console');

var path = require('path');
var utility = require('./utility.js');

program
    .option('-t, --theme [theme_id]', 'work on theme. If [theme_id] omit, deal all themes. If the theme not exist, create it. Please avoid themes have same name. [theme_id] not working now.')
    .option('-d, --domain-config', 'work on domain config, if you want to upload, you need to have global admin.')
    .option('-w, --domain-widgets', 'work on widgets')
    .option('-u, --user <account:password,[account:password]>', 'When you choose sync, you need enter two sets of account. If two sets are the same you can enter only one.')
    .option('-p, --path <path>', 'download file path, if omit, using ./');

program.parse(process.argv);

if (!program.args.length) {
    console.error('please enter domain name');
    return;
}

if (!/\./g.test(program.args[0])) {
    console.error('please enter correct domain name');
    return;
}

var task = {
    themeId: '',
    origPath: path.normalize(program.path || './'),
    path: '',
    target: {
        domain: program.args[0] || '',
        auth: {
            username: '',
            password: ''
        },
        cookie: ''
    },
    // Can switch between source and target.
    current: 'target'
};

task.path = task.origPath;

if (program.user) {
    var ac = program.user.split(',');
    var targetAc = ac[1];
    task.target.auth.username = targetAc ? targetAc.split(':')[0] : ac[0].split(':')[0];
    task.target.auth.password = targetAc ? targetAc.split(':')[1] : ac[0].split(':')[1];
} else {
    console.error('please enter you user acconut, use -u');
    return;
}

if (program.theme || program.domainConfig || program.domainWidgets) {
    if (program.theme) {
        utility.uploadThemes(task);
    }
    if (program.domainConfig) {
        utility.uploadDomainConfig(task);
    }
    if (program.domainWidgets) {
        utility.uploadWidgets(task);
    }

} else {
    utility.uploadThemes(task);
    utility.uploadDomainConfig(task);
    utility.uploadWidgets(task);
}