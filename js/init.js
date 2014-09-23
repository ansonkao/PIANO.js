var PIANO = (function(){

  var containerStack = [];
  var pianoRollStack = [];

  /* Initializes a new PianoRoll around the specified container
   */
  var add = function(container, params)
    {
      // If this container was already added previously, skip
      for( var i = 0; i < containerStack.length; i++ )
      {
        if( containerStack[i] == container )
          return;
      }

      // Okay let's add it
      containerStack.push( container );
      pianoRollStack.push(
          { x: new PianoRoll( container, params )
          , y: new PianoRoll( container, params )
          }
        );
    };

  // ==========================================================================
  // PianoRoll definition
  // ==========================================================================
  /* A canvas which renders the appearance of a piano-roll/note-sequencer,
   * and handles mouse interactions.
   */
  function PianoRoll(container, params)
  {
    // ------------------------------------------------------------------------
    // Members
    // ------------------------------------------------------------------------
    // DOM element references
    this.canvas = container.appendChild( document.createElement('canvas') );
    this.canvas.className = 'piano-canvas';
    this.canvasContext = this.canvas.getContext("2d");

    // Model
    this.keyboardRange = 88;
    this.clipLength    = 
    this.width         = null;
    this.height        = null;
    this.timeScale     = { min: 0.000
                         , max: 1.000
                         };
    this.noteScale     = { min: 0.500
                         , max: 1.000
                         };


    // ------------------------------------------------------------------------
    // Methods
    // ------------------------------------------------------------------------
    // Sequencer Coordinates - Helper Methods
    this.getTimeRange  = function(){ return this.timeScale.max - this.timeScale.min; };
    this.getNoteRange  = function(){ return this.noteScale.max - this.noteScale.min; };
    this.percentToNote = function(percent){ return Math.ceil( percent * this.keyboardRange ); }; // Where percent is between 0.000 and 1.000


    // Reset the canvas parameters and redraw it!
    this.init = function()
      {
        // Reset dimensions
        this.canvas.width  = this.width  = container.clientWidth;
        this.canvas.height = this.height = container.clientHeight;

        //this.canvas.style.width  = this.width  + 'px';
        //this.canvas.style.height = this.height + 'px';

          /* ^ clientWidth/clientHeight return rounded integer value from the parent
           * wrapper. If we use getBoundingClientRect() instead, we'll get non-integer
           * values and the discrepancy will lead to sub-pixel blending and fuzzy lines.
           */ 

        this.canvasContext.clear();
        this.canvasContext.backgroundFill('#EEEEEE');
        this.renderNoteScale();
      };
    
    // Render the note-scale (black and white rows)
    this.renderNoteScale = function()
      {
        // Styles
        this.canvasContext.lineWidth   = 1.0;
        this.canvasContext.strokeStyle = "#D4D4D4";
        this.canvasContext.fillStyle   = "#DDDDDD";

        // Each edge + black key fills
        for( var note  = this.percentToNote( this.noteScale.min )
           ;     note <= this.percentToNote( this.noteScale.max )
           ;     note++
           )
        {
          var prev_edge = Math.closestHalfPixel( ( ( (note-1) / this.keyboardRange ) - this.noteScale.min ) / this.getNoteRange() * this.height );
          var next_edge = Math.closestHalfPixel( ( (  note    / this.keyboardRange ) - this.noteScale.min ) / this.getNoteRange() * this.height );

          // Stroke the edge between rows
          if( prev_edge > 0.5 ) // Skip first edge (we have a border to serve that purpose)
            this.canvasContext.drawLine( 0, prev_edge, this.width, prev_edge, this.xyFlip );

          // Fill the row for the black keys
          if( note % 12 in {3:true, 5:true, 7:true, 10:true, 0:true} )
            this.canvasContext.fillRect( 0, next_edge, this.width, prev_edge - next_edge );
        }

        this.canvasContext.stroke();
      };


    // Draw the columns (time-scale)
    // ...

    // ------------------------------------------------------------------------
    // Construction of each PianoRoll instance
    // ------------------------------------------------------------------------
    // Initialize!
    var that = this;
        that.init();
    that.init();
    container.addEventListener('gripscroll-update', function (e){
      switch( e.direction )
      {
        case 'x': that.timeScale.min = e.min; that.timeScale.max = e.max; break;
        case 'y': that.noteScale.min = e.min; that.noteScale.max = e.max; break;
      }
      that.init();
    });

  }
  //
  // End of PianoRoll definition
  // ==========================================================================

  // Return the public singleton methods
  return { add: add
         };

})();