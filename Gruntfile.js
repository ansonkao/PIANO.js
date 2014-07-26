module.exports = function(grunt) {

  // Configuration
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    less: {
      dev: {
        files: {
          "PIANO.css": "less/*.less"
        }
      }
    },
    uglify: {
      dev: {
        files: {
          "PIANO.js": "js/*.js"
        },
        options: {
          beautify: true
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
        tasks: "uglify"
      }
    }
  });

  // Tasks
  grunt.loadNpmTasks('grunt-contrib-less');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-watch');

  // Commands
  grunt.registerTask('default', ['less', 'uglify']);

};