#!/usr/bin/env node
var program = require('commander');

program
	.version('0.2.0')
	.usage('<command> <domain> [domain] <-u> [option]')
	.command('upload <domain>', 'save the domain')
	.command('download <domain>', 'download the domain')
	.command('sync <source domain> <target domain>', 'sync between domains');

program.parse(process.argv);