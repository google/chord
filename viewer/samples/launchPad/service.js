/**
 * Copyright 2015 The Chord Authors. All Rights Reserved.
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

/**
 * @fileoverview Cross-device launch pad for multiple apps.
 */

chord.launchMethod = chord.launchOption.default;

function service() {
  chord.select('.showable[size="small"].touchable')
    .show(chord.getLayoutById('panel'))
    .on('tap:button', function(event) {
      chord.select('.showable[size="normal"]')
        .not(event.getDevice())
        .startApp(event.getValue()); // e.g. 'GoogleMaps'
    });
}
