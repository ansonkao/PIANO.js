var Transport = (function(){

  var keyFrequency = [];
  var oscillators = [];
  var bpm = 105;
  var AudioContext = window.AudioContext || window.webkitAudioContext;
  var ctx = new AudioContext();
  var masterVolume = ctx.createGain();

  // Initialize everything;
  masterVolume.connect( ctx.destination );
  masterVolume.gain.value = 0.25;


  key('space', function(){ playAll(); return false; });


  // Set the frequencies for the notes
  for( i = 1; i <= 88; i++ )
  {
    keyFrequency[i] = Math.pow(2, (i-49)/12) * 440;
  }

  var getPlayTime = function( time )
    {
      return time * 120 / bpm + ctx.currentTime;
    };

  var createOscillator = function( key, start, end, velocity )
    {
      var oscillator = ctx.createOscillator();
      var gainNode = ctx.createGain();
      gainNode.connect(masterVolume);
      gainNode.gain.value = velocity / 127;
      oscillator.connect( gainNode );
      oscillator.type = 'square';
      oscillator.frequency.value = keyFrequency[ key ];
      oscillator.start( getPlayTime( start ) );
      oscillator.stop( getPlayTime( end ) );
    };

  var playAll = function()
    {
      var notes = PIANO.getAllNotes();

      for( var i in notes )
      {
        createOscillator( notes[i].key, notes[i].start, notes[i].end, notes[i].velocity );
      }
    };
  var playSingleNote = function( key, velocity )
    {
      var currentOscillator = oscillators[key];

      // Create oscillator if necessary
      if( ! currentOscillator )
      {
        // Velocity = 0 means NOTE OFF - don't do anything
        if( velocity <= 0 )
          return;

        oscillators[key] = ctx.createOscillator();
        currentOscillator = oscillators[key];
      }

      // Modulate
      if( velocity <= 0 )
      {
        currentOscillator.stop();
        oscillators[key] = null;
      }
      else
      {
        // Amplitude Envelope
        var amplitudeEnvelope = ctx.createGain();
        amplitudeEnvelope.connect(masterVolume);
        amplitudeEnvelope.gain.value = velocity / 127;

        // Oscillator config
        currentOscillator.connect( amplitudeEnvelope );
        currentOscillator.type = 'square';
        currentOscillator.frequency.value = keyFrequency[ key ];
        currentOscillator.start();
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
  return { playAll: playAll
         , playSingleNote: playSingleNote
         , stop: stop
         , setTempo: setTempo
         };

})();
