/* Planned refactor to allow only a single PianoRoll:
 * 
 * PianoRoll.init()
 * PianoRoll.setPlayHead()
 * PianoRoll.setNotes()
 * 
 * https://github.com/bgrins/TinyColor
 */



var PIANO = (function(key){

  'use strict';

  var $ = { controller: {}
          , model:      {}
          , view:       {}
          };

  // ==========================================================================
  // CONTROLLER
  // ==========================================================================
  $.controller.mouseMove      = function(){};
  $.controller.mouseHover     = function()
    {
      var enterHandler = function (e)
        {
          // This line below is useless at the moment... TODO
          $.model.isHovering = true;
        };
      var hoverHandler = function (e)
        {
          if( $.model.drag.status )
            return null;

          // Figure out which note is hovered over (if any)?
          var timePosition = $.model.yCoordToBar( e.clientY - $.model.canvas.clientXYDirectional('y') );
          var  keyPosition = $.model.xCoordToKey( e.clientX - $.model.canvas.clientXYDirectional('x') );
          var  hoveredNote = $.model.getHoveredNote(timePosition, keyPosition);
          var  hoverAction = $.model.getHoverAction(timePosition, hoveredNote);

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
          // This line below is useless at the moment... TODO
          $.model.isHovering = false;
        };
      CurseWords.addImplicitCursorHandler( $.model.canvas, enterHandler, hoverHandler, exitHandler );
    };
  $.controller.mouseDrag      = function()
    {
      var currentNote = null;
      var currentKey  = null;
      var gripHandler = function (e)
        {
          $.model.drag.startX = e.clientX - $.model.canvas.clientXYDirectional('x');
          $.model.drag.startY = e.clientY - $.model.canvas.clientXYDirectional('y');

          // Figure out which note (if any) is being gripped?
          var timePosition    = $.model.yCoordToBar( $.model.drag.startY );
          var  keyPosition    = $.model.xCoordToKey( $.model.drag.startX );
          currentNote         = $.model.getHoveredNote(timePosition, keyPosition);
          $.model.drag.action = $.model.getHoverAction(timePosition, currentNote);

          // Set the cursor if necessary
          switch( $.model.drag.action )
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
          $.model.drag.endX = e.clientX - $.model.canvas.clientXYDirectional('x');
          $.model.drag.endY = e.clientY - $.model.canvas.clientXYDirectional('y');

          // Set dragging state only if the cursor actually moves, otherwise it is a click!
          if( Math.abs( $.model.drag.endX - $.model.drag.startX ) > 1 || Math.abs( $.model.drag.endY - $.model.drag.startY ) > 1 )
            $.model.drag.status = true;  // Share this state to the rest of the app - e.g. hover handler

          // If we begun dragging an inactive note, let's activate it!
          if( currentNote && $.model.drag.status && !currentNote.active )
          {
            if( ! key.shift )
              $.model.clearActiveNotes();
            currentNote.active = true;
          }

          // Decide how active notes will change based on what action is currently occurring
          switch( $.model.drag.action )
          {
            case 'mid':
              CurseWords.setExplicitCursor('grab');
              $.model.drag.keyDelta   = $.model.pixelsToKey( $.model.drag.endX - $.model.drag.startX );
              $.model.drag.startDelta = $.model.pixelsToBar( $.model.drag.endY - $.model.drag.startY );
              $.model.drag.endDelta   = $.model.drag.startDelta;
              break;
            case 'min':
              $.model.drag.keyDelta   = 0;
              $.model.drag.startDelta = $.model.pixelsToBar( $.model.drag.endY - $.model.drag.startY );
              $.model.drag.endDelta   = 0;
              break;
            case 'max':
              $.model.drag.keyDelta   = 0;
              $.model.drag.startDelta = 0;
              $.model.drag.endDelta   = $.model.pixelsToBar( $.model.drag.endY - $.model.drag.startY );
              break;
            case 'select':
              $.model.selectNotesInBox( $.model.drag.startX, $.model.drag.startY, $.model.drag.endX, $.model.drag.endY );
          }

          // Snap to grid
          $.model.snapNoteChanges( currentNote );

          // Notes being dragged, update the preview sound
          if( currentNote )
          {
            // Check if key has changed
            if( $.model.drag.keyDelta && ( currentNote.key + $.model.drag.keyDelta != currentKey ) )
            {
              // Stop old preview sound, start updated one
              Transport.playSingleNote( currentKey, 0 ); // REALLY BAD!!! TIGHTLY COUPLED, BREAK OUT VIA PUB SUB PATTERN
              Transport.playSingleNote( currentNote.key + $.model.drag.keyDelta, 100 ); // REALLY BAD!!! TIGHTLY COUPLED, BREAK OUT VIA PUB SUB PATTERN

              // Track the new key
              currentKey = currentNote.key + $.model.drag.keyDelta;
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
          if( $.model.drag.action == 'mid' && ! $.model.drag.status )
          {
            // Clicked on active note(s) - DELETE
            if( currentNote.active )
              $.model.deleteActiveNotes();

            // Clicked on inactive note
            else
            {
              // There is an existing selection - handle selection change
              if( $.model.countActiveNotes() )
              {
                // Add to selection (Union)
                if( key.shift )
                  currentNote.active = true;
                // Replace selection
                else
                  $.model.clearActiveNotes();
              }
              // Delete the inactive note that was just clicked on
              else
              {
                currentNote.active = true;
                $.model.deleteActiveNotes();
              }
            }
          }

          // Handle Selections/Deletions on blank click
          if( $.model.drag.action == 'select' )
          {
            // Selected note(s) by selection box
            if( $.model.drag.status )
            {
              $.model.setActiveNotes( $.model.getSelectedNotes(), key.shift );
              $.model.clearSelectedNotes();
            }

            // Deselected existing note(s) selection - wasn't a drag a.k.a. basically clicked a blank area
            else if( $.model.countActiveNotes() > 0 )
              $.model.clearActiveNotes();

            // Create new note - wasn't a drag a.k.a. basically clicked a blank area when there was no existing selection
            else
            {
              var timePosition = $.model.yCoordToBar( $.model.drag.startY );
              var  keyPosition = $.model.xCoordToKey( $.model.drag.startX );
              var newNoteParams = { key:   Math.ceil( keyPosition )
                                  , end:   Math.ceil(  timePosition * 4 ) * 0.25
                                  , start: Math.floor( timePosition * 4 ) * 0.25
                                  };
              var newNote = new Note(newNoteParams);
              $.model.setActiveNotes( newNote );
            }
          }

          // Finalize the drag and clear state
          $.model.applyDragDeltas();
          $.model.drag.status = false;
          $.model.drag.action = null;
          $.model.drag.showSelectionBox = false;
          $.model.drag.startX = undefined;
          $.model.drag.startY = undefined;
          $.model.drag.endX = undefined;
          $.model.drag.endY = undefined;
          $.model.drag.keyDelta   = 0;
          $.model.drag.startDelta = 0;
          $.model.drag.endDelta   = 0;
          CurseWords.clearExplicitCursor();
        };
      DragKing.addHandler( $.model.canvas, gripHandler, dragHandler, dropHandler );
    };
  $.controller.windowResize   = function()
    {
      // Reinitialize dimensions upon resize
      window.addEventListener('resize', function (e){
        $.model.resize();
      });
    };
  $.controller.keyPress       = function()
    {
      key('ctrl+s', function(){ 
        for( var i = 0; i < $.model.notes.length; i++ )
        {
          console.log( '{ key: '  +$.model.notes[i].key              +
                       ', start: '+$.model.notes[i].start.toFixed(3) +
                       ', end: '  +$.model.notes[i].end.toFixed(3)   +' }' );
        }
        return false;
      });
      key('del, backspace', function(){ 
        $.model.deleteActiveNotes();
        return false;
      });
      key('right', function(){ 
        $.model.drag.keyDelta = 1;
        $.model.applyDragDeltas();
        $.model.drag.keyDelta = 0;
        return false;
      });
      key('left', function(){ 
        $.model.drag.keyDelta = -1;
        $.model.applyDragDeltas();
        $.model.drag.keyDelta = 0;
        return false;
      });
      key('up', function(){ 
        $.model.drag.startDelta = -0.25;
        $.model.drag.endDelta = -0.25;
        $.model.applyDragDeltas();
        $.model.drag.startDelta = 0;
        $.model.drag.endDelta = 0;
        return false;
      });
      key('down', function(){ 
        $.model.drag.startDelta = 0.25;
        $.model.drag.endDelta = 0.25;
        $.model.applyDragDeltas();
        $.model.drag.startDelta = 0;
        $.model.drag.endDelta = 0;
        return false;
      });
    };
  $.controller.midiEvent      = function(){};
  $.controller.gripscroll     = function()
    {
      // Update viewport upon scroll
      $.model.container.addEventListener('gripscroll-update', function (e){
        $.model.setViewport( e.gripScrollX.min, e.gripScrollX.max, e.gripScrollY.min, e.gripScrollY.max );

        // Redraw
        $.view.renderFreshGrid();
        $.view.renderNotes();
      });
    };
  /*
  $.controller.velocityChange = function()
    {
      var velocityInput = document.getElementById('note_velocity');

      velocityInput.addEventListener("change", function (e){
        // Validate velocity range
        if(velocityInput.value < $.model.minVelocity || velocityInput.value > $.model.maxVelocity)
          return;

        // Assign new velocity
        for( var i = 0; i < $.model.notes.length; i++ )
        {
          if( $.model.notes[i].active )
            $.model.notes[i].velocity = parseInt( velocityInput.value );
        }

        $.view.renderNotes();
      });
    };
  */

  // ==========================================================================
  // MODEL
  // ==========================================================================
  $.model.container           = null;
  $.model.canvas              = null;
  $.model.canvasContext       = null;
  $.model.keyboardSize        = 88;    // 88 keys in a piano
  $.model.clipLength          = 8;    // ...in bars. 2.125 means 2 bars and 1/8th note long
  $.model.width               = null;
  $.model.height              = null;
  $.model.timeScale           = { min: 0.500, max: 1.000 };
  $.model.keyScale            = { min: 0.000, max: 1.000 };
  $.model.notes               = [];
  $.model.drag                = { status: false
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
  $.model.isHovering          = false;
  $.model.maxVelocity         = 127;
  $.model.minVelocity         = 0;
  $.model.velocityRange       = $.model.maxVelocity - $.model.minVelocity;
  $.model.pixelScale          = window.devicePixelRatio || 1;
  $.model.initialize          = function(container, params)
    {
      // Options
      $.model.clipLength = params.clipLength || 8;

      // Canvas
      $.model.container        = container;
      $.model.canvas           = container.appendChild( document.createElement('canvas') );
      $.model.canvas.className = 'piano-canvas';
      $.model.canvasContext    = $.model.canvas.getContext("2d");
      $.model.canvasContext.scale( $.model.pixelScale, $.model.pixelScale );

      // Notes
      $.model.notes = params.notes || [];

      // Controllers
      for( var i in $.controller )
        $.controller[i]();

      // Views
      $.view.renderLoop();
    };
  $.model.resize              = function()
    {
      // Reset dimensions
      $.model.canvas.width  = $.model.width  = $.model.container.clientWidth  * $.model.pixelScale;
      $.model.canvas.height = $.model.height = $.model.container.clientHeight * $.model.pixelScale;
        /* ^ clientWidth/clientHeight return rounded integer value from the parent
         * wrapper. If we use getBoundingClientRect() instead, we'll get non-integer
         * values and the discrepancy will lead to sub-pixel blending and fuzzy lines.
         */ 
    };
  $.model.getTimeRange        = function(){ return $.model.timeScale.max - $.model.timeScale.min; };
  $.model.getKeyRange         = function(){ return $.model.keyScale.max  - $.model.keyScale.min;  };
  $.model.percentToKey        = function(percent){ return Math.ceil( percent * $.model.keyboardSize ); }; // Where percent is between 0.000 and 1.000
  $.model.percentToBar        = function(percent){ return Math.ceil( percent * $.model.clipLength   ); }; // Where percent is between 0.000 and 1.000
  $.model.barToPixels         = function(bar){ return ( ( bar / $.model.clipLength   )                         ) / $.model.getTimeRange() * $.model.height; };
  $.model.keyToPixels         = function(key){ return ( ( key / $.model.keyboardSize )                         ) / $.model.getKeyRange()  * $.model.width;  };
  $.model.barToYCoord         = function(bar){ return ( ( bar / $.model.clipLength   ) - $.model.timeScale.min ) / $.model.getTimeRange() * $.model.height; };
  $.model.keyToXCoord         = function(key){ return ( ( key / $.model.keyboardSize ) - $.model.keyScale.min  ) / $.model.getKeyRange()  * $.model.width;  };
  $.model.pixelsToBar         = function(pixels){ return (         ( pixels ) / $.model.height * $.model.pixelScale * $.model.getTimeRange()                          ) * $.model.clipLength;   };
  $.model.pixelsToKey         = function(pixels){ return ( 0.0 + ( ( pixels ) / $.model.width  * $.model.pixelScale * $.model.getKeyRange()                         ) ) * $.model.keyboardSize; };
  $.model.yCoordToBar         = function(yCoord){ return (         ( yCoord ) / $.model.height * $.model.pixelScale * $.model.getTimeRange() + $.model.timeScale.min  ) * $.model.clipLength;   };
  $.model.xCoordToKey         = function(xCoord){ return ( 0.0 + ( ( xCoord ) / $.model.width  * $.model.pixelScale * $.model.getKeyRange()  + $.model.keyScale.min ) ) * $.model.keyboardSize; };
  $.model.setViewport         = function(keyScaleMin, keyScaleMax, timeScaleMin, timeScaleMax)
    {
      // Update Viewport params
      $.model.resize();
      $.model.timeScale.min = timeScaleMin;
      $.model.timeScale.max = timeScaleMax;
      $.model.keyScale.min  = keyScaleMin;
      $.model.keyScale.max  = keyScaleMax;

    };
  $.model.getAverageVelocity  = function()
    {
      var velocityTotal = 0;
      var numActiveNotes = 0;
      var velocityInput = document.getElementById('note_velocity');

      // Update velocity Average
      for( var i = 0; i < $.model.notes.length; i++ )
      {
        if( $.model.notes[i].active )
        {                                     
          velocityTotal += $.model.notes[i].velocity;
          numActiveNotes++;
        }
      }

      // Update UI control if applicable
      if(numActiveNotes > 0)
        velocityInput.value = Math.floor(velocityTotal / numActiveNotes);
    };
  $.model.setActiveNotes      = function(notes, union)
    {
      if( ! notes ) notes = [];
      if( ! union ) $.model.clearActiveNotes();             // Remove the previously active notes
      if( ! Array.isArray(notes) ) notes = [notes];         // Make sure notes is in array form if just 1 note is provided

      // Do the setting of the new notes
      for( var i = 0; i < notes.length; i++ )               
      {
        // Add the new active notes, ONLY if it isn't already there (and if it's an actual note)
        if( $.model.notes.indexOf( notes[i] ) == -1 && notes[i] )
          $.model.notes.push( notes[i] );

        // Toggle the state of the note
        notes[i].active = union && !( notes[i].active ) || union === false;
      }

      //$.model.getAverageVelocity();
    };
  $.model.applyDragDeltas     = function()
    {
      for( var i = 0; i < $.model.notes.length; i++ )
      {
        // Only apply to active notes
        if( $.model.notes[i].active )
        {
          if( $.model.drag.startDelta ) $.model.notes[i].start += $.model.drag.startDelta;
          if( $.model.drag.keyDelta   ) $.model.notes[i].key   += $.model.drag.keyDelta;
          if( $.model.drag.endDelta   ) $.model.notes[i].end   += $.model.drag.endDelta;
        }
      }
    };
  $.model.countActiveNotes    = function()
    {
      var total = 0;
      for( var i = 0; i < $.model.notes.length; i++ )
        if( $.model.notes[i].active )
          total++;
      return total;
    };
  $.model.deleteActiveNotes   = function()
    {
      // Deletes all notes marked as active
      $.model.notes = $.model.notes.filter( function(el){
        return ! el.active;
      });
    };
  $.model.clearActiveNotes    = function()
    {
      // Clear all the active notes (nothing being interacted with by the mouse)
      for( var i = 0; i < $.model.notes.length; i++ )
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
      for( var i = 0; i < $.model.notes.length; i++ )
        if( $.model.notes[i].selected )
          total++;
      return total;
    };
  $.model.clearSelectedNotes  = function()
    {
      // Clear all the active notes (nothing being interacted with by the mouse)
      for( var i = 0; i < $.model.notes.length; i++ )
        this.notes[i].selected = false;
    };
  $.model.getHoveredNote      = function(timePositionBars, key)
    {
      // Which note is the cursor currently over?
      for( var i = 0; i < $.model.notes.length; i++ )
      {
        if(   timePositionBars >= $.model.notes[i].start )
          if( timePositionBars <= $.model.notes[i].end )
            if(   $.model.notes[i].key - key < 1 )
              if( $.model.notes[i].key - key > 0 )
                return $.model.notes[i];
      }
      return null;
    };
  $.model.getHoverAction      = function(timePositionBars, hoveredNote)
    { 
      // Based on which part of the note the cursor is hovering over, what action are we about to do?
      if( ! hoveredNote )
        return 'select';

           if( $.model.barToPixels(     hoveredNote.end   - hoveredNote.start ) < 15 ) return 'mid';
      else if( $.model.barToPixels( -1* hoveredNote.start + timePositionBars  ) <  5 ) return 'min';
      else if( $.model.barToPixels(     hoveredNote.end   - timePositionBars  ) <  5 ) return 'max';
      else                                                                             return 'mid';
    };
  $.model.snapNoteChanges     = function(targetNote)
    {
      // Takes a target note and a note delta and adjusts the delta to snap to the closest snap points
      // delta should be an object of the form:  { startDelta: X.XXX, endDelta: Y.YYY, keyDelta: Z.ZZZ }
      // TODO: Make standardized objects for Notes and note deltas.
      if( ! targetNote )
        return;

      // Key change is always integer
      $.model.drag.keyDelta = Math.round( $.model.drag.keyDelta );

      // User can press alt to bypass quantization aka "snap"!
      if( key.alt )
        return;

      // Both Start/End deltas => note being dragged from mid grip => ensure equal quantization
      if( $.model.drag.startDelta && $.model.drag.endDelta )
      {
        $.model.drag.startDelta = $.model.drag.endDelta = this.snapIndividualValue( $.model.drag.startDelta, targetNote.start );
        return;
      }

      // Individual ends - Snap the start and endpoints to the grid
      if( $.model.drag.startDelta ) $.model.drag.startDelta = this.snapIndividualValue( $.model.drag.startDelta, targetNote.start );
      if( $.model.drag.endDelta   ) $.model.drag.endDelta   = this.snapIndividualValue( $.model.drag.endDelta  , targetNote.end   );
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
    };
  $.model.selectNotesInBox    = function(startX, startY, endX, endY)
    {
      // Given a 2 mouse events, set all the notes intersecting the resultant bounding box as selected
      var bar1 = this.yCoordToBar( startY );
      var key1 = this.xCoordToKey( startX );
      var bar2 = this.yCoordToBar(   endY );
      var key2 = this.xCoordToKey(   endX );
      var barMin = bar1 < bar2 ? bar1 : bar2;
      var barMax = bar1 > bar2 ? bar1 : bar2;
      var keyMin = key1 < key2 ? key1 : key2;
      var keyMax = key1 > key2 ? key1 : key2;

      for( var i = 0; i < this.notes.length; i++ )
      {
        if(   this.notes[i].start < barMax )
          if( this.notes[i].end   > barMin )
            if(   this.notes[i].key < keyMax + 1 )
              if( this.notes[i].key > keyMin + 0 )
                this.notes[i].selected = true;
        else
          this.notes[i].selected = false;
      }

      //$.model.getAverageVelocity();
    };

  // ==========================================================================
  // VIEW
  // ==========================================================================
  $.view.renderFreshGrid  = function()
    {
      // Render a plain pianoroll
      $.model.canvasContext.clear();
      $.model.canvasContext.backgroundFill('#789');

      // Render it!
      $.view.renderKeyScale();
      $.view.renderTimeScale();
    };
  $.view.renderKeyScale   = function()
    {
      // Styles
      $.model.canvasContext.lineWidth   = 1.0;
      $.model.canvasContext.setLineDash([]);
      $.model.canvasContext.strokeStyle = "#567";
      $.model.canvasContext.fillStyle   = "#678";

      // Each edge + black key fills
      var minKey = $.model.percentToKey( $.model.keyScale.min );
      var maxKey = $.model.percentToKey( $.model.keyScale.max );
      for( var key = minKey; key <= maxKey; key++ )
      {
        var prevEdge = Math.closestHalfPixel( $.model.keyToXCoord( key - 1 ) ) + 1;   // Extra pixel to account for stroke width
        var nextEdge = Math.closestHalfPixel( $.model.keyToXCoord( key     ) ) + 1;   // Extra pixel to account for stroke width

        // Stroke the edge between rows
        if( prevEdge > 0.5 ) // Skip first edge (we have a border to serve that purpose)
          $.model.canvasContext.drawLine( prevEdge, 0, prevEdge, $.model.height, false );

        // Fill the row for the black keys
        if( key % 12 in {0:true, 2:true, 5: true, 7: true, 10: true} )
          $.model.canvasContext.fillRect( nextEdge, 0, prevEdge - nextEdge, $.model.height );
      }

      // Stroke it all at the end!
      $.model.canvasContext.stroke();
    };
  $.view.renderTimeScale  = function()
    {
      // Styles
      $.model.canvasContext.lineWidth = 1.0;
      $.model.canvasContext.setLineDash( key.alt ? [2,4] : [] );

      // Draw lines for each beat
      var minBar = $.model.percentToBar( $.model.timeScale.min ) - 1;
      var maxBar = $.model.percentToBar( $.model.timeScale.max );
      for( var bar = minBar; bar < maxBar; bar += 0.25 )
      {
        // Start each line as a separate path (different colors)
        $.model.canvasContext.beginPath();
        $.model.canvasContext.strokeStyle = ( bar % 1 ) ? "#567" : "#234";

        var yPosition = Math.closestHalfPixel( $.model.barToYCoord( bar ) );
        $.model.canvasContext.drawLine( 0, yPosition, $.model.width, yPosition );

        // Draw each line (different colors)
        $.model.canvasContext.stroke();
      }
    };
  $.view.renderNotes      = function(params)
    {
      for( var i = 0; i < $.model.notes.length; i++ )
      {
        var currentNote = $.model.notes[i];
        $.model.canvasContext.beginPath();
        $.model.canvasContext.lineWidth   = 1.0;
        $.model.canvasContext.setLineDash([]);

        // Show the impending state of note selection
        var shiftKeyDownAndNoteActive =  key.shift && ( currentNote.active   ^  currentNote.selected ); // If the shift key is down, we're trying to preview the exclusive union of active and selected notes as active (active keys would be deselected)
        var shiftKeyUpAndNoteActive   = !key.shift && ( currentNote.selected || currentNote.active   ); // If the shift key is up, we're trying to preview ALL active and selected keys as active
        if( shiftKeyDownAndNoteActive || shiftKeyUpAndNoteActive )
        {
          var previewNote = { start: currentNote.start + $.model.drag.startDelta
                            , key:   currentNote.key   + $.model.drag.keyDelta
                            , end:   currentNote.end   + $.model.drag.endDelta
                            };
          $.model.canvasContext.strokeStyle = "#000";
          $.model.canvasContext.fillStyle   = "#CFD";
          $.view.renderSingleNote( previewNote );
        }
        else
        {
          var intensityFactor = currentNote.velocity / $.model.maxVelocity;
          var r = Math.floor(   0 +   0*intensityFactor );
          var g = Math.floor( 127 + 128*intensityFactor );
          var b = Math.floor(   0 +   0*intensityFactor );
          $.model.canvasContext.strokeStyle = "#000";
          $.model.canvasContext.fillStyle   = "rgba("+r+','+g+','+b+',1)';
          $.view.renderSingleNote( currentNote );
        }

        $.model.canvasContext.stroke();
      }
    };
  $.view.renderSingleNote = function(note)
    {
      var y1 = Math.closestHalfPixel( $.model.barToYCoord( note.start ) );
      var y2 = Math.closestHalfPixel( $.model.barToYCoord( note.end   ) );
      var x1 = Math.closestHalfPixel( $.model.keyToXCoord( note.key - 1 ) );
      var x2 = Math.closestHalfPixel( $.model.keyToXCoord( note.key     ) );
      $.model.canvasContext.fillRect  ( x1 + 2, y1 + 1, x2 - x1 - 3, y2 - y1 - 3 );
      $.model.canvasContext.strokeRect( x1 + 1, y1 + 0, x2 - x1 - 1, y2 - y1 - 1 );
    };
  $.view.renderSelectBox  = function()
    {
      if( $.model.drag.action != 'select' )
        return;

      var x0 = Math.closestHalfPixel( $.model.drag.startX * $.model.pixelScale );
      var y0 = Math.closestHalfPixel( $.model.drag.startY * $.model.pixelScale );
      var width  = Math.round( ( $.model.drag.endX - $.model.drag.startX) * $.model.pixelScale );
      var height = Math.round( ( $.model.drag.endY - $.model.drag.startY) * $.model.pixelScale );
      $.model.canvasContext.beginPath();
      $.model.canvasContext.lineWidth   = 1.0;
    //$.model.canvasContext.setLineDash([1,2]);
    //$.model.canvasContext.lineDashOffset++; // Marching Ants effect
      $.model.canvasContext.strokeStyle = "rgba(255,255,255,0.500)";
      $.model.canvasContext.fillStyle   = "rgba(255,255,255,0.125)";
      $.model.canvasContext.fillRect(x0, y0, width, height);
      $.model.canvasContext.strokeRect(x0, y0, width, height);
      $.model.canvasContext.stroke();
      $.model.canvasContext.setLineDash([]);
    };
  $.view.renderLiveNote   = function(note)
    {
      $.model.canvasContext.beginPath();
      $.model.canvasContext.strokeStyle = "#000";
      $.model.canvasContext.fillStyle   = "#F0F";
      $.view.renderSingleNote( note );
      $.model.canvasContext.stroke();
    };
  $.view.renderLoop       = function()
    {
      $.view.renderFreshGrid();
      $.view.renderNotes();
      $.view.renderSelectBox();

      requestAnimationFrame($.view.renderLoop);
    };



  return { initialize:      $.model.initialize
         , getAllNotes:     function(){ return $.model.notes; }
         , refreshView:     function(){
                              $.view.renderFreshGrid();
                              $.view.renderNotes();
                            }
         , renderLiveNote:  $.view.renderLiveNote
         };

})(key);
