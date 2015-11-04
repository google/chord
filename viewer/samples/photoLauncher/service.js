/* Photo launcher */

weave.launchMethod = weave.launchOption.default;

var service = function() {
  var photo = '<img src="img/photo.jpg"/>';
  weave.select('.shakable[size="small"]')
    .show('<button>show photo</button>')
    .on('tap:button', function(event) {
      event.getDevice()
        .show('calling Steve')
        .call('650-123-4567');
      weave.select(':tablet[os="android"]')
       .show(photo);
   });
};
