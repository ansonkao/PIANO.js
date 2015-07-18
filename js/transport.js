var Transport = (function(){

  var keyFrequency = [];
  var oscillators = [];
  var amplitudeEnvelopes = [];
  var bpm = 105;
  var AudioContext = window.AudioContext || window.webkitAudioContext;
  var ctx = new AudioContext();
  var masterVolume = ctx.createGain();
  var analyser1 = ctx.createAnalyser();

  // Initialize everything;
  analyser1.connect( masterVolume );
  masterVolume.connect( ctx.destination );
  masterVolume.gain.value = 0.25;


  // ==========================================================================
  // Analyser (MOVE THIS LATER!)
  // ==========================================================================
  analyser1.fftSize = 2048;
  var bufferLength1 = analyser1.fftSize;
  var dataArray1 = new Uint8Array(bufferLength1);

  analyserCanvas1 = document.getElementById('analyser1').getContext("2d");

  function drawAnalyser1()
  {
    drawVisual = requestAnimationFrame(drawAnalyser1);
    analyser1.getByteTimeDomainData(dataArray1);

    analyserCanvas1.clear();
    analyserCanvas1.fillStyle = 'transparent';
    analyserCanvas1.fillRect(0, 0, 200, 100);
    analyserCanvas1.lineWidth = 2;
    analyserCanvas1.strokeStyle = 'rgb(0, 255, 0)';
    analyserCanvas1.beginPath();

    var sliceWidth = 200 * 1.0 / bufferLength1;
    var x = 0;

    for(var i = 0; i < bufferLength1; i++)
    {
      var v = dataArray1[i] / 128.0;
      var y = v * 100/2;
      if(i === 0)
        analyserCanvas1.moveTo(x, y);
      else
        analyserCanvas1.lineTo(x, y);
      x += sliceWidth;
    }

    analyserCanvas1.lineTo(200, 100/2);
    analyserCanvas1.stroke();
  }
  drawAnalyser1();
  // ==========================================================================
  // END Analyser
  // ==========================================================================

  key('space', function(){ playAll(); return false; });


  // Set the frequencies for the notes
  for( i = 1; i <= 88; i++ )
  {
    keyFrequency[i] = Math.pow(2, (i-49)/12) * 440;
  }

  var getPlayTime = function( time, playStart )
    {
      // Playstart is the moment when the "PLAY" button was pressed. If not provided, default to now.
      playStart = playStart || ctx.currentTime;

      return time * 120 / bpm + playStart;
    };

  var playAll = function()
    {
      var playStart = ctx.currentTime;
      var notes = PIANO.getAllNotes();

      for( var loop = 0; loop < 100; loop++ )
      {
        for( var i in notes )
        {
          var startTime = getPlayTime( notes[i].start + loop*4, playStart );
          var   endTime = getPlayTime( notes[i].end   + loop*4, playStart );
          playSingleNote( notes[i].key, notes[i].velocity, startTime, endTime );
        }
      }
    };
  var playSingleNote = function( key, velocity, startTime, endTime )
    {
      startTime = startTime || ctx.currentTime;

      var amplitudeEnvelope = amplitudeEnvelopes[key];
      var currentOscillator = oscillators[key];

      // Create Amplitude Envelope if necessary
      if( ! amplitudeEnvelope )
      {
        amplitudeEnvelopes[key] = ctx.createGain();
        amplitudeEnvelope = amplitudeEnvelopes[key];
        amplitudeEnvelope.connect(analyser1);
        amplitudeEnvelope.gain.value = 0.0;
      }

      // Create oscillator if necessary
      if( ! currentOscillator )
      {
        oscillators[key] = ctx.createOscillator();
        currentOscillator = oscillators[key];
        currentOscillator.connect( amplitudeEnvelope );
        currentOscillator.start(ctx.currentTime);
      }

      // Set the synth
      currentOscillator.type = 'sawtooth';
      currentOscillator.frequency.value = keyFrequency[ key ];

      // Start a new envelope
      if( velocity > 0 )
      {
        // Attack
        amplitudeEnvelope.gain.cancelScheduledValues( startTime );
        amplitudeEnvelope.gain.setValueAtTime( 0.0, startTime );
        amplitudeEnvelope.gain.setTargetAtTime( velocity/127, startTime, 0.25 );

        // Release
        if( endTime )
        {
          amplitudeEnvelope.gain.setTargetAtTime( 0.0, endTime, 0.25 );
        }
      }
      // Release the current envelope
      else
      {
        // Release
        amplitudeEnvelope.gain.cancelScheduledValues(startTime);
        amplitudeEnvelope.gain.setTargetAtTime( 0.0, startTime, 0.25 );
      }
    };
  var stop = function()
    {
      amplitudeEnvelopes.forEach(function(amplitudeEnvelope){
        if( amplitudeEnvelope )
        {
          amplitudeEnvelope.gain.cancelScheduledValues(ctx.currentTime);
          amplitudeEnvelope.gain.setValueAtTime( 0.0, ctx.currentTime );
        }
      });
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
