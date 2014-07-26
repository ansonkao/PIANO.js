module.exports = function(grunt) {

  // Configuration
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    less: {
      dev: {
        files: {
          "index.css": "index.less"
        }
      }
    },
    watch: {
      less: {
        files: "*.less",
        tasks: "less"
      }
    }
  });

  // Tasks
  grunt.loadNpmTasks('grunt-contrib-less');
  grunt.loadNpmTasks('grunt-contrib-watch');

  // Commands
  grunt.registerTask('default', ['less']);

};