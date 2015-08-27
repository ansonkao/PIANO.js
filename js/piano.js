/* Planned refactor to allow only a single PianoRoll:
 * 
 * PianoRoll.init()
 * PianoRoll.setPlayHead()
 * PianoRoll.setNotes()
 * 
 * https://github.com/bgrins/TinyColor
 */



var PianoRoll = (function(key){

  'use strict';

  // ==========================================================================
  // CONSTRUCTOR
  // ==========================================================================
  function Roll(container, params)
  {
    // ----------------------------------------------------------------------
    // Data layer initialization (basically a local database)
    this.data = {};

    // Grid
    this.data.keyboardSize        = 88;    // 88 keys in a piano
    this.data.clipLength          = params.clipLength || 8; // ...in bars. 2.125 means 2 bars and 1/8th note long
    this.data.width               = null;
    this.data.height              = null;
    this.data.timeScale           = { min: 0.500, max: 1.000 };
    this.data.keyScale            = { min: 0.000, max: 1.000 };
    this.data.pixelScale          = window.devicePixelRatio || 1;

    // Notes + state
    this.data.notes               = params.notes || [];
    this.data.drag                = { status: false
                                    , action: null
                                    , showSelectionBox: false
                                    , startX: undefined
                                    , startY: undefined
                                    , endX:   undefined
                                    , endY:   undefined
                                    , keyDelta:   0
                                    , startDelta: 0
                                    , endDelta:   0
                                    };
    this.data.maxVelocity         = 127;
    this.data.minVelocity         = 0;
    this.data.velocityRange       = this.data.maxVelocity - this.data.minVelocity;

    // Canvas
    this.data.container        = container;
    this.data.canvas           = container.appendChild( document.createElement('canvas') );
    this.data.canvas.className = 'piano-canvas';
    this.data.canvasContext    = this.data.canvas.getContext("2d");
    this.data.canvasContext.scale( this.data.pixelScale, this.data.pixelScale );

    // ----------------------------------------------------------------------
    // Controller layer initialization
    this.controllerMouseMove();
    this.controllerMouseHover();
    this.controllerMouseDrag();
    this.controllerWindowResize();
    this.controllerKeyPress();
    this.controllerMidiEvent();
    this.controllerGripscroll();

    // ----------------------------------------------------------------------
    // Views layer initialization
    this.viewRenderLoop();
  }
  var $ = Roll.prototype;

  // ==========================================================================
  // CONTROLLER
  // ==========================================================================
  $.controllerMouseMove      = function(){};
  $.controllerMouseHover     = function()
    {
      var that = this;
      var enterHandler = function (e)
        {
          // Start Hover handling....
        };
      var hoverHandler = function (e)
        {
          if( that.data.drag.status )
            return null;

          // Figure out which note is hovered over (if any)?
          var timePosition = that.modelYCoordToBar( e.clientY - that.data.canvas.clientXYDirectional('y') );
          var  keyPosition = that.modelXCoordToKey( e.clientX - that.data.canvas.clientXYDirectional('x') );
          var  hoveredNote = that.modelGetHoveredNote(timePosition, keyPosition);
          var  hoverAction = that.modelGetHoverAction(timePosition, hoveredNote);

          // Set the cursor
          var newCursor = null;
          switch( hoverAction )
          {
            case 'min': newCursor = 'yresize'; break;
            case 'max': newCursor = 'yresize'; break;
            case 'mid': newCursor = 'default'; break;
               default: newCursor = 'default';
          }
          return newCursor;
        };
      var exitHandler  = function (e)
        {
          // Finish Hover handling
        };
      CurseWords.addImplicitCursorHandler( that.data.canvas, enterHandler, hoverHandler, exitHandler );
    };
  $.controllerMouseDrag      = function()
    {
      var that = this;
      var currentNote = null;
      var currentKey  = null;
      var gripHandler = function (e)
        {
          that.data.drag.startX = e.clientX - that.data.canvas.clientXYDirectional('x');
          that.data.drag.startY = e.clientY - that.data.canvas.clientXYDirectional('y');

          // Figure out which note (if any) is being gripped?
          var timePosition    = that.modelYCoordToBar( that.data.drag.startY );
          var  keyPosition    = that.modelXCoordToKey( that.data.drag.startX );
          currentNote         = that.modelGetHoveredNote(timePosition, keyPosition);
          that.data.drag.action = that.modelGetHoverAction(timePosition, currentNote);

          // Set the cursor if necessary
          switch( that.data.drag.action )
          {
            case 'mid': CurseWords.setExplicitCursor('default'); break;
            case 'min':
            case 'max': CurseWords.setExplicitCursor('yresize');  break;
            case 'select':
          }

          // Play a preview sound
          currentKey = Math.ceil( keyPosition );
          Transport.playSingleNote( currentKey, 100 ); // REALLY BAD!!! TIGHTLY COUPLED, BREAK OUT VIA PUB SUB PATTERN
        };
      var dragHandler = function (e)
        {
          that.data.drag.endX = e.clientX - that.data.canvas.clientXYDirectional('x');
          that.data.drag.endY = e.clientY - that.data.canvas.clientXYDirectional('y');

          // Set dragging state only if the cursor actually moves, otherwise it is a click!
          if( Math.abs( that.data.drag.endX - that.data.drag.startX ) > 1 || Math.abs( that.data.drag.endY - that.data.drag.startY ) > 1 )
            that.data.drag.status = true;  // Share that state to the rest of the app - e.g. hover handler

          // If we begun dragging an inactive note, let's activate it!
          if( currentNote && that.data.drag.status && !currentNote.active )
          {
            if( ! key.shift )
              that.modelClearActiveNotes();
            currentNote.active = true;
          }

          // Decide how active notes will change based on what action is currently occurring
          switch( that.data.drag.action )
          {
            case 'mid':
              CurseWords.setExplicitCursor('grab');
              that.data.drag.keyDelta   = that.modelPixelsToKey( that.data.drag.endX - that.data.drag.startX );
              that.data.drag.startDelta = that.modelPixelsToBar( that.data.drag.endY - that.data.drag.startY );
              that.data.drag.endDelta   = that.data.drag.startDelta;
              break;
            case 'min':
              that.data.drag.keyDelta   = 0;
              that.data.drag.startDelta = that.modelPixelsToBar( that.data.drag.endY - that.data.drag.startY );
              that.data.drag.endDelta   = 0;
              break;
            case 'max':
              that.data.drag.keyDelta   = 0;
              that.data.drag.startDelta = 0;
              that.data.drag.endDelta   = that.modelPixelsToBar( that.data.drag.endY - that.data.drag.startY );
              break;
            case 'select':
              that.modelSelectNotesInBox( that.data.drag.startX, that.data.drag.startY, that.data.drag.endX, that.data.drag.endY );
          }

          // Snap to grid
          that.modelSnapNoteChanges( currentNote );

          // Notes being dragged, update the preview sound
          if( currentNote )
          {
            // Check if key has changed
            if( that.data.drag.keyDelta && ( currentNote.key + that.data.drag.keyDelta != currentKey ) )
            {
              // Stop old preview sound, start updated one
              Transport.playSingleNote( currentKey, 0 ); // REALLY BAD!!! TIGHTLY COUPLED, BREAK OUT VIA PUB SUB PATTERN
              Transport.playSingleNote( currentNote.key + that.data.drag.keyDelta, 100 ); // REALLY BAD!!! TIGHTLY COUPLED, BREAK OUT VIA PUB SUB PATTERN

              // Track the new key
              currentKey = currentNote.key + that.data.drag.keyDelta;
            }
          }
          // No notes being dragged, just cancel the sound
          else
          {
            Transport.playSingleNote( currentKey, 0 ); // REALLY BAD!!! TIGHTLY COUPLED, BREAK OUT VIA PUB SUB PATTERN
          }
        };
      var dropHandler = function (e)
        {
          // Stop the sound if a note was clicked
          Transport.playSingleNote( currentKey, 0 ); // REALLY BAD!!! TIGHTLY COUPLED, BREAK OUT VIA PUB SUB PATTERN

          // Handle Selections/Deletions on note click
          if( that.data.drag.action == 'mid' && ! that.data.drag.status )
          {
            // Clicked on active note(s) - DELETE
            if( currentNote.active )
              that.modelDeleteActiveNotes();

            // Clicked on inactive note
            else
            {
              // There is an existing selection - handle selection change
              if( that.modelCountActiveNotes() )
              {
                // Add to selection (Union)
                if( key.shift )
                  currentNote.active = true;
                // Replace selection
                else
                  that.modelClearActiveNotes();
              }
              // Delete the inactive note that was just clicked on
              else
              {
                currentNote.active = true;
                that.modelDeleteActiveNotes();
              }
            }
          }

          // Handle Selections/Deletions on blank click
          if( that.data.drag.action == 'select' )
          {
            // Selected note(s) by selection box
            if( that.data.drag.status )
            {
              that.modelSetActiveNotes( that.modelGetSelectedNotes(), key.shift );
              that.modelClearSelectedNotes();
            }

            // Deselected existing note(s) selection - wasn't a drag a.k.a. basically clicked a blank area
            else if( that.modelCountActiveNotes() > 0 )
              that.modelClearActiveNotes();

            // Create new note - wasn't a drag a.k.a. basically clicked a blank area when there was no existing selection
            else
            {
              var timePosition = that.modelYCoordToBar( that.data.drag.startY );
              var  keyPosition = that.modelXCoordToKey( that.data.drag.startX );
              var newNoteParams = { key:   Math.ceil( keyPosition )
                                  , end:   Math.ceil(  timePosition * 4 ) * 0.25
                                  , start: Math.floor( timePosition * 4 ) * 0.25
                                  };
              var newNote = new Note(newNoteParams);
              that.modelSetActiveNotes( newNote );
            }
          }

          // Finalize the drag and clear state
          that.modelApplyDragDeltas();
          that.data.drag.status = false;
          that.data.drag.action = null;
          that.data.drag.showSelectionBox = false;
          that.data.drag.startX = undefined;
          that.data.drag.startY = undefined;
          that.data.drag.endX = undefined;
          that.data.drag.endY = undefined;
          that.data.drag.keyDelta   = 0;
          that.data.drag.startDelta = 0;
          that.data.drag.endDelta   = 0;
          CurseWords.clearExplicitCursor();
        };
      DragKing.addHandler( that.data.canvas, gripHandler, dragHandler, dropHandler );
    };
  $.controllerWindowResize   = function()
    {
      // Reinitialize dimensions upon resize
      var that = this;
      window.addEventListener('resize', function (e){
        that.modelResize();
      });
    };
  $.controllerKeyPress       = function()
    {
      var that = this;

      key('ctrl+s', function(){ 
        console.log( that.data.notes );
        if(1) return false;

        for( var i = 0; i < that.data.notes.length; i++ )
        {
          console.log( '{ key: '  +that.data.notes[i].key              +
                       ', start: '+that.data.notes[i].start.toFixed(3) +
                       ', end: '  +that.data.notes[i].end.toFixed(3)   +' }' );
        }
        return false;
      });
      key('del, backspace', function(){ 
        that.modelDeleteActiveNotes();
        return false;
      });
      key('right', function(){ 
        that.data.drag.keyDelta = 1;
        that.modelApplyDragDeltas();
        that.data.drag.keyDelta = 0;
        return false;
      });
      key('left', function(){ 
        that.data.drag.keyDelta = -1;
        that.modelApplyDragDeltas();
        that.data.drag.keyDelta = 0;
        return false;
      });
      key('up', function(){ 
        that.data.drag.startDelta = -0.25;
        that.data.drag.endDelta = -0.25;
        that.modelApplyDragDeltas();
        that.data.drag.startDelta = 0;
        that.data.drag.endDelta = 0;
        return false;
      });
      key('down', function(){ 
        that.data.drag.startDelta = 0.25;
        that.data.drag.endDelta = 0.25;
        that.modelApplyDragDeltas();
        that.data.drag.startDelta = 0;
        that.data.drag.endDelta = 0;
        return false;
      });
    };
  $.controllerMidiEvent      = function(){};
  $.controllerGripscroll     = function()
    {
      // Update viewport upon scroll
      var that = this;
      this.data.container.addEventListener('gripscroll-update', function (e){
        that.modelSetViewport( e.gripScrollX.min, e.gripScrollX.max, e.gripScrollY.min, e.gripScrollY.max );
      });
    };

  // ==========================================================================
  // MODEL
  // ==========================================================================
  $.modelResize              = function()
    {
      // Reset dimensions
      this.data.canvas.width  = this.data.width  = this.data.container.clientWidth  * this.data.pixelScale;
      this.data.canvas.height = this.data.height = this.data.container.clientHeight * this.data.pixelScale;
        /* ^ clientWidth/clientHeight return rounded integer value from the parent
         * wrapper. If we use getBoundingClientRect() instead, we'll get non-integer
         * values and the discrepancy will lead to sub-pixel blending and fuzzy lines.
         */ 
    };
  $.modelGetTimeRange        = function(){ return this.data.timeScale.max - this.data.timeScale.min; };
  $.modelGetKeyRange         = function(){ return this.data.keyScale.max  - this.data.keyScale.min;  };
  $.modelPercentToKey        = function(percent){ return Math.ceil( percent * this.data.keyboardSize ); }; // Where percent is between 0.000 and 1.000
  $.modelPercentToBar        = function(percent){ return Math.ceil( percent * this.data.clipLength   ); }; // Where percent is between 0.000 and 1.000
  $.modelBarToPixels         = function(bar){ return ( ( bar / this.data.clipLength   )                         ) / this.modelGetTimeRange() * this.data.height; };
  $.modelKeyToPixels         = function(key){ return ( ( key / this.data.keyboardSize )                         ) / this.modelGetKeyRange()  * this.data.width;  };
  $.modelBarToYCoord         = function(bar){ return ( ( bar / this.data.clipLength   ) - this.data.timeScale.min ) / this.modelGetTimeRange() * this.data.height; };
  $.modelKeyToXCoord         = function(key){ return ( ( key / this.data.keyboardSize ) - this.data.keyScale.min  ) / this.modelGetKeyRange()  * this.data.width;  };
  $.modelPixelsToBar         = function(pixels){ return (         ( pixels ) / this.data.height * this.data.pixelScale * this.modelGetTimeRange()                          ) * this.data.clipLength;   };
  $.modelPixelsToKey         = function(pixels){ return ( 0.0 + ( ( pixels ) / this.data.width  * this.data.pixelScale * this.modelGetKeyRange()                         ) ) * this.data.keyboardSize; };
  $.modelYCoordToBar         = function(yCoord){ return (         ( yCoord ) / this.data.height * this.data.pixelScale * this.modelGetTimeRange() + this.data.timeScale.min  ) * this.data.clipLength;   };
  $.modelXCoordToKey         = function(xCoord){ return ( 0.0 + ( ( xCoord ) / this.data.width  * this.data.pixelScale * this.modelGetKeyRange()  + this.data.keyScale.min ) ) * this.data.keyboardSize; };
  $.modelSetViewport         = function(keyScaleMin, keyScaleMax, timeScaleMin, timeScaleMax)
    {
      // Update Viewport params
      this.modelResize();
      this.data.timeScale.min = timeScaleMin;
      this.data.timeScale.max = timeScaleMax;
      this.data.keyScale.min  = keyScaleMin;
      this.data.keyScale.max  = keyScaleMax;

    };
  $.modelGetAverageVelocity  = function()
    {
      var velocityTotal = 0;
      var numActiveNotes = 0;
      var velocityInput = document.getElementById('note_velocity');

      // Update velocity Average
      for( var i = 0; i < this.data.notes.length; i++ )
      {
        if( this.data.notes[i].active )
        {                                     
          velocityTotal += this.data.notes[i].velocity;
          numActiveNotes++;
        }
      }

      // Update UI control if applicable
      if(numActiveNotes > 0)
        velocityInput.value = Math.floor(velocityTotal / numActiveNotes);
    };
  $.modelSetActiveNotes      = function(notes, union)
    {
      if( ! notes ) notes = [];
      if( ! union ) this.modelClearActiveNotes();             // Remove the previously active notes
      if( ! Array.isArray(notes) ) notes = [notes];         // Make sure notes is in array form if just 1 note is provided

      // Do the setting of the new notes
      for( var i = 0; i < notes.length; i++ )               
      {
        // Add the new active notes, ONLY if it isn't already there (and if it's an actual note)
        if( this.data.notes.indexOf( notes[i] ) == -1 && notes[i] )
          this.data.notes.push( notes[i] );

        // Toggle the state of the note
        notes[i].active = union && !( notes[i].active ) || union === false;
      }

      //this.modelGetAverageVelocity();
    };
  $.modelApplyDragDeltas     = function()
    {
      for( var i = 0; i < this.data.notes.length; i++ )
      {
        // Only apply to active notes
        if( this.data.notes[i].active )
        {
          if( this.data.drag.startDelta ) this.data.notes[i].start += this.data.drag.startDelta;
          if( this.data.drag.keyDelta   ) this.data.notes[i].key   += this.data.drag.keyDelta;
          if( this.data.drag.endDelta   ) this.data.notes[i].end   += this.data.drag.endDelta;
        }
      }
    };
  $.modelCountActiveNotes    = function()
    {
      var total = 0;
      for( var i = 0; i < this.data.notes.length; i++ )
        if( this.data.notes[i].active )
          total++;
      return total;
    };
  $.modelDeleteActiveNotes   = function()
    {
      // Deletes all notes marked as active
      this.data.notes = this.data.notes.filter( function(el){
        return ! el.active;
      });
    };
  $.modelClearActiveNotes    = function()
    {
      // Clear all the active notes (nothing being interacted with by the mouse)
      for( var i = 0; i < this.data.notes.length; i++ )
        this.data.notes[i].active = false;
    };
  $.modelGetSelectedNotes    = function()
    {
      return this.data.notes.filter(function(note){
        return note.selected;
      });
    };
  $.modelCountSelectedNotes  = function()
    {
      var total = 0;
      for( var i = 0; i < this.data.notes.length; i++ )
        if( this.data.notes[i].selected )
          total++;
      return total;
    };
  $.modelClearSelectedNotes  = function()
    {
      // Clear all the active notes (nothing being interacted with by the mouse)
      for( var i = 0; i < this.data.notes.length; i++ )
        this.data.notes[i].selected = false;
    };
  $.modelGetHoveredNote      = function(timePositionBars, key)
    {
      // Which note is the cursor currently over?
      for( var i = 0; i < this.data.notes.length; i++ )
      {
        if(   timePositionBars >= this.data.notes[i].start )
          if( timePositionBars <= this.data.notes[i].end )
            if(   this.data.notes[i].key - key < 1 )
              if( this.data.notes[i].key - key > 0 )
                return this.data.notes[i];
      }
      return null;
    };
  $.modelGetHoverAction      = function(timePositionBars, hoveredNote)
    { 
      // Based on which part of the note the cursor is hovering over, what action are we about to do?
      if( ! hoveredNote )
        return 'select';

           if( this.modelBarToPixels(     hoveredNote.end   - hoveredNote.start ) < 15 ) return 'mid';
      else if( this.modelBarToPixels( -1* hoveredNote.start + timePositionBars  ) <  5 ) return 'min';
      else if( this.modelBarToPixels(     hoveredNote.end   - timePositionBars  ) <  5 ) return 'max';
      else                                                                             return 'mid';
    };
  $.modelSnapNoteChanges     = function(targetNote)
    {
      // Takes a target note and a note delta and adjusts the delta to snap to the closest snap points
      // delta should be an object of the form:  { startDelta: X.XXX, endDelta: Y.YYY, keyDelta: Z.ZZZ }
      // TODO: Make standardized objects for Notes and note deltas.
      if( ! targetNote )
        return;

      // Key change is always integer
      this.data.drag.keyDelta = Math.round( this.data.drag.keyDelta );

      // User can press alt to bypass quantization aka "snap"!
      if( key.alt )
        return;

      // Both Start/End deltas => note being dragged from mid grip => ensure equal quantization
      if( this.data.drag.startDelta && this.data.drag.endDelta )
      {
        this.data.drag.startDelta = this.data.drag.endDelta = this.modelSnapIndividualValue( this.data.drag.startDelta, targetNote.start );
        return;
      }

      // Individual ends - Snap the start and endpoints to the grid
      if( this.data.drag.startDelta ) this.data.drag.startDelta = this.modelSnapIndividualValue( this.data.drag.startDelta, targetNote.start );
      if( this.data.drag.endDelta   ) this.data.drag.endDelta   = this.modelSnapIndividualValue( this.data.drag.endDelta  , targetNote.end   );
    };
  $.modelSnapIndividualValue = function(delta, value)
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
    };
  $.modelSelectNotesInBox    = function(startX, startY, endX, endY)
    {
      // Given a 2 mouse events, set all the notes intersecting the resultant bounding box as selected
      var bar1 = this.modelYCoordToBar( startY );
      var key1 = this.modelXCoordToKey( startX );
      var bar2 = this.modelYCoordToBar(   endY );
      var key2 = this.modelXCoordToKey(   endX );
      var barMin = bar1 < bar2 ? bar1 : bar2;
      var barMax = bar1 > bar2 ? bar1 : bar2;
      var keyMin = key1 < key2 ? key1 : key2;
      var keyMax = key1 > key2 ? key1 : key2;

      for( var i = 0; i < this.data.notes.length; i++ )
      {
        this.data.notes[i].selected = false;
        if(   this.data.notes[i].start < barMax )
          if( this.data.notes[i].end   > barMin )
            if(   this.data.notes[i].key < keyMax + 1 )
              if( this.data.notes[i].key > keyMin + 0 )
                this.data.notes[i].selected = true;
      }
    };

  // ==========================================================================
  // VIEW
  // ==========================================================================
  $.viewRenderFreshGrid  = function()
    {
      // Render a plain pianoroll
      this.data.canvasContext.clear();
      this.data.canvasContext.backgroundFill('#789');

      // Render it!
      this.viewRenderKeyScale();
      this.viewRenderTimeScale();
    };
  $.viewRenderKeyScale   = function()
    {
      // Styles
      this.data.canvasContext.lineWidth   = 1.0;
      this.data.canvasContext.setLineDash([]);
      this.data.canvasContext.strokeStyle = "#567";
      this.data.canvasContext.fillStyle   = "#678";

      // Each edge + black key fills
      var minKey = this.modelPercentToKey( this.data.keyScale.min );
      var maxKey = this.modelPercentToKey( this.data.keyScale.max );
      for( var key = minKey; key <= maxKey; key++ )
      {
        var prevEdge = Math.closestHalfPixel( this.modelKeyToXCoord( key - 1 ) ) + 1;   // Extra pixel to account for stroke width
        var nextEdge = Math.closestHalfPixel( this.modelKeyToXCoord( key     ) ) + 1;   // Extra pixel to account for stroke width

        // Stroke the edge between rows
        if( prevEdge > 0.5 ) // Skip first edge (we have a border to serve that purpose)
          this.data.canvasContext.drawLine( prevEdge, 0, prevEdge, this.data.height, false );

        // Fill the row for the black keys
        if( key % 12 in {0:true, 2:true, 5: true, 7: true, 10: true} )
          this.data.canvasContext.fillRect( nextEdge, 0, prevEdge - nextEdge, this.data.height );
      }

      // Stroke it all at the end!
      this.data.canvasContext.stroke();
    };
  $.viewRenderTimeScale  = function()
    {
      // Styles
      this.data.canvasContext.lineWidth = 1.0;
      this.data.canvasContext.setLineDash( key.alt ? [2,4] : [] );

      // Draw lines for each beat
      var minBar = this.modelPercentToBar( this.data.timeScale.min ) - 1;
      var maxBar = this.modelPercentToBar( this.data.timeScale.max );
      for( var bar = minBar; bar < maxBar; bar += 0.25 )
      {
        // Start each line as a separate path (different colors)
        this.data.canvasContext.beginPath();
        this.data.canvasContext.strokeStyle = ( bar % 1 ) ? "#567" : "#234";

        var yPosition = Math.closestHalfPixel( this.modelBarToYCoord( bar ) );
        this.data.canvasContext.drawLine( 0, yPosition, this.data.width, yPosition );

        // Draw each line (different colors)
        this.data.canvasContext.stroke();
      }
    };
  $.viewRenderNotes      = function(params)
    {
      for( var i = 0; i < this.data.notes.length; i++ )
      {
        var currentNote = this.data.notes[i];
        this.data.canvasContext.beginPath();
        this.data.canvasContext.lineWidth   = 1.0;
        this.data.canvasContext.setLineDash([]);

        // Show the impending state of note selection
        var shiftKeyDownAndNoteActive =  key.shift && ( currentNote.active   ^  currentNote.selected ); // If the shift key is down, we're trying to preview the exclusive union of active and selected notes as active (active keys would be deselected)
        var shiftKeyUpAndNoteActive   = !key.shift && ( currentNote.selected || currentNote.active   ); // If the shift key is up, we're trying to preview ALL active and selected keys as active
        if( shiftKeyDownAndNoteActive || shiftKeyUpAndNoteActive )
        {
          var previewNote = { start: currentNote.start + this.data.drag.startDelta
                            , key:   currentNote.key   + this.data.drag.keyDelta
                            , end:   currentNote.end   + this.data.drag.endDelta
                            };
          this.data.canvasContext.strokeStyle = "#000";
          this.data.canvasContext.fillStyle   = "#CFD";
          this.viewRenderSingleNote( previewNote );
        }
        else
        {
          var intensityFactor = currentNote.velocity / this.data.maxVelocity;
          var r = Math.floor(   0 +   0*intensityFactor );
          var g = Math.floor( 127 + 128*intensityFactor );
          var b = Math.floor(   0 +   0*intensityFactor );
          this.data.canvasContext.strokeStyle = "#000";
          this.data.canvasContext.fillStyle   = "rgba("+r+','+g+','+b+',1)';
          this.viewRenderSingleNote( currentNote );
        }

        this.data.canvasContext.stroke();
      }
    };
  $.viewRenderSingleNote = function(note)
    {
      var y1 = Math.closestHalfPixel( this.modelBarToYCoord( note.start ) );
      var y2 = Math.closestHalfPixel( this.modelBarToYCoord( note.end   ) );
      var x1 = Math.closestHalfPixel( this.modelKeyToXCoord( note.key - 1 ) );
      var x2 = Math.closestHalfPixel( this.modelKeyToXCoord( note.key     ) );
      this.data.canvasContext.fillRect  ( x1 + 2, y1 + 1, x2 - x1 - 3, y2 - y1 - 3 );
      this.data.canvasContext.strokeRect( x1 + 1, y1 + 0, x2 - x1 - 1, y2 - y1 - 1 );
    };
  $.viewRenderSelectBox  = function()
    {
      if( this.data.drag.action != 'select' )
        return;

      var x0 = Math.closestHalfPixel( this.data.drag.startX * this.data.pixelScale );
      var y0 = Math.closestHalfPixel( this.data.drag.startY * this.data.pixelScale );
      var width  = Math.round( ( this.data.drag.endX - this.data.drag.startX) * this.data.pixelScale );
      var height = Math.round( ( this.data.drag.endY - this.data.drag.startY) * this.data.pixelScale );
      this.data.canvasContext.beginPath();
      this.data.canvasContext.lineWidth   = 1.0;
    //this.data.canvasContext.setLineDash([1,2]);
    //this.data.canvasContext.lineDashOffset++; // Marching Ants effect
      this.data.canvasContext.strokeStyle = "rgba(255,255,255,0.500)";
      this.data.canvasContext.fillStyle   = "rgba(255,255,255,0.125)";
      this.data.canvasContext.fillRect(x0, y0, width, height);
      this.data.canvasContext.strokeRect(x0, y0, width, height);
      this.data.canvasContext.stroke();
      this.data.canvasContext.setLineDash([]);
    };
  $.viewRenderLiveNote   = function(note)
    {
      this.data.canvasContext.beginPath();
      this.data.canvasContext.strokeStyle = "#000";
      this.data.canvasContext.fillStyle   = "#F0F";
      $.view.renderSingleNote( note );
      this.data.canvasContext.stroke();
    };
  $.viewRenderLoop       = function()
    {
      this.viewRenderFreshGrid();
      this.viewRenderNotes();
      this.viewRenderSelectBox();

      requestAnimationFrame(this.viewRenderLoop.bind(this));
    };


  return { createRoll: function(container, params){ return new Roll(container, params); }
         };

})(key);
