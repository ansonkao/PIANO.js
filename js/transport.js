var Transport = (function(){

  var keyFrequency = [];
  var oscillators = [];
  var amplitudeEnvelopes = [];
  var filterEnvelopes = [];
  var bpm = 256;
  var AudioContext = window.AudioContext || window.webkitAudioContext;
  var ctx = new AudioContext();
  var masterBus = ctx.createGain();
  var reverb = ctx.createConvolver();
  var reverbDry = ctx.createGain();
  var reverbWet = ctx.createGain();
  var masterVolume = ctx.createGain();
  var analyser1 = ctx.createAnalyser();
  var playing = false;
  var scheduleLoopers = [];


  // Initialize everything;
  masterBus.connect( reverb );
  masterBus.connect( reverbDry );
  reverb.connect( reverbWet );
  reverbWet.connect( analyser1 );
  reverbWet.gain.value = 0;
  reverbDry.connect( analyser1 );
  reverbDry.gain.value = 1;
  analyser1.connect( masterVolume );
  masterVolume.connect( ctx.destination );
  masterVolume.gain.value = 0.25;

  // Reverb Convolution Impulse Response
  ajaxRequest = new XMLHttpRequest();
  ajaxRequest.open('GET', '/demo/impulse.wav', true);
  ajaxRequest.responseType = 'arraybuffer';
  ajaxRequest.onload = function() {
    var audioData = ajaxRequest.response;
    ctx.decodeAudioData(audioData, function(buffer){
      reverb.buffer = buffer;
    }, function(e){
      console.error( e );
    });
  };
  ajaxRequest.send();

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
      playing = true;

      var playStart = ctx.currentTime;
      var barsPerLoop = 4;
      var notes = jQuery.extend( true, [], PIANO.getAllNotes() );
      notes.sort(function(noteA, noteB){
        return noteA.start - noteB.start;
      });
      var loop = 0;

      var newScheduleLooper = setInterval(function(){

        // Schedule up to the next 100 ms worth of notes
        PIANO.refreshView();
        var startTime = getPlayTime( notes[0].start + loop*barsPerLoop, playStart );
        var   endTime = getPlayTime( notes[0].end   + loop*barsPerLoop, playStart );
        while( startTime <= ctx.currentTime + 0.40 )
        {
          PIANO.renderLiveNote( notes[0] ); // REALLY BAD!!! TIGHTLY COUPLED, BREAK OUT VIA PUB SUB PATTERN
          playSingleNote( notes[0].key, notes[0].velocity, startTime + 0.1, endTime + 0.1); // Offset by 0.1s to prevent missed notes? TODO investigate!
          notes.splice(0,1);  // Remove from queue
          if( notes.length < 1)
            break;
          startTime = getPlayTime( notes[0].start + loop*barsPerLoop, playStart );
            endTime = getPlayTime( notes[0].end   + loop*barsPerLoop, playStart );
        }

        // Reached the end of loop - queue up next loop
        if( notes.length === 0)
        {
          loop++;
          notes = jQuery.extend( true, [], PIANO.getAllNotes() );
          notes.sort(function(noteA, noteB){
            return noteA.start - noteB.start;
          });
        }

      }, 25);

      scheduleLoopers.push(newScheduleLooper);
    };


  var playSingleNote = function( key, velocity, startTime, endTime )
    {
      startTime = startTime || ctx.currentTime;

      var attackVolume  = 0.001;
      var releaseVolume = 1.001;

      var attackFilter  = 0;//1.0 * globalEffect1;
      var decayFilter   = 0.05 + 0.05 * globalEffect1;
      var releaseFilter = 0.1;
      var filterPeak    = 20000 * globalEffect1;


      var amplitudeEnvelope = amplitudeEnvelopes[key];
      var filterEnvelope = filterEnvelopes[key];
      var currentOscillator = oscillators[key];

      // Create Filter Envelope if necessary
      if( ! filterEnvelope )
      {
        filterEnvelopes[key] = ctx.createBiquadFilter();
        filterEnvelope = filterEnvelopes[key];
        filterEnvelope.connect(masterBus);
        filterEnvelope.frequency.value = 0.0;
        filterEnvelope.type = "lowpass";
      }

      // Create Amplitude Envelope if necessary
      if( ! amplitudeEnvelope )
      {
        amplitudeEnvelopes[key] = ctx.createGain();
        amplitudeEnvelope = amplitudeEnvelopes[key];
        amplitudeEnvelope.connect(filterEnvelope);
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
        filterEnvelope.frequency.cancelScheduledValues( startTime );
        filterEnvelope.frequency.setValueAtTime( 0.0, startTime );
        filterEnvelope.frequency.setTargetAtTime( filterPeak, startTime, attackFilter );
        amplitudeEnvelope.gain.cancelScheduledValues( startTime );
        amplitudeEnvelope.gain.setValueAtTime( 0.0, startTime );
        amplitudeEnvelope.gain.setTargetAtTime( velocity/127, startTime, attackVolume );

        // Decay
        filterEnvelope.frequency.setTargetAtTime( 0, startTime + attackFilter + 0.01, decayFilter );

        // Release
        if( endTime )
        {
          amplitudeEnvelope.gain.setTargetAtTime( 0.0, endTime, releaseVolume );
        }
      }
      // Release the current envelope
      else
      {
        // Release
        amplitudeEnvelope.gain.cancelScheduledValues(startTime);
        amplitudeEnvelope.gain.setTargetAtTime( 0.0, startTime, releaseVolume );
      }
    };
  var stop = function()
    {
      playing = false;
      scheduleLoopers.forEach(function(scheduleLooper){
        clearInterval(scheduleLooper);
      });

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
         , setReverbWetMix: function(wet) {
              var wetValue = wet;
                  wetValue = wetValue > 1 ? 1 : wetValue;
                  wetValue = wetValue < 0 ? 0 : wetValue;
              reverbDry.gain.value = 1 - wetValue;
              reverbWet.gain.value = wetValue;
           }
         };

})();
