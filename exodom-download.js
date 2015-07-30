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
    .option('-c, --client-models [device_rid]', 'Download client-models.')
    .option('-d, --domain-config', 'Download domain config.')
    .option('-p, --path <path>', 'A new folder named with the domain_url will be created under the current working directory (./domain_url), files will be downloaded to this folder. If a path was specified, the new folder will be created under the specified path (/yourpath/domain_url).')
    .option('-t, --theme [theme_id]', 'Download themes. Domains should not have themes with the same name.')
    .option('-u, --user <account:password>', 'Passwords can be omitted, users wll be prompted to input them.')
    .option('-w, --domain-widgets', 'Download domain widgets');

program.parse(process.argv);

if (!program.args.length) {
    program.outputHelp();
    return;
}

if (!/\./g.test(program.args[0])) {
    console.error('Please enter a correct domain name');
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
    interactive: program.interactive,
    // help switch between source and target.
    current: 'source'
};

if (program.user) {
    var ac = program.user.split(',');
    task.source.auth.username = ac[0].split(':')[0];

    if (ac[0].split(':')[1]) {
        task.source.auth.password = ac[0].split(':')[1];
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
            task.source.auth.password = result.password;
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