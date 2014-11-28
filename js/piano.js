/* Planned refactor to allow only a single PianoRoll:
 * 
 * PianoRoll.init()
 * PianoRoll.setPlayHead()
 * PianoRoll.setNotes()
 */


var PIANO = (function(){

  var $ = { router:     {}
          , controller: {}
          , model:      {}
          , view:       {}
          };

  // ==========================================================================
  // ROUTER
  // ==========================================================================
  $.router.mouseMove  = function(){};
  $.router.mouseHover = function(){};
  $.router.mouseDrag  = function()
    {
      var startEvent  = null;
      var currentNote = null;
      var isDragging  = null;
      var gripHandler = function (e)
        {
          startEvent = e;

          // Figure out which note (if any) is being gripped?
          var timePosition   = $.model.xCoordToBar( e.clientX - $.model.canvas.clientXYDirectional('x') );
          var  keyPosition   = $.model.yCoordToKey( e.clientY - $.model.canvas.clientXYDirectional('y') );
          currentNote        = $.model.getHoveredNote(timePosition, keyPosition);
          $.model.isDragging = $.model.getHoverAction(timePosition, currentNote);

          // Update the currently selected notes
          if( $.model.countActiveNotes() == 0 && isDragging != 'select' // No existing selection, clicked on a new note
           || currentNote && ! currentNote.active                       // Clicked on an inactive note
           || isDragging == 'select' && key.shift == false              // Click+drag without holding shift for unioning to the existing selection
           )
            $.model.setActiveNotes(currentNote, key.shift);

          // Set the cursor if necessary
          switch( $.model.isDragging )
          {
            case 'mid': CurseWords.setExplicitCursor('grabbing'); break;
            case 'min':
            case 'max': CurseWords.setExplicitCursor('xresize');  break;
            case 'select':
            default:
          }

          // Re-render
          $.view.renderFreshGrid();
          $.view.renderNotes();
        };
      var dragHandler = function (e)
        {
          $.view.renderFreshGrid();

          // Decide how to draw notes based on what action is currently occurring
          var noteChanges = {};
          var showSelectionBox = false;
          switch( $.model.isDragging )
          {
            case 'mid':
              noteChanges.keyDelta   = $.model.pixelsToKey( e.clientY - startEvent.clientY );
              noteChanges.startDelta = $.model.pixelsToBar( e.clientX - startEvent.clientX );
              noteChanges.endDelta   = noteChanges.startDelta;
              break;
            case 'min':
              noteChanges.startDelta = $.model.pixelsToBar( e.clientX - startEvent.clientX );
              break;
            case 'max':
              noteChanges.endDelta   = $.model.pixelsToBar( e.clientX - startEvent.clientX );
              break;
            case 'select':
            default:
              showSelectionBox = true;
              $.model.selectNotesInBox( startEvent, e );
          }

          // Draw the notes accordingly
          noteChanges = $.model.snapNoteChanges( noteChanges, currentNote );
          $.view.renderNotes(noteChanges);
          if( showSelectionBox )
            $.view.renderSelectBox(startEvent, e);
        };
      var dropHandler = function (e)
        {
          // Determine the final changes to the notes
          var noteChanges = {};
          switch( isDragging )
          {
            case 'mid':
              noteChanges.keyDelta   = $.model.pixelsToKey( e.clientY - startEvent.clientY );
              noteChanges.startDelta = $.model.pixelsToBar( e.clientX - startEvent.clientX );
              noteChanges.endDelta   = noteChanges.startDelta;
              break;
            case 'min':
              noteChanges.startDelta = $.model.pixelsToBar( e.clientX - startEvent.clientX );
              break;
            case 'max':
              noteChanges.endDelta   = $.model.pixelsToBar( e.clientX - startEvent.clientX );
              break;
            case 'select':
            default:
              $.model.setActiveNotes( $.model.getSelectedNotes(), key.shift );
              $.model.clearSelectedNotes();
          }

          // Update the state
          isDragging = false;
          noteChanges = $.model.snapNoteChanges( noteChanges, currentNote );
          $.model.adjustActiveNotes(noteChanges);
          $.view.renderFreshGrid();
          $.view.renderNotes();
          CurseWords.clearExplicitCursor();
        };
      DragKing.addHandler( $.model.canvas, gripHandler, dragHandler, dropHandler );
    };
  $.router.mouseClick = function(){};
  $.router.keyPress   = function(){};
  $.router.midiEvent  = function(){};
  $.router.gripscroll = function()
    {
      // Update viewport upon scroll
      $.model.container.addEventListener('gripscroll-update', function (e){
        $.controller.setViewport( e.gripScrollX.min, e.gripScrollX.max, e.gripScrollY.min, e.gripScrollY.max );
      });
    };

  // ==========================================================================
  // CONTROLLER
  // ==========================================================================
  $.controller.createNote   = function(){};
  $.controller.modifyNotes  = function(){};
  $.controller.selectArea   = function(){};
  $.controller.setViewport  = function(timeScaleMin, timeScaleMax, keyScaleMin, keyScaleMax)
    {
      // Update Viewport params
      $.model.resize();
      $.model.timeScale.min = timeScaleMin;
      $.model.timeScale.max = timeScaleMax;
      $.model.keyScale.min  = keyScaleMin;
      $.model.keyScale.max  = keyScaleMax;

      // Redraw
      $.view.renderFreshGrid();
      $.view.renderNotes();
    };
  $.controller.setStartHead = function(){};
  $.controller.setPlayHead  = function(){};
  $.controller.setCursor    = function(){};

  // ==========================================================================
  // MODEL
  // ==========================================================================
  $.model.container           = null;
  $.model.canvas              = null;
  $.model.canvasContext       = null;
  $.model.keyboardSize        = 88;    // 88 keys in a piano
  $.model.clipLength          = 16;    // ...in bars. 2.125 means 2 bars and 1/8th note long
  $.model.width               = null;
  $.model.height              = null;
  $.model.timeScale           = { min: 0.500, max: 1.000 };
  $.model.keyScale            = { min: 0.000, max: 1.000 };
  $.model.notes               = null;
  $.model.isDragging          = false;
  $.model.isHovering          = false;
  $.model.initialize          = function(container, params)
    {
      // Canvas
      $.model.container        = container;
      $.model.canvas           = container.appendChild( document.createElement('canvas') );
      $.model.canvas.className = 'piano-canvas';
      $.model.canvasContext    = $.model.canvas.getContext("2d");

      // Notes
      $.model.notes = params.notes;

      // Routes
      $.router.mouseDrag();
      $.router.gripscroll();
    };
  $.model.resize              = function()
    {
      // Reset dimensions
      $.model.canvas.width  = $.model.width  = $.model.container.clientWidth;
      $.model.canvas.height = $.model.height = $.model.container.clientHeight;
        /* ^ clientWidth/clientHeight return rounded integer value from the parent
         * wrapper. If we use getBoundingClientRect() instead, we'll get non-integer
         * values and the discrepancy will lead to sub-pixel blending and fuzzy lines.
         */ 
    };
  $.model.getTimeRange        = function(){ return $.model.timeScale.max - $.model.timeScale.min; };
  $.model.getKeyRange         = function(){ return $.model.keyScale.max  - $.model.keyScale.min;  };
  $.model.percentToKey        = function(percent){ return Math.ceil( percent * $.model.keyboardSize ); }; // Where percent is between 0.000 and 1.000
  $.model.percentToBar        = function(percent){ return Math.ceil( percent * $.model.clipLength   ); }; // Where percent is between 0.000 and 1.000
  $.model.barToPixels         = function(bar){ return ( ( bar / $.model.clipLength   )                         ) / $.model.getTimeRange() * $.model.width  };
  $.model.keyToPixels         = function(key){ return ( ( key / $.model.keyboardSize )                         ) / $.model.getKeyRange()  * $.model.height };
  $.model.barToXCoord         = function(bar){ return ( ( bar / $.model.clipLength   ) - $.model.timeScale.min ) / $.model.getTimeRange() * $.model.width  };
  $.model.keyToYCoord         = function(key){ return ( ( key / $.model.keyboardSize ) - $.model.keyScale.min  ) / $.model.getKeyRange()  * $.model.height };
  $.model.pixelsToBar         = function(pixels){ return (          ( pixels ) / $.model.width * $.model.getTimeRange()                          ) * $.model.clipLength;   };
  $.model.pixelsToKey         = function(pixels){ return (  0.0 - ( ( pixels ) / $.model.height * $.model.getKeyRange()                        ) ) * $.model.keyboardSize; };
  $.model.xCoordToBar         = function(xCoord){ return (          ( xCoord ) / $.model.width * $.model.getTimeRange() + $.model.timeScale.min  ) * $.model.clipLength;   };
  $.model.yCoordToKey         = function(yCoord){ return (  1.0 - ( ( yCoord ) / $.model.height * $.model.getKeyRange() + $.model.keyScale.min ) ) * $.model.keyboardSize; };
  $.model.setActiveNotes      = function(notes, union)
    {
      if( ! notes ) notes = {};
      if( ! union ) $.model.clearActiveNotes();             // Remove the previously active notes
      if( ! Array.isArray(notes) ) notes = [notes];         // Make sure notes is in array form if just 1 note is provided

      // Do the setting of the new notes
      for( var i = 0; i < notes.length; i++ )               
      {
        // Add the new active notes, ONLY if it isn't already there
        if( $.model.notes.indexOf( notes[i] ) == -1 )
          $.model.notes.push( notes[i] );

        // Toggle the state of the note
        notes[i].active = union && !( notes[i].active ) || union == false;
      }
    };
  $.model.adjustActiveNotes   = function(params)
    {
      // Saves changes indicated in the params argument to the currently active notes
      if( ! params ) return;

      for( var i in this.notes )
      {
        // Only apply to active notes
        if( this.notes[i].active )
        {
          if( params.startDelta ) this.notes[i].start += params.startDelta;
          if( params.keyDelta   ) this.notes[i].key   += params.keyDelta;
          if( params.endDelta   ) this.notes[i].end   += params.endDelta;
        }
      }
    };
  $.model.countActiveNotes    = function()
    {
      var total = 0;
      for( var i in $.model.notes )
        if( $.model.notes[i].active )
          total++;
      return total;
    };
  $.model.deleteActiveKeys    = function()
    {
      // Deletes all notes marked as active
      $.model.notes = $.model.notes.filter( function(el){
        return el.active == false;
      });
    };
  $.model.clearActiveNotes    = function()
    {
      // Clear all the active notes (nothing being interacted with by the mouse)
      for( var i in this.notes )
        this.notes[i].active = false;
    };
  $.model.getSelectedNotes    = function()
    {
      return $.model.notes.filter(function(note){
        return note.selected;
      });
    };
  $.model.countSelectedNotes  = function()
    {
      var total = 0;
      for( var i in $.model.notes )
        if( $.model.notes[i].selected )
          total++;
      return total;
    };
  $.model.clearSelectedNotes  = function()
    {
      // Clear all the active notes (nothing being interacted with by the mouse)
      for( var i in this.notes )
        this.notes[i].selected = false;
    };
  $.model.getHoveredNote      = function(timePositionBars, key)
    {
      // Which note is the cursor currently over?
      for( var i = 0; i < $.model.notes.length; i++ )
        if( timePositionBars >= $.model.notes[i].start
         && timePositionBars <= $.model.notes[i].end
         && $.model.notes[i].key - key < 1
         && $.model.notes[i].key - key > 0
        )
          return $.model.notes[i];
      return null;
    };
  $.model.getHoverAction      = function(timePositionBars, hoveredNote)
    { 
      // Based on which part of the note the cursor is hovering over, what action are we about to do?
      if( ! hoveredNote )
        return 'select';

           if( $.model.barToPixels(     hoveredNote.end   - hoveredNote.start ) < 15 ) return 'mid';
      else if( $.model.barToPixels( -1* hoveredNote.start + timePositionBars  ) <  4 ) return 'min';
      else if( $.model.barToPixels(     hoveredNote.end   - timePositionBars  ) <  4 ) return 'max';
      else                                                                             return 'mid';
    };
  $.model.snapNoteChanges     = function(delta, targetNote)
    {
      // Takes a target note and a note delta and adjusts the delta to snap to the closest snap points
      // delta should be an object of the form:  { startDelta: X.XXX, endDelta: Y.YYY, keyDelta: Z.ZZZ }
      // TODO: Make standardized objects for Notes and note deltas.
      if( ! targetNote )
        return delta;

      // Key change is always integer
      delta.keyDelta = Math.round( delta.keyDelta );

      // User can press alt to bypass quantization aka "snap"!
      if( key.alt ) return delta;

      // Both Start/End deltas => note being dragged from mid grip => ensure equal quantization
      if( delta.startDelta && delta.endDelta )
      {
        delta.startDelta = delta.endDelta = this.snapIndividualValue( delta.startDelta, targetNote.start );
        return delta;
      }

      // Individual ends - Snap the start and endpoints to the grid
      if( delta.startDelta ) delta.startDelta = this.snapIndividualValue( delta.startDelta, targetNote.start );
      if( delta.endDelta   ) delta.endDelta   = this.snapIndividualValue( delta.endDelta  , targetNote.end   );
      return delta;
    };
  $.model.snapIndividualValue = function(delta, value)
    {
        // Snap an individual grip either to the next unit distance or to the closes gridline
        var quantizedDelta  = Math.round(          delta  * 8 ) * 0.125; // Snap to the closest 1 unit delta
        var quantizedResult = Math.round( (value + delta) * 8 ) * 0.125; // Snap to the closest gridline

        // Snap to the closest 1 unit delta
        if( Math.abs( quantizedDelta - delta ) < Math.abs( quantizedResult - value - delta ) )
          return quantizedDelta;
        // Snap to the closest gridline
        else
          return quantizedResult - value;
    }
  $.model.selectNotesInBox    = function(startEvent, endEvent)
    {
      // Given a 2 mouse events, set all the notes intersecting the resultant bounding box as selected
      var bar1 = this.xCoordToBar( startEvent.clientX - this.canvas.clientXYDirectional('x') );
      var key1 = this.yCoordToKey( startEvent.clientY - this.canvas.clientXYDirectional('y') );
      var bar2 = this.xCoordToBar(   endEvent.clientX - this.canvas.clientXYDirectional('x') );
      var key2 = this.yCoordToKey(   endEvent.clientY - this.canvas.clientXYDirectional('y') );
      var barMin = bar1 < bar2 ? bar1 : bar2;
      var barMax = bar1 > bar2 ? bar1 : bar2;
      var keyMin = key1 < key2 ? key1 : key2;
      var keyMax = key1 > key2 ? key1 : key2;

      for( var i = 0; i < this.notes.length; i++ )
      {
        if( this.notes[i].start < barMax && this.notes[i].key < keyMax + 1
         && this.notes[i].end   > barMin && this.notes[i].key > keyMin + 0 )
          this.notes[i].selected = true;
        else
          this.notes[i].selected = false;
      }
    };

  // ==========================================================================
  // VIEW
  // ==========================================================================
  $.view.renderFreshGrid  = function()
    {
      // Render a plain pianoroll
      $.model.canvasContext.clear();
      $.model.canvasContext.backgroundFill('#EEEEEE');

      // Render it!
      $.view.renderKeyScale();
      $.view.renderTimeScale();
    };
  $.view.renderKeyScale   = function()
    {
      // Styles
      $.model.canvasContext.lineWidth   = 1.0;
      $.model.canvasContext.setLineDash([]);
      $.model.canvasContext.strokeStyle = "#D4D4E0";
      $.model.canvasContext.fillStyle   = "#DDDDE4";

      // Each edge + black key fills
      for( var key  = $.model.percentToKey( $.model.keyScale.min )
         ;     key <= $.model.percentToKey( $.model.keyScale.max )
         ;     key++
         )
      {
        var prevEdge = Math.closestHalfPixel( $.model.keyToYCoord( key - 1 ) );
        var nextEdge = Math.closestHalfPixel( $.model.keyToYCoord( key     ) );

        // Stroke the edge between rows
        if( prevEdge > 0.5 ) // Skip first edge (we have a border to serve that purpose)
          $.model.canvasContext.drawLine( 0, prevEdge, $.model.width, prevEdge, false );

        // Fill the row for the black keys
        if( key % 12 in {3:true, 5:true, 7:true, 10:true, 0:true} )
          $.model.canvasContext.fillRect( 0, nextEdge, $.model.width, prevEdge - nextEdge );
      }

      // Stroke it all at the end!
      $.model.canvasContext.stroke();
    };
  $.view.renderTimeScale  = function()
    {
      // Styles
      $.model.canvasContext.lineWidth = 1.0;
      key.alt ? $.model.canvasContext.setLineDash([2,4]) : $.model.canvasContext.setLineDash([]);

      // Draw lines for each beat
      for( var bar  = $.model.percentToBar( $.model.timeScale.min ) - 1
         ;     bar <  $.model.percentToBar( $.model.timeScale.max )
         ;     bar += 0.25
         )
      {
        // Start each line as a separate path (different colors)
        $.model.canvasContext.beginPath();
        $.model.canvasContext.strokeStyle = ( bar % 1 ) ? "#CCD" : "#AAB";

        var xPosition = Math.closestHalfPixel( $.model.barToXCoord( bar ) );
        $.model.canvasContext.drawLine( xPosition, 0, xPosition, $.model.height );

        // Draw each line (different colors)
        $.model.canvasContext.stroke();
      }
    };
  $.view.renderNotes      = function(params)
    {
      for( var i in $.model.notes )
      {
        $.model.canvasContext.beginPath();
        $.model.canvasContext.lineWidth   = 1.0;
        $.model.canvasContext.setLineDash([]);

        // Show the impending state of note selection
        if( key.shift && ($.model.notes[i].active ^ $.model.notes[i].selected)
         || (key.shift == false && ($.model.notes[i].selected || $.model.notes[i].active))
          )
        {
          var previewNote = {};
              previewNote.start = params && params.startDelta ? $.model.notes[i].start + params.startDelta : $.model.notes[i].start;
              previewNote.key   = params && params.keyDelta   ? $.model.notes[i].key   + params.keyDelta   : $.model.notes[i].key;
              previewNote.end   = params && params.endDelta   ? $.model.notes[i].end   + params.endDelta   : $.model.notes[i].end;
          $.model.canvasContext.strokeStyle = "#401";
          $.model.canvasContext.fillStyle   = "#812";
          $.view.renderSingleNote( previewNote );
        }
        else
        {
          $.model.canvasContext.strokeStyle = "#812";
          $.model.canvasContext.fillStyle   = "#F24";
          $.view.renderSingleNote( $.model.notes[i] );
        }

        $.model.canvasContext.stroke();
      }
    };
  $.view.renderSingleNote = function(note)
    {
      var x1 = Math.closestHalfPixel( $.model.barToXCoord( note.start ) );
      var x2 = Math.closestHalfPixel( $.model.barToXCoord( note.end   ) );
      var y1 = Math.closestHalfPixel( $.model.keyToYCoord( $.model.keyboardSize - note.key ) );
      var y2 = Math.closestHalfPixel( $.model.keyToYCoord( $.model.keyboardSize - note.key  + 1 ) );
      $.model.canvasContext.fillRect  ( x1 + 1, y1 + 2, x2 - x1 - 3, y2 - y1 - 4 );
      $.model.canvasContext.strokeRect( x1 + 0, y1 + 1, x2 - x1 - 1, y2 - y1 - 2 );
    };
  $.view.renderSelectBox  = function(startEvent,endEvent)
    {
      var x0 = Math.closestHalfPixel( startEvent.clientX - $.model.canvas.clientXYDirectional('x') );
      var y0 = Math.closestHalfPixel( startEvent.clientY - $.model.canvas.clientXYDirectional('y') );
      var width  = Math.round( endEvent.clientX - startEvent.clientX );
      var height = Math.round( endEvent.clientY - startEvent.clientY );
      $.model.canvasContext.beginPath();
      $.model.canvasContext.lineWidth   = 1.0;
    //$.model.canvasContext.setLineDash([1,2]);
    //$.model.canvasContext.lineDashOffset++; // Marching Ants effect
      $.model.canvasContext.strokeStyle = "rgba(0,0,0,0.5)";
      $.model.canvasContext.fillStyle = "rgba(64,64,64,0.125)";
      $.model.canvasContext.fillRect(x0, y0, width, height);
      $.model.canvasContext.strokeRect(x0, y0, width, height);
      $.model.canvasContext.stroke();
      $.model.canvasContext.setLineDash([]);
    };

  return { add: $.model.initialize
         };

})();
/*
  var containerStack = [];
  var pianoRollStack = [];

  // Initializes a new PianoRoll around the specified container
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

  var getNotes = function(container)
    {
      // Find the right set of notes based on the container
      for( var i = 0; i < containerStack.length; i++ )
      {
        if( containerStack[i] == container )
          return pianoRollStack[i].notes;
      }

      // If we get here, the container is not found
      return [];
    };

  key('ctrl+s', function(){ 
    // Loop through each pianoroll
    console.log("NOTES: ");
    for( var i in pianoRollStack )
    {
      for( var j in pianoRollStack[i].notes )
      {
        console.log( '{ key: '  +pianoRollStack[i].notes[j].key              +
                     ', start: '+pianoRollStack[i].notes[j].start.toFixed(3) +
                     ', end: '  +pianoRollStack[i].notes[j].end.toFixed(3)   +' }' );
      }
      console.log( pianoRollStack[i].notes );
    }
    return false;
  });

  // ==========================================================================
  // PianoRoll definition
  // ==========================================================================
  // A canvas which renders the appearance of a piano-roll/note-sequencer,
  // and handles mouse interactions.
  //
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
    this.clipLength    = 16;    // ...in bars. 2.125 means 2 bars and 1/8th note long
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

    // TODO: Snap Threshold (3px etc... used for snap, distinguishing between click and drag and drop)
    // TODO: Gridline Unit (1/4 note, 1/8th note, etc... used for keyboard left/right commands and drawing gridlines)

    // ------------------------------------------------------------------------
    // Construction of each PianoRoll instance
    // ------------------------------------------------------------------------
    // Initialize!
    var that = this;
        that.init();

    // Reinitialize dimensions upon resize
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
    var startEvent  = null;
    var currentNote = null;
    var gripHandler = function (e)
      {
        startEvent = e;

        // Figure out which note (if any) is being gripped?
        var timePosition = that.xCoordToBar( e.clientX - that.canvas.clientXYDirectional('x') );
        var  keyPosition = that.yCoordToKey( e.clientY - that.canvas.clientXYDirectional('y') );
        currentNote      = that.getHoveredNote(timePosition, keyPosition);
        that.isDragging  = that.getHoverAction(timePosition, currentNote);

        // Update the currently selected notes
        if( that.countActiveNotes() == 0 && that.isDragging != 'select' // No existing selection, clicked on a new note
         || currentNote && ! currentNote.active                         // Clicked on an inactive note
         || that.isDragging == 'select' && key.shift == false           // Click+drag without holding shift for unioning to the existing selection
         )
          that.setActiveNotes(currentNote, key.shift);

        // Set the cursor if necessary
        switch( that.isDragging )
        {
          case 'mid': CurseWords.setExplicitCursor('grabbing'); break;
          case 'min':
          case 'max': CurseWords.setExplicitCursor('xresize'); break;
          case 'select':
          default:
        }

        // Re-render
        that.renderFreshGrid();
        that.renderNotes();
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
            noteChanges.endDelta   = noteChanges.startDelta;
            break;
          case 'min':
            noteChanges.startDelta = that.pixelsToBar( e.clientX - startEvent.clientX );
            break;
          case 'max':
            noteChanges.endDelta   = that.pixelsToBar( e.clientX - startEvent.clientX );
            break;
          case 'select':
          default:
            showSelectionBox = true;
            that.selectNotesInBoundingBox( startEvent, e );
        }

        // Draw the notes accordingly
        noteChanges = that.snapNoteChanges( noteChanges, currentNote );
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
          case 'select':
          default:
            that.activateSelectedNotes();
        }

        // Update the state
        that.isDragging = false;
        noteChanges = that.snapNoteChanges( noteChanges, currentNote );
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
  
    // ------------------------------------------------------------------------
    // DoubleClick handling
    // ------------------------------------------------------------------------
    container.addEventListener('dblclick', function(e){
      var timePosition = that.xCoordToBar( e.clientX - that.canvas.clientXYDirectional('x') );
      var  keyPosition = that.yCoordToKey( e.clientY - that.canvas.clientXYDirectional('y') );
      var  activeNote  = that.getHoveredNote(timePosition, keyPosition);

      // If we doubleclicked an existing note, DELETE
      if( activeNote )
        that.notes.splice( that.notes.indexOf( activeNote ), 1 );

      // If we doubleclicked a blank area, CREATE NEW NOTE
      else
      {
        var newNote = {};
            newNote.key   = Math.ceil( keyPosition );
            newNote.start = Math.floor( timePosition * 4 ) * 0.25;
            newNote.end   = Math.ceil(  timePosition * 4 ) * 0.25;
        that.setActiveNotes( newNote );
      }

      // Redraw it all!
      that.renderFreshGrid();
      that.renderNotes();
    });

    // ------------------------------------------------------------------------
    // Hotkeys handling
    // ------------------------------------------------------------------------
    key('del', function(){ 
      that.deleteActiveKeys();
      that.renderFreshGrid();
      that.renderNotes();
      return false;
    });
    key('up', function(){ 
      var noteChanges = {keyDelta: 1};
      that.applyChangesToActiveNotes(noteChanges);
      that.renderFreshGrid();
      that.renderNotes();
      return false;
    });
    key('down', function(){ 
      var noteChanges = {keyDelta: -1};
      that.applyChangesToActiveNotes(noteChanges);
      that.renderFreshGrid();
      that.renderNotes();
      return false;
    });
    key('left', function(){ 
      var noteChanges = {startDelta: -0.25, endDelta: -0.25};
      that.applyChangesToActiveNotes(noteChanges);
      that.renderFreshGrid();
      that.renderNotes();
      return false;
    });
    key('right', function(){ 
      var noteChanges = {startDelta: 0.25, endDelta: 0.25};
      that.applyChangesToActiveNotes(noteChanges);
      that.renderFreshGrid();
      that.renderNotes();
      return false;
    });

    // TODO - this is super buggy...
    //key('alt', function(){
    //  console.log( 'alt' );
    //  that.renderFreshGrid();
    //  that.renderNotes();
    //  return false;
    //});
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
      for( var i = 0; i < this.notes.length; i++ )
        if( timePositionBars >= this.notes[i].start
         && timePositionBars <= this.notes[i].end
         && this.notes[i].key - key < 1
         && this.notes[i].key - key > 0
        )
          return this.notes[i];
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
        if( this.notes.indexOf( notes[i] ) == -1 )
          this.notes.push( notes[i] );

        // Toggle the state of the note
        notes[i].active = !( notes[i].active );
      }
    };

  // Clear all the active notes (nothing being interacted with by the mouse)
  PianoRoll.prototype.clearActiveNotes = function()
    {
      for( var i in this.notes )
        this.notes[i].active = false;
    };

  // Saves changes indicated in the params argument to the currently active notes
  PianoRoll.prototype.applyChangesToActiveNotes = function(params)
    {
      if( ! params ) return;

      for( var i in this.notes )
      {
        // Only apply to active notes
        if( this.notes[i].active )
        {
          if( params.startDelta ) this.notes[i].start += params.startDelta;
          if( params.keyDelta   ) this.notes[i].key   += params.keyDelta;
          if( params.endDelta   ) this.notes[i].end   += params.endDelta;
        }
      }
    };

  // Takes a target note and a note delta and adjusts the delta to snap to the closest snap points
  // delta should be an object of the form:  { startDelta: X.XXX, endDelta: Y.YYY, keyDelta: Z.ZZZ }
  // TODO: Make standardized objects for Notes and note deltas.
  PianoRoll.prototype.snapNoteChanges = function(delta, targetNote)
    {
      if( ! targetNote )
        return delta;

      // Key change is always integer
      delta.keyDelta = Math.round( delta.keyDelta );

      // User can press alt to bypass quantization aka "snap"!
      if( key.alt ) return delta;

      // Both Start/End deltas => note being dragged from mid grip => ensure equal quantization
      if( delta.startDelta && delta.endDelta )
      {
        delta.startDelta = delta.endDelta = this.snapIndividualValue( delta.startDelta, targetNote.start );
        return delta;
      }

      // Individual ends - Snap the start and endpoints to the grid
      if( delta.startDelta ) delta.startDelta = this.snapIndividualValue( delta.startDelta, targetNote.start );
      if( delta.endDelta   ) delta.endDelta   = this.snapIndividualValue( delta.endDelta  , targetNote.end   );
      return delta;
    };

  // Snap an individual grip either to the next unit distance or to the closes gridline
  PianoRoll.prototype.snapIndividualValue = function(delta, value)
    {
        var quantizedDelta  = Math.round(          delta  * 8 ) * 0.125; // Snap to the closest 1 unit delta
        var quantizedResult = Math.round( (value + delta) * 8 ) * 0.125; // Snap to the closest gridline

        // Snap to the closest 1 unit delta
        if( Math.abs( quantizedDelta - delta ) < Math.abs( quantizedResult - value - delta ) )
          return quantizedDelta;
        // Snap to the closest gridline
        else
          return quantizedResult - value;
    }

  // Given a 2 mouse events, set all the notes intersecting the resultant bounding box as selected
  PianoRoll.prototype.selectNotesInBoundingBox = function(startEvent, endEvent)
    {
      var bar1 = this.xCoordToBar( startEvent.clientX - this.canvas.clientXYDirectional('x') );
      var key1 = this.yCoordToKey( startEvent.clientY - this.canvas.clientXYDirectional('y') );
      var bar2 = this.xCoordToBar(   endEvent.clientX - this.canvas.clientXYDirectional('x') );
      var key2 = this.yCoordToKey(   endEvent.clientY - this.canvas.clientXYDirectional('y') );
      var barMin = bar1 < bar2 ? bar1 : bar2;
      var barMax = bar1 > bar2 ? bar1 : bar2;
      var keyMin = key1 < key2 ? key1 : key2;
      var keyMax = key1 > key2 ? key1 : key2;

      for( var i = 0; i < this.notes.length; i++ )
      {
        if( this.notes[i].start < barMax && this.notes[i].key < keyMax + 1
         && this.notes[i].end   > barMin && this.notes[i].key > keyMin + 0 )
          this.notes[i].selected = true;
        else
          this.notes[i].selected = false;
      }
    };

  // Notes that are marked as selected by a drag and drop operation should now either (a) replace the existing active set of notes or (b) exclusively union with the already activated notes (if shift is held down)
  PianoRoll.prototype.activateSelectedNotes = function()
    {
      for( var i = 0; i < this.notes.length; i++ )
      {
        this.notes[i].active = key.shift && (this.notes[i].active ^ this.notes[i].selected) || (key.shift == false && this.notes[i].selected);
        this.notes[i].selected  = false;
      }
    };

  // Counts the total number of notes marked as active
  PianoRoll.prototype.countActiveNotes = function()
    {
      var total = 0;
      for( var i in this.notes )
        if( this.notes[i].active )
          total++;
      return total;
    };

  // Deletes all notes marked as active
  PianoRoll.prototype.deleteActiveKeys = function()
    {
      this.notes = this.notes.filter( function(el){
        return el.active == false;
      });
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
        // ^ clientWidth/clientHeight return rounded integer value from the parent
        // wrapper. If we use getBoundingClientRect() instead, we'll get non-integer
        // values and the discrepancy will lead to sub-pixel blending and fuzzy lines.
        // 
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
      this.canvasContext.setLineDash([]);
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
      key.alt ? this.canvasContext.setLineDash([2,4]) : this.canvasContext.setLineDash([]);

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
      for( var i in this.notes )
      {
        this.canvasContext.beginPath();
        this.canvasContext.lineWidth   = 1.0;
        this.canvasContext.setLineDash([]);

        // Show the impending state of note selection
        if( key.shift && (this.notes[i].active ^ this.notes[i].selected) || (key.shift == false && (this.notes[i].selected || this.notes[i].active)) )
        {
          var previewNote = {};
              previewNote.start = params && params.startDelta ? this.notes[i].start + params.startDelta : this.notes[i].start;
              previewNote.key   = params && params.keyDelta   ? this.notes[i].key   + params.keyDelta   : this.notes[i].key;
              previewNote.end   = params && params.endDelta   ? this.notes[i].end   + params.endDelta   : this.notes[i].end;
          this.canvasContext.strokeStyle = "#401";
          this.canvasContext.fillStyle   = "#812";
          this.renderSingleNote( previewNote );
        }
        else
        {
          this.canvasContext.strokeStyle = "#812";
          this.canvasContext.fillStyle   = "#F24";
          this.renderSingleNote( this.notes[i] );
        }

        this.canvasContext.stroke();
      }
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
      var x0 = Math.closestHalfPixel( startEvent.clientX - this.canvas.clientXYDirectional('x') );
      var y0 = Math.closestHalfPixel( startEvent.clientY - this.canvas.clientXYDirectional('y') );
      var width  = Math.round( endEvent.clientX - startEvent.clientX );
      var height = Math.round( endEvent.clientY - startEvent.clientY );
      this.canvasContext.beginPath();
      this.canvasContext.lineWidth   = 1.0;
    //this.canvasContext.setLineDash([1,2]);
    //this.canvasContext.lineDashOffset++; // Marching Ants effect
      this.canvasContext.strokeStyle = "rgba(0,0,0,0.5)";
      this.canvasContext.fillStyle = "rgba(64,64,64,0.125)";
      this.canvasContext.fillRect(x0, y0, width, height);
      this.canvasContext.strokeRect(x0, y0, width, height);
      this.canvasContext.stroke();
      this.canvasContext.setLineDash([]);
    };
  //
  // End of PianoRoll definition
  // ==========================================================================

  // Return the public singleton methods
  return { add: add
         , getNotes: getNotes
         };

})();
/**/