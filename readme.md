A tool to ease the pain in syncing domain
Version: 0.1.1

Usage:

    exodom download <domain> [options]
    exodom upload <domain> [options]
    exodom sync <from_domain> <to_domain> [options]

Options:

    -h, --help                 	output usage information
    -V, --version              	output the version number
    -t, --theme [theme_id]      work on theme. If [theme_id] omit, deal all themes. If the theme not exist, create it. Please avoid themes have same name. [theme_id] not working now.
    -d, --domain-config         work on domain config, if you want to upload, you need to have global admin.
    -w, --widget                work on widgets
    -u, --user <account:password,[account:password]>   When you choose sync, you need enter two sets of account. If two sets are the same you can enter only one.
    -p, --path <path>           Saving path, if omit, using "./"

When no options default take with:

    -t, -d, -w

### INSTALL

###### prerequisite

node v0.10.x or iojs v2.0
installation instructions: https://nodejs.org/download/
npm 1.x.x

	$ git clone git@i.exosite.com:calvinzheng/domain_sync.git
	$ cd exo-dom
	$ sudo npm install -g

It would install at /usr/local/lib/node_modules/exo-dom

Now you can try the command now

	$ exodom sync calvin.signoff.portalsapp basco.signoff.portalsapp -d  -p ./ -u calvinzheng@exosite.com:pw,calvinzheng@exosite.com:pw

If you see an error about node not existing,
you could be using Ubuntu or node is not properly installed

When use iojs, you should modify exodom.js like this:
    #!/usr/bin/env node -> #!/usr/bin/env iojs

When work on signoff, you should check you can connect to signoff correctly. If not, you may need add 173.255.254.240 at host file or 10.137.1.100 at dns.

### TODO
1. Move project to github, use npm install
2. Prompt password
3. Sync client Model
4. Use domain as default path
