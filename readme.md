# Exodom
#### A tool to ease the pain of syncing data across domains

[![Join the chat at https://gitter.im/dews/exodom](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/dews/exodom?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

### Usage:

    exodom download <domain> [options]
    exodom upload <domain> [options]
    exodom sync <source domain> <target domain> [options]

### Options:

    -c, --client-models [device_rid]    Sync client-models. If [device_rid] is 
                                        omitted, use the same [device_rid] as the 
                                        source domain's.

    -d, --domain-config                 Sync domain config. Requires global 
                                        admin access to upload.

    -h, --help                          Print this page.

    -i, --interactive                   Show hints. Prompt users to overwrite 
                                        existing themes, client models, domain 
                                        widgets. If this option is not used,
                                        existing objects will be skipped.

    -p, --path <path>                   Save objects at the selected path, 
                                        the default path is "./domain name".

    -t, --theme                         Sync themes. Domains should not have 
                                        themes with the same name.

    -u, --user <user:pwd,[user:pwd]>    Passwords can be omitted, users wll be 
                                        prompted to input them. When syncing,
                                        two sets of credentials are required.

    -u, --user <user:pwd>               Users may enter one only set of 
                                        credentials if it is able to access both
                                        source and target domains.

    -V, --version                       Output the version number.

    -w, --widget                        Sync domain widgets.

If no options are included, the default options are:

    -t, -c, -d, -w

### INSTALLATION

##### prerequisites
<div></div>
- node version ≥ **v0.10.x** - follow the installation instructions [here](https://nodejs.org/download/ "nodejs.org")
- npm  version ≥ **1.x.x**
    
Run the following command to install exodom:

    $ sudo npm install -g exodom

Example of syncing data from source.signoff.domain to target.signoff.domain:

    $ exodom sync source.signoff.domain target.signoff.domain -d -t -p ./ -u user@exosite.com:userpassword,admin@exosite.com:adminpassword

If you are working on a signoff domain, make sure your host file includes your 
domain. 

Note:   **52.8.31.110** is used for signoff domains.

### TODOS
1. Add force update

##### widget
1. Sync widget published option

##### client model
1. Sync picture
