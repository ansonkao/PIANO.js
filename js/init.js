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
    this.keyboardRange = 25;    // 88 keys in a piano
    this.clipLength    = 4;     // ...in bars. 2.125 means 2 bars and 1/8th note long
    this.width         = null;
    this.height        = null;
    this.timeScale     = { min: 0.000
                         , max: 1.000
                         };
    this.keyScale      = { min: 0.500
                         , max: 1.000
                         };


    // ------------------------------------------------------------------------
    // Methods
    // ------------------------------------------------------------------------
    // Sequencer Coordinates - Helper Methods
    this.getTimeRange = function(){ return this.timeScale.max - this.timeScale.min; };
    this.getKeyRange  = function(){ return this.keyScale.max  - this.keyScale.min;  };
    this.percentToKey = function(percent){ return Math.ceil( percent * this.keyboardRange ); }; // Where percent is between 0.000 and 1.000
    this.percentToBar = function(percent){ return Math.ceil( percent * this.clipLength    ); }; // Where percent is between 0.000 and 1.000

    // Reset the canvas parameters and redraw it!
    this.init = function()
      {
        // Reset dimensions
        this.canvas.width  = this.width  = container.clientWidth;
        this.canvas.height = this.height = container.clientHeight;
          /* ^ clientWidth/clientHeight return rounded integer value from the parent
           * wrapper. If we use getBoundingClientRect() instead, we'll get non-integer
           * values and the discrepancy will lead to sub-pixel blending and fuzzy lines.
           */ 

        this.canvasContext.clear();
        this.canvasContext.backgroundFill('#EEEEEE');
        this.renderKeyScale();
        this.renderTimeScale();
      };
    
    // Render the staff (black and white rows)
    this.renderKeyScale = function()
      {
        // Styles
        this.canvasContext.lineWidth   = 1.0;
        this.canvasContext.strokeStyle = "#D4D4D4";
        this.canvasContext.fillStyle   = "#DDDDDD";

        // Each edge + black key fills
        for( var key  = this.percentToKey( this.keyScale.min )
           ;     key <= this.percentToKey( this.keyScale.max )
           ;     key++
           )
        {
          var prevEdge = Math.closestHalfPixel( ( ( (key-1) / this.keyboardRange ) - this.keyScale.min ) / this.getKeyRange() * this.height );
          var nextEdge = Math.closestHalfPixel( ( (  key    / this.keyboardRange ) - this.keyScale.min ) / this.getKeyRange() * this.height );

          // Stroke the edge between rows
          if( prevEdge > 0.5 ) // Skip first edge (we have a border to serve that purpose)
            this.canvasContext.drawLine( 0, prevEdge, this.width, prevEdge, this.xyFlip );

          // Fill the row for the black keys
          if( key % 12 in {3:true, 5:true, 7:true, 10:true, 0:true} )
            this.canvasContext.fillRect( 0, nextEdge, this.width, prevEdge - nextEdge );
        }

        // Stroke it all at the end!
        this.canvasContext.stroke();
      };

    // Draw the columns (time-scale)
    this.renderTimeScale = function()
      {
        // Styles
        this.canvasContext.lineWidth   = 1.0;

        // Draw lines for each beat
        for( var bar  = this.percentToBar( this.timeScale.min ) - 1
           ;     bar <= this.percentToBar( this.timeScale.max )
           ;     bar += 0.25
           )
        {
          // Start each line as a separate path (different colors)
          this.canvasContext.beginPath();
          this.canvasContext.strokeStyle = ( bar % 1 ) ? "#CCC" : "#AAA";

          var xPosition = Math.closestHalfPixel( ( ( bar / this.clipLength ) - this.timeScale.min ) / this.getTimeRange() * this.width );
          this.canvasContext.drawLine( xPosition, 0, xPosition, this.height );

          // Draw each line (different colors)
          this.canvasContext.stroke();
        }
      };

    // Draw the Notes in

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
        case 'y': that.keyScale.min  = e.min; that.keyScale.max  = e.max; break;
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