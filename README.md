PIANO.js
========

Piano in the browser (work in progress)

### Setting up your Environment

##### NodeJS/NPM
NodeJS is a server-side version of javascript. NPM is a package manager for NodeJS libraries, several of which have become indespensible tools for front-end web development across the world. We'll install NPM by following the instructions available at http://nodejs.org/download/ depending on which type of computer system you are running.

##### Git
Source control. You can use any git client you want - GitHub's client, SourceTree, etc. I prefer using the CLI for git:

    $ apt-get install git

Once you have git, clone this project repository:

    $ git clone https://github.com/ansonkao/PIANO.js.git

Now that you have the repository, you should see a bunch of source files, and some configuration files for dependencies. We're going to load those dependencies, compile the code, and then we'll be ready to load it up in the browser!

##### Bower
Package management for front-end web develpoment, as an npm module. Install Bower via:

    $ npm install -g bower

Then, pull all the necessary dependencies via:

    $ bower install

You should now have directory in your project called `/bower_components/`, with the dependencies loaded in them.

##### Grunt
Task automation for front-end web development, as an npm module. We need it to compile our code. Install Grunt via:

    $ npm install -g grunt

Then, run the following command to populate other NPM modules that we will be using Grunt to automate:

    $ npm install
    
(note, you can actually just do `$ npm install` right at the beginning to install both bower and grunt, but the long version is provided here for completeness)
Now, run Grunt like so, to compile the code:

    $ grunt
    
You should now have compiled code in the `/dist/` folder. Run the prototype by loading `/demo/index.html` in your browser. Run the following command if you would like Grunt to automatically recompile your code whenever you change any of the source files:

    $ grunt watch

============================
    
Copyright 2014 Anson Kao
http://www.ansonkao.com/
