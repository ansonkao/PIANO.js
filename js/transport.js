var Transport = (function(){

  var keyFrequency = [];
  var oscillator = [];
  var bpm = 105;
  var ctx = new AudioContext();
  var masterVolume = ctx.createGain();
  var stopRequested = false;
  var isPlaying = false;

  var notes = [];
  
  var taskMgr = setInterval(function () {processTasks()}, 5);
  
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
      if(velocity >= 0.0 && velocity <= 1.0)
      	masterVolume.gain.value = velocity;
      oscillator.connect( masterVolume );
      oscillator.type = 'square';
      oscillator.frequency.value = keyFrequency[ key ];
      oscillator.start( getPlayTime( start ) );
      oscillator.stop( getPlayTime( end ) );
    };

  var play = function()
    {
      notes = PIANO.getNotes( target );
      isPlaying = true;
	  stopRequested = false;
      for( var i in notes )
      {
        if(stopRequested === false)
        {
	        //stopRequested = false;

    	
        	createOscillator( notes[i].key, notes[i].start, notes[i].end, notes[i].velocity );
        }
      }
    };

  var stop = function()
    {
    	isPlaying = false;
      stopRequested = true;
      playTime = 0.00;
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
