var PIANO = (function($){

  // ==========================================================================
  // Config
  // ==========================================================================
  $.config = $.config || {};
  $.config.keyboard_range = 88;


  // ==========================================================================
  // Initialize
  // ==========================================================================
  $.sequencer = {};
  $.sequencer.wrapper = document.getElementById('sequencer');
  $.sequencer.el = $.sequencer.wrapper.appendChild( document.createElement('canvas') );
  $.sequencer.canvas = $.sequencer.el.getContext("2d");

  // Sequencer Coordinates - Helper Methods
  $.sequencer.time_range = function(){ return $.sequencer.time_stop - $.sequencer.time_start; };
  $.sequencer.note_range = function(){ return $.sequencer.note_stop - $.sequencer.note_start; };

  // Canvas Drawing - Custom Helper Methods
  CanvasRenderingContext2D.prototype.drawLine = function( x1, y1, x2, y2, xy_flip ){
    if( xy_flip )
    {
      x1 = [y1, y1 = x1][0];
      x2 = [y2, y2 = x2][0];
    }
    this.moveTo( x1, y1 );
    this.lineTo( x2, y2 );
    return this;
  };

  // ==========================================================================
  // Launch rendering
  // ==========================================================================
  $.render = {};
  $.render.launch = function(){
    console.debug( 'PIANO.render.launch()' );

    $.render.reset( 28, 28+36, 0, 16 );
    $.render.background();
    $.render.rows();
    $.render.paint();

    return $.render;
  }


  // ==========================================================================
  // Reset the canvas parameters for rendering
  // ==========================================================================
  $.render.reset = function( note_start, note_stop, time_start, time_stop ){
    console.debug( 'PIANO.render.reset()' );

    // Reset dimensions
    $.sequencer.el.width  = $.sequencer.width  = $.sequencer.wrapper.clientWidth;
    $.sequencer.el.height = $.sequencer.height = $.sequencer.wrapper.clientHeight;
    $.sequencer.el.style.width  = $.sequencer.width  + 'px';
    $.sequencer.el.style.height = $.sequencer.height + 'px';

    // Reset window limits
    $.sequencer.time_start = time_start;
    $.sequencer.time_stop  = time_stop;
    $.sequencer.note_start = note_start;
    $.sequencer.note_stop  = note_stop;

    console.debug( $.sequencer.width, $.sequencer.height );

    // Return the .render submodule for fluent chaining
    return $.render;
  }
  

  // ==========================================================================
  // Fill the background
  // ==========================================================================
  $.render.background = function() {
    console.debug( 'PIANO.render.background()' );

    $.sequencer.canvas.fillStyle = "#EEEEEE";
    $.sequencer.canvas.fillRect( 0, 0, $.sequencer.width, $.sequencer.height );

    // Return the .render submodule for fluent chaining
    return $.render;
  }


  // ==========================================================================
  // Draw the rows (note-scale)
  // ==========================================================================
  $.render.rows = function() {
    console.debug( 'PIANO.render.rows()' );

    $.sequencer.canvas.lineWidth = 1.0;
    $.sequencer.canvas.strokeStyle = "#D4D4D4";
    $.sequencer.canvas.fillStyle = "#DDDDDD";

    // Top edge
    $.sequencer.canvas.drawLine( 0, 0.5, $.sequencer.width, 0.5 );  // Remember the half pixel for clean strokes!

    // Each edge + black key fills
    for( var y = 1; y <= $.sequencer.note_range(); y++ )
    {
      var y_edge   = closest_half_pixel(  y    / $.sequencer.note_range() * $.sequencer.height );
      var y_0_edge = closest_half_pixel( (y-1) / $.sequencer.note_range() * $.sequencer.height );

      // Fill the row for the black keys
      switch( y % 12 )
      {
        case 2: case 4: case 7: case 9: case 11:
          $.sequencer.canvas.fillRect( 0, y_edge, $.sequencer.width, y_0_edge - y_edge );
        default:
          // do nothing...
      }

      // Edge between rows
      $.sequencer.canvas.drawLine( 0, y_edge, $.sequencer.width, y_edge );
    }

    // Return the .render submodule for fluent chaining
    return $.render;
  }


  // ==========================================================================
  // Draw the columns (time-scale)
  // ==========================================================================
  // ...


  // ==========================================================================
  // Finish the rendering
  // ==========================================================================
  $.render.paint = function() {
    console.debug( 'PIANO.render.paint()' );

    $.sequencer.canvas.stroke();
  }


  return $;

})(PIANO || {});

PIANO.render.launch();


/* In 2D vector graphics, single-pixel stroke width must be drawn at a half-pixel position,
 * otherwise it gets split across 2 pixels and appears blurred.
 */
function closest_half_pixel( input_pixel )
{
  return parseInt( 0.5 + input_pixel ) - 0.5; // parseInt is a hack for efficient rounding
}

/* Converts a y axis pixel position to 
 */
function y_position_to_note( input_pixel )
{
  return Math.ceil( input_pixel / $.config.keyboard_range );
}