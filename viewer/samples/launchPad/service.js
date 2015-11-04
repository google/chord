/* Cross-device launch pad */

weave.launchMethod = weave.launchOption.default;

var service = function() {
  weave.select('.showable[size="small"].touchable')
    .show('<button value="Calendar">Calendar</button>')
    .on('tap:button', function(event) {
      event.getDevice().show('launching app...');
      weave.select('.showable[size="normal"]')
        .show('retrieving calendar data...')
        .startApp('Calendar');
    });
};
