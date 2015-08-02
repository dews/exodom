var assert = require("assert")
var utility = require('../utility.js');
var ac = '';
var pw = '';
var domain = ''

var task = {
    themeId: '',
    origPath: './' + domain,
    path: './' + domain,
    source: {
        domain: domain,
        auth: {
            username: ac,
            password: pw
        },
        cookie: ''
    },
    interactive: false,
    // help switch between source and target.
    current: 'source'
};

describe('Array', function() {
    this.timeout(5000);

    describe('downloadThemes', function() {
        it('should finish downloadThemes', function(done) {
            utility.downloadThemes(task).then(function(argument) {
                done();
            })

        });
    });
    describe('uploadThemes', function() {
        it('should finish uploadThemes', function(done) {
            utility.uploadThemes(task).then(function(argument) {
                done();
            })

        });
    });
    describe('downloadWidgets', function() {
        it('should finish downloadWidgets', function(done) {
            utility.downloadWidgets(task).then(function(argument) {
                done();
            })

        });
    });
    describe('uploadWidgets', function() {
        it('should finish uploadWidgets', function(done) {
            utility.downloadWidgets(task).then(function(argument) {
                done();
            })

        });
    });
    describe('downloadClientModels', function() {
        it('should finish downloadClientModels', function(done) {
            utility.downloadClientModels(task).then(function(argument) {
                done();
            })

        });
    });
    describe('uploadClientModels', function() {
        it('should finish uploadClientModels', function(done) {
            utility.uploadClientModels(task).then(function(argument) {
                done();
            })

        });
    });
        describe('downloadDomainConfig', function() {
        it('should finish downloadDomainConfig', function(done) {
            utility.downloadDomainConfig(task).then(function(argument) {
                done();
            })

        });
    });
            describe('uploadDomainConfig', function() {
        it('should finish uploadDomainConfig', function(done) {
            utility.uploadClientModels(task).then(function(argument) {
                done();
            })

        });
    });
});
