# Live Audio (JavaScript)

This is a Web Audio API-based library for game audio synthesis and background music playback, following the Live.js ecosystem patterns. It provides a comprehensive collection of synthesized sound effects and MP3 background music support with visualization capabilities.

## Features

- **Synthesized Sound Effects**: Classic game sounds including jump, coin, power-up, death, explosion, laser, and animal sounds
- **Background Music**: MP3 playback with loop points and volume control  
- **Audio Visualization**: Real-time waveform display with quality monitoring
- **Anti-Clipping Protection**: Built-in gain management to prevent audio distortion
- **Modular Architecture**: Clean separation between sound synthesis, output routing, and visualization
- **Live.js Pattern Compliance**: Follows established patterns from the Live.js ecosystem

## Basic Usage

### Recommended Setup (Live.js pattern)

```html
<script type="module">
  import { Audio } from '@socketry/live-audio';
  import { MeowSound, ExplosionSound, BackgroundMusicSound } from '@socketry/live-audio/Live/Audio/Library.js';
  
  // Audio.start() pattern - follows Live.js conventions
  window.liveAudio = Audio.start();
  
  // Add sounds using the controller
  const meow = new MeowSound();
  const explosion = new ExplosionSound();
  const music = new BackgroundMusicSound('/assets/music.mp3', 10.0, 45.0);
  
  window.liveAudio.addSound('meow', meow);
  window.liveAudio.addSound('explosion', explosion);
  window.liveAudio.addSound('music', music);
  window.liveAudio.setVolume(0.8);
  
  // Play sounds anywhere in your app
  window.liveAudio.playSound('meow');
</script>
```

### Alternative: Direct Controller Usage

```javascript
import { Audio } from '@socketry/live-audio';
import { CoinSound, LaserSound } from '@socketry/live-audio/Live/Audio/Library.js';

const controller = Audio.start();

// Add and play sounds
const coin = new CoinSound();
const laser = new LaserSound();
controller.addSound('coin', coin);
controller.addSound('laser', laser);
controller.playSound('coin');
controller.setVolume(0.8);
```

## Project Structure

The library follows Live.js ecosystem patterns with a clean modular architecture:

```
@socketry/live-audio/
├── Live/
│   ├── Audio.js              # Main module - exports Controller, Sound, Visualizer
│   └── Audio/
│       ├── Controller.js     # Audio controller with window-keyed shared instances
│       ├── Sound.js          # Base Sound class for custom sounds
│       ├── Output.js         # Audio routing and master volume control  
│       ├── Visualizer.js     # Real-time waveform visualization
│       └── Library.js        # Collection of pre-built game sounds
└── test/
    └── LiveAudio.js          # Comprehensive test suite
```

### Import Patterns

```javascript
// Main Audio namespace (recommended)
import { Audio } from '@socketry/live-audio';

// Essential classes for advanced usage
import { Controller, Sound } from '@socketry/live-audio';

// Full access including visualization
import { Controller, Sound, Visualizer, Output } from '@socketry/live-audio';

// Pre-built sound library - individual imports (recommended)
import { MeowSound, ExplosionSound, BackgroundMusicSound } from '@socketry/live-audio/Live/Audio/Library.js';

// Pre-built sound library - namespace import
import * as Library from '@socketry/live-audio/Live/Audio/Library.js';
```

## API Reference

### Audio (Main Namespace)

The primary entry point following Live.js conventions.

#### Methods

- `Audio.start(options)` - Create a new controller instance (recommended)
  - `options.window` - The window object to use (defaults to globalThis)
  - Returns the controller instance
- `Audio.Controller` - Direct access to Controller class for advanced usage

#### Example

```javascript
import { Audio } from '@socketry/live-audio';
import { JumpSound } from '@socketry/live-audio/Live/Audio/Library.js';

const controller = Audio.start();
const jump = new JumpSound();
controller.addSound('jump', jump);
controller.setVolume(0.8);
```

### Controller

The main audio controller class that manages all sound playbook and audio context.

#### Constructor

- `new Controller(window)` - Create a controller instance
  - `window` - The window object to use (defaults to globalThis)

#### Factory Methods

- `Audio.start(options)` - Create a controller instance (recommended approach)

#### Instance Methods

- `addSound(name, soundInstance)` - Add a sound instance to the controller
- `playSound(name)` - Play a sound by name
- `stopSound(name)` - Stop a sound by name
- `stopAllSounds()` - Stop all sounds
- `listSounds()` - Get array of available sound names
- `removeSound(name)` - Remove a sound from the controller
- `setVolume(volume)` - Set master volume (0.0 to 1.0)
- `enableVisualization()` - Enable audio visualization
- `disableVisualization()` - Disable audio visualization
- `getSound(name)` - Get direct access to a sound instance

### Sound

Base class for creating custom sound effects. Extend this class to create your own synthesized sounds.

```javascript
import { Sound } from '@socketry/live-audio';

class CustomSound extends Sound {
	start(output) {
		const audioContext = output.audioContext;
		const oscillator = audioContext.createOscillator();
		const gainNode = audioContext.createGain();
		
		oscillator.type = 'sine';
		oscillator.frequency.value = 440;
		
		this.createEnvelope(audioContext, gainNode, 0.01, 0.1, 0.5, 0.2, 0.5);
		
		oscillator.connect(gainNode);
		gainNode.connect(output.input);
		
		oscillator.start();
		oscillator.stop(audioContext.currentTime + 0.5);
	}
}
```

### Visualizer

Audio analysis and visualization component that provides real-time waveform display and audio quality monitoring.

- Clipping detection and visualization
- Audio pop/click detection
- Rolling peak level monitoring
- Real-time waveform display

## Built-in Sound Library

The library includes a comprehensive collection of pre-built sound classes in `Library.js`:

### Game Sound Effects
- `JumpSound` - Classic platform game jump sound
- `CoinSound` - Collectible pickup sound
- `PowerUpSound` - Power-up acquisition sound
- `DeathSound` - Game over sound
- `ExplosionSound` - Explosive sound with multiple rumble layers
- `LaserSound` - Sci-fi laser sound
- `BeepSound` - Simple notification beep
- `BlipSound` - Short UI interaction sound

### Animal Sounds
- `MeowSound` - Cat meow with frequency modulation
- `BarkSound` - Dog bark with formant filtering
- `RoarSound` - Lion roar with noise texture
- `ChirpSound` - Bird chirp sound
- `HowlSound` - Wolf howl with harmonic sweep
- `DuckSound` - Duck quack with FM synthesis
- `AlienSound` - Alien sound with ring modulation

### Background Music
- `BackgroundMusicSound(url, loopStart, loopEnd)` - MP3 background music with required URL and loop points

### Usage Example

```javascript
import { Audio } from '@socketry/live-audio';
import { MeowSound, ExplosionSound, BackgroundMusicSound } from '@socketry/live-audio/Live/Audio/Library.js';

const controller = Audio.start();

// Add sounds from the library
const meow = new MeowSound();
const explosion = new ExplosionSound();
const music = new BackgroundMusicSound('/assets/background.mp3', 10.5, 45.2); // Custom URL and loop points

controller.addSound('meow', meow);
controller.addSound('explosion', explosion);
controller.addSound('music', music);

// Play them
controller.playSound('meow');
controller.playSound('explosion');
controller.playSound('music');
```

## Audio Context Management

The library automatically manages a shared AudioContext to avoid browser limitations and ensure optimal performance:

- Automatic context creation and resumption
- Safari compatibility with proper latency handling
- Shared instance pattern to prevent multiple contexts
- Graceful degradation when audio is unavailable

## Browser Compatibility

- Modern browsers with Web Audio API support
- Handles browser autoplay policies
- Safari-specific optimizations for reduced latency
- Fallback behavior when audio context is unavailable

## License

This library is released under the MIT License.
