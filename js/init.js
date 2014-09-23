var PIANO = (function($){

  // ==========================================================================
  // Config
  // ==========================================================================
  $.config = $.config || {};
  $.config.keyboard_range = 88;
  $.config.xy_flip = false;


  // ==========================================================================
  // Functions
  // ==========================================================================
  $.fn = {};

  // In 2D vector graphics, single-pixel stroke width must be drawn at a half-pixel position, otherwise it gets sub-pixel blurring
  $.fn.closestHalfPixel = function( pixels ){
    return parseInt( 0.5 + pixels ) - 0.5; // parseInt is a hack for efficient rounding
  };
  // http://stackoverflow.com/questions/384286/javascript-isdom-how-do-you-check-if-a-javascript-object-is-a-dom-object
  $.fn.isDomElement = function( el ){
    return ( typeof HTMLElement === "object"
           ? el instanceof HTMLElement
           : el && typeof el === "object" && el !== null && el.nodeType === 1 && typeof el.nodeName==="string"
           );
  };

  // Canvas Drawing - Custom Helper Methods
  CanvasRenderingContext2D.prototype.drawLine = function( x1, y1, x2, y2 ){
    if( $.config.xy_flip )
    {
      x1 = [y1, y1 = x1][0];
      x2 = [y2, y2 = x2][0];
    }
    this.moveTo( x1, y1 );
    this.lineTo( x2, y2 );
  };

  // Sequencer Coordinates - Helper Methods
  $.sequencer = {};
  $.sequencer.timeRange = function(){ return $.sequencer.timeStop - $.sequencer.timeStart; };
  $.sequencer.noteRange = function(){ return $.sequencer.noteStop - $.sequencer.noteStart; };
  $.sequencer.percent2note = function( percent ){ return Math.ceil( percent * $.config.keyboard_range ); }; // Where percent is between 0.000 and 1.000


  // ==========================================================================
  // Initialize
  // ==========================================================================
  $.init = function( el ){
    console.debug( 'PIANO.init()' );

    // Make sure we have a valid starting point
    if( ! $.fn.isDomElement(el) )
    {
      console.error( 'PIANO.init() FAILED - Invalid starting DOM element.' );
      return;
    }

    $.sequencer.wrapper = el;
    $.sequencer.wrapper.classList.add('piano-wrapper');
    $.sequencer.el = $.sequencer.wrapper.appendChild( document.createElement('canvas') );
    $.sequencer.el.className = 'piano-staff';
    $.sequencer.canvas = $.sequencer.el.getContext("2d");

    $.render.launch();
  };


  // ==========================================================================
  // Launch rendering
  // ==========================================================================
  $.render = {};
  $.render.launch = function(){
    console.debug( 'PIANO.render.launch()' );

    $.render.reset( 0, 1, 0.500, 0.750 );
    $.render.background();
    $.render.note_scale();
    $.render.paint();
  };


  // ==========================================================================
  // Reset the canvas parameters for rendering
  // ==========================================================================
  $.render.reset = function( timeStart, timeStop, noteStart, noteStop ){
    console.debug( 'PIANO.render.reset()' );

    // Reset dimensions
    $.sequencer.el.width  = $.sequencer.width  = $.sequencer.wrapper.clientWidth;
    $.sequencer.el.height = $.sequencer.height = $.sequencer.wrapper.clientHeight;
    $.sequencer.el.style.width  = $.sequencer.width  + 'px';
    $.sequencer.el.style.height = $.sequencer.height + 'px';
      /* ^ clientWidth/clientHeight return rounded integer value from the parent
       * wrapper. If we use getBoundingClientRect() instead, we'll get non-integer
       * values and the discrepancy will lead to sub-pixel blending and fuzzy lines.
       */ 

    // Reset window limits
    $.sequencer.timeStart = timeStart;
    $.sequencer.timeStop  = timeStop;
    $.sequencer.noteStart = noteStart;
    $.sequencer.noteStop  = noteStop;
  };
  

  // ==========================================================================
  // Fill the background
  // ==========================================================================
  $.render.background = function() {
    console.debug( 'PIANO.render.background()' );

    $.sequencer.canvas.fillStyle = "#EEEEEE";
    $.sequencer.canvas.fillRect( 0, 0, $.sequencer.width, $.sequencer.height );
  };


  // ==========================================================================
  // Draw the note-scale
  // ==========================================================================
  $.render.note_scale = function() {
    console.debug( 'PIANO.render.note_scale()' );

    // Styles
    $.sequencer.canvas.lineWidth = 1.0;
    $.sequencer.canvas.strokeStyle = "#D4D4D4";
    $.sequencer.canvas.fillStyle = "#DDDDDD";

    // Each edge + black key fills
    for( var note  = $.sequencer.percent2note( $.sequencer.noteStart )
       ;     note <= $.sequencer.percent2note( $.sequencer.noteStop )
       ;     note++
       )
    {
      var prev_edge = $.fn.closestHalfPixel( ( ( (note-1) / $.config.keyboard_range ) - $.sequencer.noteStart ) / $.sequencer.noteRange() * $.sequencer.height );
      var next_edge = $.fn.closestHalfPixel( ( (  note    / $.config.keyboard_range ) - $.sequencer.noteStart ) / $.sequencer.noteRange() * $.sequencer.height );

      // STROKE the edge between rows
      if( prev_edge > 0.5 ) // Skip first edge (we have a border to serve that purpose)
        $.sequencer.canvas.drawLine( 0, prev_edge, $.sequencer.width, prev_edge );

      // Fill the row for the black keys
      if( note % 12 in {3:true, 5:true, 7:true, 10:true, 0:true} )
          $.sequencer.canvas.fillRect( 0, next_edge, $.sequencer.width, prev_edge - next_edge );
    }
  };


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
  };


  return $;

})(PIANO || {});