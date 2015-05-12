A tool to ease the pain in syncing domain
Version: 0.1.0

Usage:

    ndoe sync.js setup <save, restore, sync>

Options:

    -h, --help                 	output usage information
    -V, --version              	output the version number
    -t, --theme [theme_id]      Upload theme. If theme_id ommit, deal all themes. If dont have default theme, create one. Please e name.
    -d, --domain-config         Upload domanin config
    -w, --widget                Upload widget(not work now)
    -u, --user <account:password,account:password>   If you choose sync you need enter two sets of account.
    -f, --force                 Force update(not work now)
    -p, --path <path>           Saving path, if ommit, using "./"

### INSTALL

###### prerequisite

node v0.10.x
npm 1.x.x

	$ git clone git@i.exosite.com:calvinzheng/domain_sync.git
	$ cd domain_sync
	$ npm install

now you can try the command now

	$ node sync.js setup sync calvin.signoff.portalsapp basco.signoff.portalsapp -d  -p ./ -u calvinzheng@exosite.com:pw,calvinzheng@exosite.com:pw

if you see an error about node not existing
you could be using Ubuntu or node is not properly installed

### TODO

