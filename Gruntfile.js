module.exports = function(grunt) {

  // Load custom configs
  try {
    CONFIG = grunt.file.readJSON('config.json');
  } catch (e) {
    console.log( e );
    grunt.log.error("No 'config.json' found - using defaults. Format: {'HOST': 'foo.bar', ...}.");
    CONFIG = {};
  };

  // Configuration
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    less: {
      dev: {
        files: {
          "dist/PIANO.css": [
            "less/*.less",
            "bower_components/gripscroll/dist/GripScroll.css"
          ]
        }
      }
    },
    jshint: {
      options: {
        laxcomma: true
      },
      all: [
        'js/*.js'
      ]
    },
    uglify: {
      dev: {
        files: {
          "dist/PIANO.js": [
            "bower_components/keymaster/keymaster.js",
            "bower_components/gripscroll/dist/GripScroll.js",
            "js/*.js"
          ]
        },
        options: {
          beautify: true,
          mangle: false
        }
      }
    },
    watch: {
      less: {
        files: "less/*.less",
        tasks: "less"
      },
      js: {
        files: "js/*.js",
        tasks: [
          "jshint",
          "uglify"
        ]
      }
    },
    'http-server': {
      'dev': {
        root: '',
        port: CONFIG.PORT || 80,
        host: CONFIG.HOST || 'localhost',
        cache: 0,
        showDir: true,
        autoIndex: true,
        ext: "html",
        runInBackground: true
      }
    }
  });

  // Tasks
  grunt.loadNpmTasks('grunt-contrib-less');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-http-server');

  // Commands
  grunt.registerTask('default', ['http-server', 'less', 'jshint', 'uglify', 'watch']);
  grunt.registerTask('dev', ['http-server', 'watch']);

};