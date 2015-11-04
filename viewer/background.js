chrome.app.runtime.onLaunched.addListener(function() {
  var screenWidth = window.screen.availWidth;
  var screenHeight = Math.min(1600, window.screen.availHeight);
  var windowWidth = Math.min(550, Math.round(screenWidth*0.4));
  chrome.app.window.create('index.html', {
    'outerBounds': {
      'width': windowWidth,
      'height': screenHeight,
      'left': screenWidth - windowWidth,
      'top': 0
    },
  });
});