#!/usr/bin/env node
var program = require('commander');

program
	.version('0.3.3')
	.usage('<command> <domain> [domain] <-u> [option]')
	.command('upload <domain>', 'Upload specified files to domain')
	.command('download <domain>', 'Download specified files from domain')
	.command('sync <source_domain> <target_domain>', 'Sync between two domains');

program.parse(process.argv);