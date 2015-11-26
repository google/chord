/**
 * Copyright 2015 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS-IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

 /* Slideshow using default operator */

chord.launchMethod = chord.launchOption.default;

function service() {
  var photoIdx = 1, numOfPhotos = 4;
  var img = '<img id="imgView" src="img/' + photoIdx + '.jpg"/>';

  // photo viewer
  var viewer = chord.select('.showable[size="normal"]')
    .show(img);

  // remote control
  chord.select('.showable[size="small"].touchable')
    .show(chord.getLayoutById('controller'))
    .on('tap:button', function(event) {
      if (event.getValue() === 'prev') {
        photoIdx--;
        if (photoIdx < 1) {
          photoIdx = numOfPhotos;
        }
      } else if (event.getValue() === 'next') {
        photoIdx++;
        if (photoIdx > numOfPhotos) {
          photoIdx = 1;
        }
      }
      updatePhoto(viewer, photoIdx);
    });

  function updatePhoto(viewer, photoIdx) {
    viewer.updateUIAttr('imgView', 'src', 'img/' + photoIdx + '.jpg');
  }
}

