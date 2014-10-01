var Transport = (function(){

  var notes = [];
  var keyFrequency = [];
  var oscillator = [];
  var bpm = 130;
  var playlengthModifier = 1/(bpm/60);
  var ctx = new AudioContext();

  // Set the frequencies for the notes
  var setFrequencies = (function(){
    for( i = 1; i <= 88; i++ )
    {
      keyFrequency[i] = Math.pow(2, (i-49)/12) * 440;
    }
  })();

  var getPlayTime = function( time ){
    return playlengthModifier * time + ctx.currentTime;
  }

  var createOscillator = function( key, start, end ){
    var oscillator = ctx.createOscillator();
    oscillator.connect(ctx.destination);
    oscillator.frequency.value = keyFrequency[ key ];
    oscillator.start( getPlayTime( start ) );
    oscillator.stop( getPlayTime( end ) );
  }

  var getNotes = function(){
    notes = PIANO.getNotes( target );
  };

  var play = function(){
    getNotes();

    for( i in notes )
    {
      createOscillator( notes[i].key, notes[i].start, notes[i].end );
    }
  };

  var stop = function(){

  };

  // Return the public methods
  return { play: play
         };

})();
