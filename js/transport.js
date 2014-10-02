var Transport = (function(){

  var keyFrequency = [];
  var oscillator = [];
  var bpm = 128;
  var ctx = new AudioContext();

  // Set the frequencies for the notes
  for( i = 1; i <= 88; i++ )
  {
    keyFrequency[i] = Math.pow(2, (i-49)/12) * 440;
  }

  var getPlayTime = function( time )
    {
      return time * 60 / bpm + ctx.currentTime;
    };

  var createOscillator = function( key, start, end )
    {
      var oscillator = ctx.createOscillator();
      oscillator.connect(ctx.destination);
      oscillator.type = 'square';
      oscillator.frequency.value = keyFrequency[ key ];
      oscillator.start( getPlayTime( start ) );
      oscillator.stop( getPlayTime( end ) );
    };

  var play = function()
    {
      var notes = PIANO.getNotes( target );

      for( i in notes )
      {
        createOscillator( notes[i].key, notes[i].start, notes[i].end );
      }
    };

  var stop = function()
    {
      // TODO
    };

  var setTempo = function(tempo)
    {
      bpm = tempo;
    };

  // Return the public methods
  return { play: play
         , stop: stop
         , setTempo: setTempo
         };

})();
