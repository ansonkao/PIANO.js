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
      pianoRollStack.push( new PianoRoll( container, params ) );
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
    this.keyboardSize  = 88;    // 88 keys in a piano
    this.clipLength    = 64;    // ...in bars. 2.125 means 2 bars and 1/8th note long
    this.width         = null;
    this.height        = null;
    this.timeScale     = { min: 0.500
                         , max: 1.000
                         };
    this.keyScale      = { min: 0.000
                         , max: 1.000
                         };
    this.notes         = params.notes || [];
    this.isDragging    = false;
    this.isHovering    = false;


    // ------------------------------------------------------------------------
    // Methods
    // ------------------------------------------------------------------------
    // Sequencer Coordinates - Helper Methods
    this.getTimeRange = function(){ return this.timeScale.max - this.timeScale.min; };
    this.getKeyRange  = function(){ return this.keyScale.max  - this.keyScale.min;  };
    this.percentToKey = function(percent){ return Math.ceil( percent * this.keyboardSize ); }; // Where percent is between 0.000 and 1.000
    this.percentToBar = function(percent){ return Math.ceil( percent * this.clipLength   ); }; // Where percent is between 0.000 and 1.000

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
      };
    
    // Render the entire canvas
    this.renderAll = function()
      {
        this.canvasContext.clear();
        this.canvasContext.backgroundFill('#EEEEEE');
        this.renderKeyScale();
        this.renderTimeScale();
        this.renderNotes( this.notes );
      };
    
    // Render the staff (black and white rows)
    this.renderKeyScale = function()
      {
        // Styles
        this.canvasContext.lineWidth   = 1.0;
        this.canvasContext.strokeStyle = "#D4D4E0";
        this.canvasContext.fillStyle   = "#DDDDE4";

        // Each edge + black key fills
        for( var key  = this.percentToKey( this.keyScale.min )
           ;     key <= this.percentToKey( this.keyScale.max )
           ;     key++
           )
        {
          var prevEdge = Math.closestHalfPixel( ( ( (key-1) / this.keyboardSize ) - this.keyScale.min ) / this.getKeyRange() * this.height );
          var nextEdge = Math.closestHalfPixel( ( (  key    / this.keyboardSize ) - this.keyScale.min ) / this.getKeyRange() * this.height );

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
           ;     bar <  this.percentToBar( this.timeScale.max )
           ;     bar += 0.25
           )
        {
          // Start each line as a separate path (different colors)
          this.canvasContext.beginPath();
          this.canvasContext.strokeStyle = ( bar % 1 ) ? "#CCD" : "#AAB";

          var xPosition = Math.closestHalfPixel( ( ( bar / this.clipLength ) - this.timeScale.min ) / this.getTimeRange() * this.width );
          this.canvasContext.drawLine( xPosition, 0, xPosition, this.height );

          // Draw each line (different colors)
          this.canvasContext.stroke();
        }
      };

    // Draw the Notes in
    this.renderNotes = function(notes)
      {
        // Styles
        this.canvasContext.beginPath();
        this.canvasContext.lineWidth   = 1.0;
        this.canvasContext.strokeStyle = "#812";
        this.canvasContext.fillStyle   = "#F24";

        for( var i = 0; i < notes.length; i++ )
        {
          var x1 = Math.closestHalfPixel( ( (   notes[i].position                  / this.clipLength   ) - this.timeScale.min ) / this.getTimeRange() * this.width  );
          var y1 = Math.closestHalfPixel( ( ( ( this.keyboardSize - notes[i].key ) / this.keyboardSize ) - this.keyScale.min  ) / this.getKeyRange()  * this.height );
          var x2 = Math.closestHalfPixel( ( ( ( notes[i].position + notes[i].length   ) / this.clipLength   ) - this.timeScale.min ) / this.getTimeRange() * this.width  );
          var y2 = Math.closestHalfPixel( ( ( ( this.keyboardSize - notes[i].key  + 1 ) / this.keyboardSize ) - this.keyScale.min  ) / this.getKeyRange()  * this.height );
          this.canvasContext.fillRect  ( x1 + 1, y1 + 2, x2 - x1 - 3, y2 - y1 - 4 );
          this.canvasContext.strokeRect( x1 + 0, y1 + 1, x2 - x1 - 1, y2 - y1 - 2 );
        }

        // Stroke it all at the end!
        this.canvasContext.stroke();
      };

    this.renderSelectionBox = function(startEvent, endEvent)
      {
        this.canvasContext.beginPath();
        this.canvasContext.lineWidth   = 1.0;
        this.canvasContext.strokeStyle = "#000";
        this.canvasContext.setLineDash([2,4]);
        this.canvasContext.strokeRect
          ( Math.closestHalfPixel( startEvent.clientX - this.canvas.clientXYDirectional('x') )
          , Math.closestHalfPixel( startEvent.clientY - this.canvas.clientXYDirectional('y') )
          , Math.round( endEvent.clientX - startEvent.clientX )
          , Math.round( endEvent.clientY - startEvent.clientY )
          );
        this.canvasContext.stroke();
        this.canvasContext.setLineDash([]);
      };

    // ------------------------------------------------------------------------
    // Construction of each PianoRoll instance
    // ------------------------------------------------------------------------
    // Initialize!
    var that = this;
        that.init();

    // Reinitialize dimensions up on resize
    window.addEventListener('resize', function (e){
      that.init();
    });

    // Redraw upon scroll
    container.addEventListener('gripscroll-update', function (e){
      switch( e.direction )
      {
        case 'x': that.timeScale.min = e.min; that.timeScale.max = e.max; break;
        case 'y': that.keyScale.min  = e.min; that.keyScale.max  = e.max; break;
      }
      that.renderAll();
    });

    // ------------------------------------------------------------------------
    // Drag and Drop of grips
    // ------------------------------------------------------------------------
    var startEvent = null;
    DragKing.addHandler(
      // targetElement
      that.canvas,
      // gripHandler
      function(e)
      {
        that.isDragging = true;
        startEvent = e;
      },
      // dragHandler
      function(e)
      {
        that.renderAll();
        that.renderSelectionBox(startEvent, e);
      },
      // dropHandler
      function(e)
      {
        that.isDragging = false;
        that.renderAll();
      }
    );

    // ------------------------------------------------------------------------
    // Hovering / Cursor management
    // ------------------------------------------------------------------------
    // ...
  }
  //
  // End of PianoRoll definition
  // ==========================================================================

  // Return the public singleton methods
  return { add: add
         };

})();