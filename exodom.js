#!/usr/bin/env iojs
var program = require('commander');

program
	.version('0.0.1')
	.usage('<command> <domains> <-u>')
	.command('save <domain>', 'save the domain')
	.command('restore <domain>', 'restroe the domain')
	.command('sync <from_domain> <to_domain>', 'sync between domains');

program.parse(process.argv);