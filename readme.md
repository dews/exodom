A tool to ease the pain in syncing domain
Version: 0.1.0

Usage:

    exodom save <domain>
    exodom restore <domain>
    exodom sync <domain> <domain>

Options:

    -h, --help                 	output usage information
    -V, --version              	output the version number
    -t, --theme [theme]      work on theme. If theme_id omit, deal all themes. If don't have default theme, create one. Please avoid same name. [theme] not working now.
    -d, --domain-config         work on domanin config, if you want upload, you need have globe admin.
    -w, --widget                work on widget(not working now)
    -u, --user <account:password,[account:password]>   When you choose sync, you need enter two sets of account. If two set are the same you can put only one set.
    -p, --path <path>           Saving path, if omit, using "./"

### INSTALL

###### prerequisite

node v0.10.x or iojs v2.0
npm 1.x.x

	$ git clone git@i.exosite.com:calvinzheng/domain_sync.git
	$ cd domain_sync
	$ npm install

now you can try the command now

	$ node ./exodom sync calvin.signoff.portalsapp basco.signoff.portalsapp -d  -p ./ -u calvinzheng@exosite.com:pw,calvinzheng@exosite.com:pw

if you see an error about node not existing
you could be using Ubuntu or node is not properly installed

you can add

    $ alias exodom='node ~/projects/domain_sync/exodom'
at ~/.bashrc then you can command at anywhere like this:

    $ exodom sync calvin.signoff.portalsapp basco.signoff.portalsapp -d  -p ./ -u calvinzheng@exosite.com:pw,calvinzheng@exosite.com:pw


### TODO

