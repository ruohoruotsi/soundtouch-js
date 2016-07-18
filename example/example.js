//AC polyfill
window.AudioContext = window.AudioContext ||
  window.webkitAudioContext ||
  window.mozAudioContext ||
  window.oAudioContext ||
  window.msAudioContext

var context = new AudioContext();

var pitchshifter, buffer;

//GET AUDIO FILE
var request = new XMLHttpRequest();
request.open('GET', 'christina_01.wav', true);
request.responseType = 'arraybuffer';

request.onload = function() {
    console.log('url loaded');
    context.decodeAudioData(request.response, function(buf) {
        //we now have the audio data
        buffer = buf;
        console.log('decoded');
        pitchshifter = new PitchShifter(context, buffer, 64);
        pitchshifter.tempo = 0.95;

        // playback right-away upon page-refresh, we'll do this in play()
        // console.log("default playback rate: " + pitchshifter.tempo)
        // pitchshifter.connect(context.destination);
    });
}

console.log('reading url');
request.send();

// PLAYBACK
function play() {
    pitchshifter.connect(context.destination);
    console.log("default playback rate: " + pitchshifter.tempo)
    console.log("play")
}

function pause() {
    pitchshifter.disconnect();
}

document.getElementById('tempoSlider').addEventListener('input', function(){
    pitchshifter.tempo = this.value;
});

document.getElementById('pitchSlider').addEventListener('input', function(){
    pitchshifter.pitch = this.value;
});