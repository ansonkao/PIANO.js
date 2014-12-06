/* Prototype for MIDI Notes as used throughout the application.
 *
 */

function Note(params)
{
  this.start    = params.start    || 0.0;
  this.end      = params.end      || 0.0;
  this.key      = params.key      || 60;    // Middle C
  this.velocity = params.velocity || 127;
  this.active   = params.active   || false;
  this.selected = params.selected || false;

  return this;
}

Note.prototype.activate = function(){ this.active   = true; };
Note.prototype.select   = function(){ this.selected = true; };