/* Bump: shake 2+ devices to join as a group */

weave.launchMethod = weave.launchOption.default;

function service() {
  weave.select('.showable.shakable.speakable')
    .all({minNumOfDevices: 2}) // at least 2 devices
    .show('Bump to join')
    .on('shake', function(event) {
      event.getDevices().show('Welcome to the group!')
        .play('audio/success.mp3');
    });
}
