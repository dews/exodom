A tool to ease the pain in developing portal widget

Version: *0.1.0-beta*

Usage: 

	exoserv <host> <widgetId> <file ...> [options]

Options:

    -h, --help                 	output usage information
    -V, --version              	output the version number
    -u, --username <username>  	username for authentication
    -w, --watch                	watch for changes
    -S, --style <stylefile>		style to be injected [experimental]

### INSTALL

###### prerequisite

node v0.10.x
npm 1.x.x

	$ git clone git@i.exosite.com:willytseng/exosite-service-tools.git  
	$ cd exosite-service-tools  
	$ npm install  
	$ sudo ln -s $(pwd)/exoserv.js /usr/local/bin/exoserv  

now you can try the command now  

	$ exoserv

if you see an error about node not existing
you could be using Ubuntu or node is not properly installed

### TODO

refactor - **top priority**

livereload - livereload browser when watching the file
uglify - use uglify to minized the code before upload
browserify - apply require.js to generate widget
closure - compress widget by google closure

functionality - other functionality

config - a task like config file