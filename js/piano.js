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
    this.container     = container;
    this.canvas        = container.appendChild( document.createElement('canvas') );
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
    this.notes = {};
    this.notes.saved   = params.notes || [];
    this.notes.active  = [];

    this.isDragging    = false;
    this.isHovering    = false;

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
      that.timeScale.min = e.gripScrollX.min;
      that.timeScale.max = e.gripScrollX.max;
      that.keyScale.min  = e.gripScrollY.min;
      that.keyScale.max  = e.gripScrollY.max;

      that.renderFreshGrid();
      that.renderNotes();
    });

    // ------------------------------------------------------------------------
    // Drag and Drop of grips
    // ------------------------------------------------------------------------
    var startEvent = null;
    var gripHandler = function (e)
      {
        startEvent = e;

        // Figure out which note (if any) is being gripped?
        var timePosition = that.xCoordToBar( e.clientX - that.canvas.clientXYDirectional('x') );
        var  keyPosition = that.yCoordToKey( e.clientY - that.canvas.clientXYDirectional('y') );
        var  activeNote  = that.getHoveredNote(timePosition, keyPosition);
        that.isDragging  = that.getHoverAction(timePosition, activeNote);
        that.setActiveNotes(activeNote, key.shift);

        // Set the cursor if necessary
        if( that.isDragging == 'mid' ) CurseWords.setExplicitCursor('grabbing');
      };
    var dragHandler = function (e)
      {
        that.renderFreshGrid();

        // Decide how to draw notes based on what action is currently occurring
        var noteChanges = {};
        var showSelectionBox = false;
        switch( that.isDragging )
        {
          case 'mid':
            noteChanges.keyDelta   = that.pixelsToKey( e.clientY - startEvent.clientY );
            noteChanges.startDelta = that.pixelsToBar( e.clientX - startEvent.clientX );
            noteChanges.endDelta   = noteChanges.startDelta
            break;
          case 'min':
            noteChanges.startDelta = that.pixelsToBar( e.clientX - startEvent.clientX );
            break;
          case 'max':
            noteChanges.endDelta   = that.pixelsToBar( e.clientX - startEvent.clientX );
            break;
          default:
            showSelectionBox = true; 
        }

        // Draw the notes accordingly
        that.renderNotes(noteChanges);
        if( showSelectionBox )
          that.renderSelectionBox(startEvent, e);
      };
    var dropHandler = function (e)
      {
        // Determine the final changes to the notes
        var noteChanges = {};
        switch( that.isDragging )
        {
          case 'mid':
            noteChanges.keyDelta   = that.pixelsToKey( e.clientY - startEvent.clientY );
            noteChanges.startDelta = that.pixelsToBar( e.clientX - startEvent.clientX );
            noteChanges.endDelta   = noteChanges.startDelta;
            break;
          case 'min':
            noteChanges.startDelta = that.pixelsToBar( e.clientX - startEvent.clientX );
            break;
          case 'max':
            noteChanges.endDelta   = that.pixelsToBar( e.clientX - startEvent.clientX );
            break;
          default:
            // Do nothing...
        }

        // Update the state
        that.isDragging = false;
        that.applyChangesToActiveNotes(noteChanges);
        that.renderFreshGrid();
        that.renderNotes();
        CurseWords.clearExplicitCursor();
      };
    DragKing.addHandler( that.canvas, gripHandler, dragHandler, dropHandler );

    // ------------------------------------------------------------------------
    // Hovering / Cursor management
    // ------------------------------------------------------------------------
    var enterHandler = function (e)
      {
        // This line below is useless at the moment... TODO
        that.isHovering = true;
      };
    var hoverHandler = function (e)
      {
        if( that.isDragging )
          return null;

        // Figure out which note is hovered over (if any)?
        var timePosition = that.xCoordToBar( e.clientX - that.canvas.clientXYDirectional('x') );
        var  keyPosition = that.yCoordToKey( e.clientY - that.canvas.clientXYDirectional('y') );
        var  hoveredNote = that.getHoveredNote(timePosition, keyPosition)
        var  hoverAction = that.getHoverAction(timePosition, hoveredNote);

        // Repaint with the hover state
        that.renderFreshGrid();
        that.renderNotes();

        // Set the cursor
        var newCursor = null;
        switch( hoverAction )
        {
          case 'min': newCursor = 'xresize'; break;
          case 'max': newCursor = 'xresize'; break;
          case 'mid': newCursor = 'grab'   ; break;
             default: newCursor = 'default';
        }
        return newCursor;
      };
    var exitHandler = function (e)
      {
        that.renderFreshGrid();
        that.renderNotes();
      };
    CurseWords.addImplicitCursorHandler( that.canvas, enterHandler, hoverHandler, exitHandler );
  }

  // ------------------------------------------------------------------------
  // Prototype Methods - Coordinates Helpers
  // ------------------------------------------------------------------------
  PianoRoll.prototype.getTimeRange    = function(){ return this.timeScale.max - this.timeScale.min; };
  PianoRoll.prototype.getKeyRange     = function(){ return this.keyScale.max  - this.keyScale.min;  };
  PianoRoll.prototype.percentToKey    = function(percent){ return Math.ceil( percent * this.keyboardSize ); }; // Where percent is between 0.000 and 1.000
  PianoRoll.prototype.percentToBar    = function(percent){ return Math.ceil( percent * this.clipLength   ); }; // Where percent is between 0.000 and 1.000
  PianoRoll.prototype.barToPixels     = function(bar){ return ( ( bar / this.clipLength   )                      ) / this.getTimeRange() * this.width  };
  PianoRoll.prototype.keyToPixels     = function(key){ return ( ( key / this.keyboardSize )                      ) / this.getKeyRange()  * this.height };
  PianoRoll.prototype.barToXCoord     = function(bar){ return ( ( bar / this.clipLength   ) - this.timeScale.min ) / this.getTimeRange() * this.width  };
  PianoRoll.prototype.keyToYCoord     = function(key){ return ( ( key / this.keyboardSize ) - this.keyScale.min  ) / this.getKeyRange()  * this.height };
  PianoRoll.prototype.pixelsToBar     = function(pixels){ return (          ( pixels ) / this.width * this.getTimeRange()                       ) * this.clipLength;   };
  PianoRoll.prototype.pixelsToKey     = function(pixels){ return (  0.0 - ( ( pixels ) / this.height * this.getKeyRange()                     ) ) * this.keyboardSize; };
  PianoRoll.prototype.xCoordToBar     = function(xCoord){ return (          ( xCoord ) / this.width * this.getTimeRange() + this.timeScale.min  ) * this.clipLength;   };
  PianoRoll.prototype.yCoordToKey     = function(yCoord){ return (  1.0 - ( ( yCoord ) / this.height * this.getKeyRange() + this.keyScale.min ) ) * this.keyboardSize; };

  // ------------------------------------------------------------------------
  // Prototype Methods - Interactions
  // ------------------------------------------------------------------------
  // Which note is the cursor currently over?
  PianoRoll.prototype.getHoveredNote  = function(timePositionBars, key)
    {
      var allNotes = this.notes.saved.concat( this.notes.active );
      for( var i = 0; i < allNotes.length; i++ )
        if( timePositionBars >= allNotes[i].start
         && timePositionBars <= allNotes[i].end
         && allNotes[i].key - key < 1
         && allNotes[i].key - key > 0
        )
          return allNotes[i];
      return null;
    };

  // Based on which part of the note the cursor is hovering over, what action are we about to do?
  PianoRoll.prototype.getHoverAction  = function(timePositionBars, hoveredNote)
    { 
      if( ! hoveredNote )
        return 'select';

           if( this.barToPixels(     hoveredNote.end   - hoveredNote.start ) < 15 ) return 'mid';
      else if( this.barToPixels( -1* hoveredNote.start + timePositionBars  ) <  4 ) return 'min';
      else if( this.barToPixels(     hoveredNote.end   - timePositionBars  ) <  4 ) return 'max';
      else                                                                          return 'mid';
    };

  // Set the specified notes as active (being interacted with by the mouse)
  PianoRoll.prototype.setActiveNotes = function(notes, union)
    {
      // If no notes supplied, simply clear and leave
      if( ! notes )
      {
        this.clearActiveNotes();
        return;
      }

      if( ! union ) this.clearActiveNotes();                // Remove the previously active notes
      if( ! Array.isArray(notes) ) notes = [notes];         // Make sure notes is in array form if just 1 note is provided

      // Do the setting of the new notes
      for( var i = 0; i < notes.length; i++ )               
      {
        // Add the new active notes, ONLY if it isn't already there
        if( this.notes.active.indexOf( notes[i] ) == -1 )
          this.notes.active.push( notes[i] );

        // Remove the note from the saved stack, ONLY if it isn't already removed
        var noteInSaved = this.notes.saved.indexOf( notes[i] )  
        if( noteInSaved > -1 )
          this.notes.saved.splice( noteInSaved, 1 );
      }
    };

  // Clear all the active notes (nothing being interacted with by the mouse)
  PianoRoll.prototype.clearActiveNotes = function()
    {
      this.notes.saved = this.notes.saved.concat(this.notes.active); // Put them back in the saved stack first
      this.notes.active = [];
    };

  // Saves changes indicated in the params argument to the currently active notes
  PianoRoll.prototype.applyChangesToActiveNotes = function(params)
    {
      if( ! params ) return;

      for( var i = 0; i < this.notes.active.length; i++ )
      {
        if( params.startDelta ) this.notes.active[i].start += params.startDelta;
        if( params.keyDelta   ) this.notes.active[i].key   += params.keyDelta;
        if( params.endDelta   ) this.notes.active[i].end   += params.endDelta;

        this.quantizeNote( this.notes.active[i] );
      }
    };

  PianoRoll.prototype.quantizeNote = function(note)
    {
      note.key   = Math.round( note.key       );
      note.start = Math.round( note.start * 8 ) * 0.125;
      note.end   = Math.round( note.end   * 8 ) * 0.125;
      return note;
    };

  // ------------------------------------------------------------------------
  // Prototype Methods - Rendering
  // ------------------------------------------------------------------------
  // Reset the canvas parameters
  PianoRoll.prototype.init = function()
    {
      // Reset dimensions
      this.canvas.width  = this.width  = this.container.clientWidth;
      this.canvas.height = this.height = this.container.clientHeight;
        /* ^ clientWidth/clientHeight return rounded integer value from the parent
         * wrapper. If we use getBoundingClientRect() instead, we'll get non-integer
         * values and the discrepancy will lead to sub-pixel blending and fuzzy lines.
         */ 
    };
  
  // Render the entire canvas
  PianoRoll.prototype.renderFreshGrid = function()
    {
      this.canvasContext.clear();
      this.canvasContext.backgroundFill('#EEEEEE');
      this.renderKeyScale();
      this.renderTimeScale();
    };
  
  // Render the staff (black and white rows)
  PianoRoll.prototype.renderKeyScale = function()
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
        var prevEdge = Math.closestHalfPixel( this.keyToYCoord( key - 1 ) );
        var nextEdge = Math.closestHalfPixel( this.keyToYCoord( key     ) );

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
  PianoRoll.prototype.renderTimeScale = function()
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

        var xPosition = Math.closestHalfPixel( this.barToXCoord( bar ) );
        this.canvasContext.drawLine( xPosition, 0, xPosition, this.height );

        // Draw each line (different colors)
        this.canvasContext.stroke();
      }
    };

  // Draw ALL the Notes in
  PianoRoll.prototype.renderNotes = function(params)
    {
      // Saved notes
      this.canvasContext.beginPath();
      this.canvasContext.lineWidth   = 1.0;
      this.canvasContext.strokeStyle = "#812";
      this.canvasContext.fillStyle   = "#F24";
      for( var i = 0; i < this.notes.saved.length; i++ )
        this.renderSingleNote( this.notes.saved[i] );
      this.canvasContext.stroke();

      // Selected notes
      this.canvasContext.beginPath();
      this.canvasContext.lineWidth   = 1.0;
      this.canvasContext.strokeStyle = "#401";
      this.canvasContext.fillStyle   = "#812";
      for( var j = 0; j < this.notes.active.length; j++ )
      {
        var previewNote = {};
            previewNote.start = params && params.startDelta ? this.notes.active[j].start + params.startDelta : this.notes.active[j].start;
            previewNote.key   = params && params.keyDelta   ? this.notes.active[j].key   + params.keyDelta   : this.notes.active[j].key;
            previewNote.end   = params && params.endDelta   ? this.notes.active[j].end   + params.endDelta   : this.notes.active[j].end;
        this.quantizeNote(previewNote);
        this.renderSingleNote(previewNote);
      }
      this.canvasContext.stroke();
    };

  // Render a single note, using the closestHalfPixel helper to avoid aliasing
  PianoRoll.prototype.renderSingleNote = function(note)
    {
      var x1 = Math.closestHalfPixel( this.barToXCoord( note.start ) );
      var x2 = Math.closestHalfPixel( this.barToXCoord( note.end   ) );
      var y1 = Math.closestHalfPixel( this.keyToYCoord( this.keyboardSize - note.key ) );
      var y2 = Math.closestHalfPixel( this.keyToYCoord( this.keyboardSize - note.key  + 1 ) );
      this.canvasContext.fillRect  ( x1 + 1, y1 + 2, x2 - x1 - 3, y2 - y1 - 4 );
      this.canvasContext.strokeRect( x1 + 0, y1 + 1, x2 - x1 - 1, y2 - y1 - 2 );
    };

  // The selection box that appears when you click drag with the mouse
  PianoRoll.prototype.renderSelectionBox = function(startEvent, endEvent)
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
  //
  // End of PianoRoll definition
  // ==========================================================================

  // Return the public singleton methods
  return { add: add
         };

})();