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
          if( $.model.isDragging )
            return null;

          // Figure out which note is hovered over (if any)?
          var timePosition = $.model.xCoordToBar( e.clientX - $.model.canvas.clientXYDirectional('x') );
          var  keyPosition = $.model.yCoordToKey( e.clientY - $.model.canvas.clientXYDirectional('y') );
          var  hoveredNote = $.model.getHoveredNote(timePosition, keyPosition);
          var  hoverAction = $.model.getHoverAction(timePosition, hoveredNote);

          // Repaint with the hover state
          $.view.renderFreshGrid();
          $.view.renderNotes();

          // Set the cursor
          var newCursor = null;
          switch( hoverAction )
          {
            case 'min': newCursor = 'xresize'; break;
            case 'max': newCursor = 'xresize'; break;
            case 'mid': newCursor = 'default'; break;
               default: newCursor = 'default';
          }
          return newCursor;
        };
      var exitHandler  = function (e)
        {
          $.view.renderFreshGrid();
          $.view.renderNotes();
        };
      CurseWords.addImplicitCursorHandler( $.model.canvas, enterHandler, hoverHandler, exitHandler );
    };
  $.controller.mouseDrag      = function()
    {
      var dragAction  = null;
      var startEvent  = null;
      var currentNote = null;
      var gripHandler = function (e)
        {
          startEvent = e;

          // Figure out which note (if any) is being gripped?
          var timePosition   = $.model.xCoordToBar( e.clientX - $.model.canvas.clientXYDirectional('x') );
          var  keyPosition   = $.model.yCoordToKey( e.clientY - $.model.canvas.clientXYDirectional('y') );
          currentNote        = $.model.getHoveredNote(timePosition, keyPosition);
          dragAction         = $.model.getHoverAction(timePosition, currentNote);

          // Set the cursor if necessary
          switch( dragAction )
          {
            case 'mid': CurseWords.setExplicitCursor('default'); break;
            case 'min':
            case 'max': CurseWords.setExplicitCursor('xresize');  break;
            case 'select':
          }

          // Re-render
          $.view.renderFreshGrid();
          $.view.renderNotes();
        };
      var dragHandler = function (e)
        {
          // Set dragging state only if the cursor actually moves, otherwise it is a click!
          if( Math.abs( e.clientX - startEvent.clientX ) > 1 || Math.abs( e.clientY - startEvent.clientY ) > 1 )
            $.model.isDragging = true;  // Share this state to the rest of the app - e.g. hover handler

          // If we begun dragging an inactive note, let's activate it!
          if( currentNote && $.model.isDragging && !currentNote.active )
          {
            if( ! key.shift )
              $.model.clearActiveNotes();
            currentNote.active = true;
          }

          // Decide how to draw notes based on what action is currently occurring
          var noteChanges = {};
          var showSelectionBox = false;
          switch( dragAction )
          {
            case 'mid':
              CurseWords.setExplicitCursor('grab');
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
              showSelectionBox = true;
              $.model.selectNotesInBox( startEvent, e );
          }

          // Draw the notes accordingly
          noteChanges = $.model.snapNoteChanges( noteChanges, currentNote );

          // Render it all!
          $.view.renderFreshGrid();
          $.view.renderNotes(noteChanges);
          if( showSelectionBox )
            $.view.renderSelectBox(startEvent, e);
        };
      var dropHandler = function (e)
        {
          // Determine the final changes to the notes
          var noteChanges = {};
          switch( dragAction )
          {
            case 'mid':
              // Adjusted existing note(s) by the mid-body
              if( $.model.isDragging )
              {
                noteChanges.keyDelta   = $.model.pixelsToKey( e.clientY - startEvent.clientY );
                noteChanges.startDelta = $.model.pixelsToBar( e.clientX - startEvent.clientX );
                noteChanges.endDelta   = noteChanges.startDelta;
              }
              // Delete all active notes - no drag so essentially clicked on the active notes
              else if( currentNote.active )
                $.model.deleteActiveNotes();
              // Wasn't a drag a.k.a. basically clicked a note outside an existing note(s) selection
              else if( !currentNote.active && $.model.countActiveNotes() > 0 )
              {
                // Add note to selection
                if( key.shift )
                  currentNote.active = true;
                // Deselected existing note(s) selection
                else
                  $.model.clearActiveNotes();
              }
              // Delete the inactive note that was just clicked on
              else
                $.model.notes.splice( $.model.notes.indexOf( currentNote ), 1 );
              break;
            case 'min':
              // Adjusted the start grip of note(s)
              noteChanges.startDelta = $.model.pixelsToBar( e.clientX - startEvent.clientX );
              break;
            case 'max':
              // Adjusted the end grip of note(s)
              noteChanges.endDelta   = $.model.pixelsToBar( e.clientX - startEvent.clientX );
              break;
            case 'select':
              // Selected note(s) by selection box
              if( $.model.isDragging )
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
                var timePosition = $.model.xCoordToBar( e.clientX - $.model.canvas.clientXYDirectional('x') );
                var  keyPosition = $.model.yCoordToKey( e.clientY - $.model.canvas.clientXYDirectional('y') );
                var newNoteParams = { key:   Math.ceil( keyPosition )
                                    , end:   Math.ceil(  timePosition * 4 ) * 0.25
                                    , start: Math.floor( timePosition * 4 ) * 0.25
                                    };
                var newNote = new Note(newNoteParams);
                $.model.setActiveNotes( newNote );
              }
              break;
          }

          // Update the state
          $.model.isDragging = false;
          dragAction = null;
          noteChanges = $.model.snapNoteChanges( noteChanges, currentNote );
          $.model.adjustActiveNotes(noteChanges);
          $.view.renderFreshGrid();
          $.view.renderNotes();
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
      key('del', function(){ 
        $.model.deleteActiveNotes();
        $.view.renderFreshGrid();
        $.view.renderNotes();
        return false;
      });
      key('up', function(){ 
        var noteChanges = {keyDelta: 1};
        $.model.adjustActiveNotes(noteChanges);
        $.view.renderFreshGrid();
        $.view.renderNotes();
        return false;
      });
      key('down', function(){ 
        var noteChanges = {keyDelta: -1};
        $.model.adjustActiveNotes(noteChanges);
        $.view.renderFreshGrid();
        $.view.renderNotes();
        return false;
      });
      key('left', function(){ 
        var noteChanges = {startDelta: -0.25, endDelta: -0.25};
        $.model.adjustActiveNotes(noteChanges);
        $.view.renderFreshGrid();
        $.view.renderNotes();
        return false;
      });
      key('right', function(){ 
        var noteChanges = {startDelta: 0.25, endDelta: 0.25};
        $.model.adjustActiveNotes(noteChanges);
        $.view.renderFreshGrid();
        $.view.renderNotes();
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
  $.model.maxVelocity         = 127;
  $.model.minVelocity         = 0;
  $.model.velocityRange       = $.model.maxVelocity - $.model.minVelocity;
  $.model.initialize          = function(container, params)
    {
      // Canvas
      $.model.container        = container;
      $.model.canvas           = container.appendChild( document.createElement('canvas') );
      $.model.canvas.className = 'piano-canvas';
      $.model.canvasContext    = $.model.canvas.getContext("2d");

      // Notes
      $.model.notes = params.notes;

      // Controllers
      for( var i in $.controller )
        $.controller[i]();
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
  $.model.barToPixels         = function(bar){ return ( ( bar / $.model.clipLength   )                         ) / $.model.getTimeRange() * $.model.width;  };
  $.model.keyToPixels         = function(key){ return ( ( key / $.model.keyboardSize )                         ) / $.model.getKeyRange()  * $.model.height; };
  $.model.barToXCoord         = function(bar){ return ( ( bar / $.model.clipLength   ) - $.model.timeScale.min ) / $.model.getTimeRange() * $.model.width;  };
  $.model.keyToYCoord         = function(key){ return ( ( key / $.model.keyboardSize ) - $.model.keyScale.min  ) / $.model.getKeyRange()  * $.model.height; };
  $.model.pixelsToBar         = function(pixels){ return (          ( pixels ) / $.model.width * $.model.getTimeRange()                          ) * $.model.clipLength;   };
  $.model.pixelsToKey         = function(pixels){ return (  0.0 - ( ( pixels ) / $.model.height * $.model.getKeyRange()                        ) ) * $.model.keyboardSize; };
  $.model.xCoordToBar         = function(xCoord){ return (          ( xCoord ) / $.model.width * $.model.getTimeRange() + $.model.timeScale.min  ) * $.model.clipLength;   };
  $.model.yCoordToKey         = function(yCoord){ return (  1.0 - ( ( yCoord ) / $.model.height * $.model.getKeyRange() + $.model.keyScale.min ) ) * $.model.keyboardSize; };
  $.model.setViewport         = function(timeScaleMin, timeScaleMax, keyScaleMin, keyScaleMax)
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

      $.model.getAverageVelocity();
    };
  $.model.adjustActiveNotes   = function(params)
    {
      // Saves changes indicated in the params argument to the currently active notes
      if( ! params ) return;

      for( var i = 0; i < $.model.notes.length; i++ )
      {
        // Only apply to active notes
        if( $.model.notes[i].active )
        {
          if( params.startDelta ) $.model.notes[i].start += params.startDelta;
          if( params.keyDelta   ) $.model.notes[i].key   += params.keyDelta;
          if( params.endDelta   ) $.model.notes[i].end   += params.endDelta;
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
    };
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
        if(   this.notes[i].start < barMax )
          if( this.notes[i].end   > barMin )
            if(   this.notes[i].key < keyMax + 1 )
              if( this.notes[i].key > keyMin + 0 )
                this.notes[i].selected = true;
        else
          this.notes[i].selected = false;
      }

      $.model.getAverageVelocity();
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
      var minKey = $.model.percentToKey( $.model.keyScale.min );
      var maxKey = $.model.percentToKey( $.model.keyScale.max );
      for( var key = minKey; key <= maxKey; key++ )
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
      $.model.canvasContext.setLineDash( key.alt ? [2,4] : [] );

      // Draw lines for each beat
      var minBar = $.model.percentToBar( $.model.timeScale.min ) - 1;
      var maxBar = $.model.percentToBar( $.model.timeScale.max );
      for( var bar = minBar; bar < maxBar; bar += 0.25 )
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
      for( var i = 0; i < $.model.notes.length; i++ )
      {
        $.model.canvasContext.beginPath();
        $.model.canvasContext.lineWidth   = 1.0;
        $.model.canvasContext.setLineDash([]);

        // Show the impending state of note selection
        var shiftKeyDownAndNoteActive =  key.shift && ( $.model.notes[i].active   ^  $.model.notes[i].selected ); // If the shift key is down, we're trying to preview the exclusive union of active and selected notes as active (active keys would be deselected)
        var shiftKeyUpAndNoteActive   = !key.shift && ( $.model.notes[i].selected || $.model.notes[i].active   ); // If the shift key is up, we're trying to preview ALL active and selected keys as active
        if( shiftKeyDownAndNoteActive || shiftKeyUpAndNoteActive )
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
          var intensityFactor = $.model.notes[i].velocity / $.model.maxVelocity;
          var r = Math.floor( 215 +  32*intensityFactor );
          var g = Math.floor( 160 - 144*intensityFactor );
          var b = Math.floor( 160 - 128*intensityFactor );
          $.model.canvasContext.strokeStyle = "#812";
          $.model.canvasContext.fillStyle   = "#" + r.toString(16) + g.toString(16) + b.toString(16);
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

  return { initialize:    $.model.initialize
         , getAllNotes:   function(){ return $.model.notes; }
         };

})(key);
