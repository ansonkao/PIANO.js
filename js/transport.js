var Transport = (function(){

  var keyFrequency = [];
  var oscillators = [];
  var bpm = 105;
  var AudioContext = window.AudioContext || window.webkitAudioContext;
  var ctx = new AudioContext();
  var masterVolume = ctx.createGain();
  var analyser1 = ctx.createAnalyser();
  var analyser2 = ctx.createAnalyser();

  // Initialize everything;
  masterVolume.connect( ctx.destination );
  //masterVolume.connect( analyser2 );
  masterVolume.gain.value = 0.25;


  // ==========================================================================
  // Analyser (MOVE THIS LATER!)
  // ==========================================================================
  analyser1.fftSize = 2048;
  analyser2.fftSize = 2048;
  var bufferLength1 = analyser2.fftSize;
  var bufferLength2 = analyser2.fftSize;
  var dataArray1 = new Uint8Array(bufferLength1);
  var dataArray2 = new Uint8Array(bufferLength2);

  analyserCanvas1 = document.getElementById('analyser1').getContext("2d");
  analyserCanvas2 = document.getElementById('analyser2').getContext("2d");

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
  function drawAnalyser2()
  {
    drawVisual = requestAnimationFrame(drawAnalyser2);
    analyser2.getByteTimeDomainData(dataArray2);

    analyserCanvas2.clear();
    analyserCanvas2.fillStyle = 'transparent';
    analyserCanvas2.fillRect(0, 0, 200, 100);
    analyserCanvas2.lineWidth = 2;
    analyserCanvas2.strokeStyle = 'rgb(0, 255, 0)';
    analyserCanvas2.beginPath();

    var sliceWidth = 200 * 1.0 / bufferLength2;
    var x = 0;

    for(var i = 0; i < bufferLength2; i++)
    {
      var v = dataArray2[i] / 128.0;
      var y = v * 100/2;
      if(i === 0)
        analyserCanvas2.moveTo(x, y);
      else
        analyserCanvas2.lineTo(x, y);
      x += sliceWidth;
    }

    analyserCanvas2.lineTo(200, 100/2);
    analyserCanvas2.stroke();
  }
  drawAnalyser1();
  drawAnalyser2();
  // ==========================================================================
  // END Analyser
  // ==========================================================================

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
        currentOscillator.stop(ctx.currentTime);
        oscillators[key] = null;
      }
      else
      {
        // Amplitude Envelope
        var amplitudeEnvelope = ctx.createGain();
        amplitudeEnvelope.connect(masterVolume);
        amplitudeEnvelope.gain.setValueAtTime( 0.0001, ctx.currentTime );
        amplitudeEnvelope.gain.linearRampToValueAtTime( velocity/127, ctx.currentTime + 0.2 );
        amplitudeEnvelope.connect( analyser2 );

        // Oscillator config
        currentOscillator.connect( analyser1 );
        currentOscillator.connect( amplitudeEnvelope );
        currentOscillator.type = 'square';
        currentOscillator.frequency.value = keyFrequency[ key ];
        currentOscillator.start(ctx.currentTime);
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
