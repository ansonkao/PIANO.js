var Transport = (function(){

  var keyFrequency = [];
  var oscillator = [];
  var bpm = 105;
  var AudioContext = window.AudioContext || window.webkitAudioContext;
  var ctx = new AudioContext();
  var masterVolume = ctx.createGain();

  // Initialize everything;
  masterVolume.connect( ctx.destination );
  masterVolume.gain.value = 0.25;


  key('space', function(){ play(); return false; });


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

  var play = function()
    {
      var notes = PIANO.getAllNotes();

      for( var i in notes )
      {
        createOscillator( notes[i].key, notes[i].start, notes[i].end, notes[i].velocity );
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
