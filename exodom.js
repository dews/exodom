#!/usr/bin/env node
var program = require('commander');

program
	.version('0.1.1')
	.usage('<command> <domain> [domain] <-u> [option]')
	.command('upload <domain>', 'save the domain')
	.command('download <domain>', 'download the domain')
	.command('sync <from_domain> <to_domain>', 'sync between domains');

program.parse(process.argv);