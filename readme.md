A tool to ease the pain in syncing domain
Version: 0.3.0

Usage:

    exodom download <domain> [options]
    exodom upload <domain> [options]
    exodom sync <source domain> <target domain> [options]

Options:

    -c, --client-models [device_rid]   Work on client-models. If [device_rid] omit, use same the device_rid as source domain
    -d, --domain-config         Work on domain config. When doing upload, you need to have global admin.(means,download don't have)
    -h, --help                  Print this help screen
    -i, --interactive           Show hint, let you decide update existing theme, client model, domain widget or not. When this option is omit, skip update existing object. 
    -p, --path <path>           Saving file at the path, defalut is "./domain name"
    -t, --theme                 Work on theme. A domain should not have themes with same name.
    -u, --user <account:password,[account:password]>  The password can be ommit, then inut at next phase. When you choose sync, you need enter two sets of account. If password of source and target are the same you can choose enter only one.
    -V, --version               Output the version number
    -w, --widget                Work on domain widgets

When no options, default options is:

    -t, -c, -d, -w

### INSTALL

###### prerequisite

node >v0.10.x
installation instructions: https://nodejs.org/download/
npm 1.x.x

	$ git clone git@i.exosite.com:calvinzheng/domain_sync.git
	$ cd exo-dom
	$ npm start

It would install at /usr/local/lib/node_modules/exodom

Now you can try the command like this:

	$ exodom sync calvin.signoff.portalsapp basco.signoff.portalsapp -d  -p ./ -u calvinzheng@exosite.com:pw,calvinzheng@exosite.com:pw

If you see an error about node not existing, you could be using Ubuntu or node is not properly installed

When work on signoff, you should check you can connect to signoff correctly. If not, you may need add 173.255.254.240 at host file or 10.137.1.100 at dns.

### TODO
1. Add force update.

###### widget
1. Sync widget published option

###### client model
1. Sync picture