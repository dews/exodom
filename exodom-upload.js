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
    .usage('<domain> -u [options]')
    .option('-c, --client-models [device_rid]', 'Upload client-models. If [device_rid] is omitted, use the same [device_rid] as the source domain\'s.')
    .option('-d, --domain-config', 'Upload domain config. Requires global admin access to upload.')
    .option('-i, --interactive', 'Show hints. Prompt users to overwrite existing themes, client models, domain widgets. If this option is not used, existing objects will be skipped.')
    .option('-p, --path <path>', 'Look for files in the domain_url folder under your current working directory. If a path was specified, exodom will look for files in the specified path.')
    .option('-t, --theme [theme_id]', 'Upload themes. Domains should not have themes with the same name.')
    .option('-u, --user <account:password>', 'Passwords can be omitted, users wll be prompted to input them.')
    .option('-w, --domain-widgets', 'Upload domain widgets');

program.parse(process.argv);

if (!program.args.length) {
    program.outputHelp();
    return;
}

if (!/\./g.test(program.args[0])) {
    console.error('Please enter a correct domain name');
    return;
}

var path = program.path ? program.path : path.normalize(program.args[0]);
var task = {
    themeId: '',
    origPath: path,
    path: path,
    target: {
        domain: program.args[0] || '',
        auth: {
            username: '',
            password: ''
        },
        cookie: ''
    },
    interactive: program.interactive,
    // help switch between source and target.
    current: 'target'
};

if (program.user) {
    var ac = program.user.split(',');
    task.target.auth.username = ac[0].split(':')[0];

    if (ac[0].split(':')[1]) {
        task.target.auth.password = ac[0].split(':')[1];
        utility.domainAlive(task).then(function() {
            distribute();
        });
    } else {
        prompt.start();
        prompt.get([{
            name: 'password: ',
            required: true,
            hidden: true
        }], function(err, result) {
            task.target.auth.password = result.password;
            utility.domainAlive(task).then(function() {
                distribute();
            });
        });
    }
} else {
    console.error('Please include your user account with -u');
    return;
}

function distribute() {
    var promises = [];

    if (program.theme || program.domainConfig || program.domainWidgets || program.clientModels) {
        if (program.theme) {
            promises.push(utility.uploadThemes);
        }
        if (program.domainConfig) {
            promises.push(utility.uploadDomainConfig);
        }
        if (program.domainWidgets) {
            promises.push(utility.uploadWidgets);
        }
        if (program.clientModels) {
            if (typeof program.clientModels == 'string' && program.clientModels.match(/\w{40}/)) {
                task.CloneRID = program.clientModels;
            }
            promises.push(utility.uploadClientModels);
        }

        promises.reduce(function(soFar, f) {

            return soFar.then(f);
        }, Q(task));

    } else {
        utility.uploadThemes(task).then(function() {
            return utility.uploadDomainConfig(task);
        }).then(function() {
            return utility.uploadWidgets(task);
        }).then(function() {
            return utility.uploadClientModels(task);
        });
    }
}