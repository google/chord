# Chord: Scripting Cross-Device Interactions

Chord is a framework for developers to create cross-device wearable interaction
by scripting. This directory contains the implementation for the Chord framework
and a viewer for a set of interactive emulators.

This project is previously named "Weave". We renamed this project to avoid
confusion with the [Brillo and Weave
platform](https://developers.google.com/brillo/).

## Goals

Chord provides a set of high-level APIs, based on JavaScript, for developers to
easily distribute UI output and combine user input and sensing events across
devices. These high-level APIs as well as their underlying scripting concepts
allow developers to focus on their target interaction behaviors and think about
target devices regarding their capabilities and affordances, rather than
low-level specifications.

Chord also contributes an environment for developers to test cross-device
behaviors, and when ready, deploy these behaviors to its runtime environment on
users’ ad-hoc network of mobile and wearable devices.

## Requirements and Setup

Chord is implemented as a Chrome packaged app. Please install
[Chrome](https://www.google.com/chrome/browser/) and load the directory /viewer
(see [instructions to launch a Chrome app]
(https://developer.chrome.com/apps/first_app#five)).

## Progress

This current version enables developers to load sample codes and interact with
the emulators. In our next update, users will be able to load their Chord
script, connect live Android devices on the network, and test with devices.

## Publication

This work has been published at [CHI 2015](http://chi2015.acm.org):

* Pei-Yu (Peggy) Chi and Yang Li. 2015. Weave: Scripting Cross-Device Wearable
Interaction. In *Proceedings of the 33rd Annual ACM Conference on Human Factors
in Computing Systems (CHI 2015)*. ACM, New York, NY, USA, 3923-3932.
DOI=http://dx.doi.org/10.1145/2702123.2702451

## Disclaimer

This is not an official Google product. The application uses third party
libraries listed under the directory third_party.

## Contacts

This package is active and maintained. If you have any questions, please send
them to:

[Peggy Chi](http://www.cs.berkeley.edu/~peggychi/)
[(peggychi@cs.berkeley.edu](mailto:peggychi@cs.berkeley.edu)) and Yang
[Li](http://yangl.org/) (yangli@acm.org](mailto:yangli@acm.org))

![Chord UI](/docs/img/chord_UI.png)
