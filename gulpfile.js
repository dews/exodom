/* jshint asi: true, curly: false */
'use strict';

var WIDGET_INIT_CWD = process.env.INIT_CWD
var WIDGET_BUILD_PATH = WIDGET_INIT_CWD + '/build'
var WIDGET_CONFIG_NAME = 'widget.gulp'
var fs = require('fs')
var gulp = require('gulp')
var gutil = require("gulp-util")
var through2 = require('through2')
var exo = require('./gulp-exo.js')

gulp.task('default', ['domainConfig'], function () {})

gulp.task('domainConfig', ['downloadDomainConfig'], function () {

})

gulp.task('downloadDomainConfig', function () {
	exo.downloadDomainConfig().done(function (task) {
		return string_src("domainConfig.json", task.contains)
			.pipe(gulp.dest('./'))
	});
})

gulp.task('gitDomainConfig', function () {

})

gulp.task('uploadDomainConfig', function (cb) {
	gulp.src('domainConfig.json').pipe(gutil.noop())
		.pipe(through2({
			objectMode: true
		}, function (chunk, enc, callback) {
			exo.uploadDomainConfig(chunk).done(function () {
				process.stdout.write('done');
				callback()
			});
		}))

});

function string_src(filename, string) {
	var src = require('stream').Readable({
		objectMode: true
	});
	src._read = function () {
		this.push(new gutil.File({
			cwd: "",
			base: "",
			path: filename,
			contents: new Buffer(string)
		}))
		this.push(null)
	}
	return src;
}