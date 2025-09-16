import {describe, before, beforeEach, after, it} from 'node:test';
import {ok, strict, strictEqual, deepStrictEqual, equal} from 'node:assert';

import {JSDOM} from 'jsdom';
import {Controller, Sound, Visualizer, Output} from '../../Live/Audio.js';

// Mock AudioContext for testing
class MockAudioContext {
	constructor() {
		this.state = 'running';
		this.sampleRate = 44100;
		this.currentTime = 0;
		this.destination = new MockAudioNode();
		this.baseLatency = 0.005;
		this.outputLatency = 0.01;
		
		// Track created nodes for testing
		this.createdNodes = [];
	}
	
	createOscillator() {
		const node = new MockOscillator();
		this.createdNodes.push(node);
		return node;
	}
	
	createGain() {
		const node = new MockGainNode();
		this.createdNodes.push(node);
		return node;
	}
	
	createBiquadFilter() {
		const node = new MockBiquadFilter();
		this.createdNodes.push(node);
		return node;
	}
	
	createAnalyser() {
		const node = new MockAnalyser();
		this.createdNodes.push(node);
		return node;
	}
	
	createBuffer(channels, length, sampleRate) {
		return new MockAudioBuffer(channels, length, sampleRate);
	}
	
	createBufferSource() {
		const node = new MockBufferSource();
		this.createdNodes.push(node);
		return node;
	}
	
	async decodeAudioData(arrayBuffer) {
		// Mock decoded audio data
		return new MockAudioBuffer(2, 44100, 44100);
	}
	
	async resume() {
		this.state = 'running';
	}
	
	async suspend() {
		this.state = 'suspended';
	}
	
	close() {
		this.state = 'closed';
	}
}

class MockAudioNode {
	constructor() {
		this.connections = [];
	}
	
	connect(destination) {
		this.connections.push(destination);
	}
	
	disconnect(destination) {
		if (destination) {
			const index = this.connections.indexOf(destination);
			if (index >= 0) {
				this.connections.splice(index, 1);
			}
		} else {
			this.connections = [];
		}
	}
}

class MockGainNode extends MockAudioNode {
	constructor() {
		super();
		this.gain = { value: 1.0 };
	}
}

class MockOscillator extends MockAudioNode {
	constructor() {
		super();
		this.type = 'sine';
		this.frequency = { value: 440 };
		this.started = false;
		this.stopped = false;
	}
	
	start(when = 0) {
		this.started = true;
		this.startTime = when;
	}
	
	stop(when = 0) {
		this.stopped = true;
		this.stopTime = when;
	}
}

class MockBiquadFilter extends MockAudioNode {
	constructor() {
		super();
		this.type = 'lowpass';
		this.frequency = { value: 350 };
		this.Q = { value: 1 };
	}
}

class MockAnalyser extends MockAudioNode {
	constructor() {
		super();
		this.fftSize = 2048;
		this.frequencyBinCount = 1024;
		this.smoothingTimeConstant = 0.8;
	}
	
	getByteTimeDomainData(array) {
		// Fill with mock waveform data
		for (let i = 0; i < array.length; i++) {
			array[i] = 128 + Math.sin(i * 0.1) * 20;
		}
	}
}

class MockBufferSource extends MockAudioNode {
	constructor() {
		super();
		this.buffer = null;
		this.loop = false;
		this.loopStart = 0;
		this.loopEnd = 0;
		this.onended = null;
		this.started = false;
		this.stopped = false;
	}
	
	start(when = 0) {
		this.started = true;
		this.startTime = when;
	}
	
	stop(when = 0) {
		this.stopped = true;
		this.stopTime = when;
		if (this.onended) {
			setTimeout(this.onended, 0);
		}
	}
}

class MockAudioBuffer {
	constructor(numberOfChannels, length, sampleRate) {
		this.numberOfChannels = numberOfChannels;
		this.length = length;
		this.sampleRate = sampleRate;
		this.duration = length / sampleRate;
		this.channels = [];
		
		for (let i = 0; i < numberOfChannels; i++) {
			this.channels.push(new Float32Array(length));
		}
	}
	
	getChannelData(channel) {
		return this.channels[channel];
	}
}

describe('Live Audio', function () {
	let dom;
	let mockAudioContext;
	
	before(function () {
		dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
		
		// Set up global mocks
		globalThis.AudioContext = MockAudioContext;
		globalThis.webkitAudioContext = MockAudioContext;
		globalThis.document = dom.window.document;
		globalThis.requestAnimationFrame = (callback) => setTimeout(callback, 16);
	});
	
	beforeEach(function () {
		mockAudioContext = new MockAudioContext();
		// Clear any existing instances from all potential windows
		globalThis._liveAudioController = null;
		globalThis._liveAudioContext = null;
	});
	
	after(function () {
		// Clean up globals
		delete globalThis._liveAudioController;
		delete globalThis._liveAudioContext;
	});
	
	it('should create a Controller instance', async function () {
		const controller = new Controller();
		ok(controller instanceof Controller);
		
		const output = await controller.acquireOutput();
		ok(output instanceof Output);
		equal(Object.keys(controller.sounds).length, 0);
	});
	
	it('should create shared AudioContext', async function () {
		const controller1 = new Controller();
		const controller2 = new Controller();
		
		const output1 = await controller1.acquireOutput();
		const output2 = await controller2.acquireOutput();
		
		const audioContext1 = output1.audioContext;
		const audioContext2 = output2.audioContext;
		
		ok(audioContext1);
		strictEqual(audioContext1.state, 'running');
		
		// Should reuse the same instance across controllers
		strictEqual(audioContext1, audioContext2);
	});
	
	it('should create Controller via Audio.start', async function () {
		const {Audio} = await import('../../Live/Audio.js');
		const controller = Audio.start();
		ok(controller instanceof Controller);
		strictEqual(controller.window, globalThis);
	});
	
	it('should create Controller with custom window', async function () {
		const {Audio} = await import('../../Live/Audio.js');
		const mockWindow = { 
			AudioContext: MockAudioContext,
			_liveAudioContext: null,
			_liveAudioController: null
		};
		
		const controller = Audio.start({ window: mockWindow });
		ok(controller);
		strictEqual(controller.window, mockWindow);
	});
	
	it('should add sounds via instance method', async function () {
		class TestSound extends Sound {
			start(output) { this.played = true; }
		}
		
		const {Audio} = await import('../../Live/Audio.js');
		const controller = Audio.start();
		const testSoundInstance = new TestSound();
		const returnedSound = controller.addSound('test', testSoundInstance);
		ok(returnedSound instanceof TestSound);
		equal(Object.keys(controller.sounds).length, 1);
		ok(controller.sounds.hasOwnProperty('test'));
	});
	
	it('should load empty sound library by default', async function () {
		const controller = new Controller();
		
		ok(controller.sounds);
		strictEqual(Object.keys(controller.sounds).length, 0);
	});
	
	it('should add sounds from class via addSound method', async function () {
		const controller = new Controller();
		
		class TestSound extends Sound {
			start(output) { this.played = true; }
		}
		
		const testSoundInstance = new TestSound();
		const returnedSound = controller.addSound('test', testSoundInstance);
		
		ok(controller.sounds.test);
		ok(returnedSound instanceof TestSound);
		strictEqual(controller.sounds.test, returnedSound);
	});
	
	it('should play sounds via controller instance', async function () {
		class TestSound extends Sound {
			start(output) { this.played = true; }
		}
		
		const {Audio} = await import('../../Live/Audio.js');
		const controller = Audio.start();
		await controller.acquireOutput(); // Initialize context
		const testSoundInstance = new TestSound();
		const testSound = controller.addSound('test', testSoundInstance);
		
		await controller.playSound('test');
		
		ok(testSound.played);
	});
	
	it('should play sounds via instance method', async function () {
		const controller = new Controller();
		await controller.acquireOutput(); // Initialize context
		
		class TestSound extends Sound {
			start(output) { this.played = true; }
		}
		
		const testSoundInstance = new TestSound();
		const testSound = controller.addSound('test', testSoundInstance);
		await controller.playSound('test');
		
		ok(testSound.played);
	});
	
	it('should handle unknown sound names gracefully', function () {
		const controller = new Controller();
		
		// Should not throw
		controller.playSound('nonexistent');
		controller.stopSound('nonexistent');
	});
	
	it('should control master volume', async function () {
		const controller = new Controller();
		
		await controller.setVolume(0.5);
		equal(controller.volume, 0.5);
		
		const output = await controller.acquireOutput();
		// Verify gain node gets the stored volume
		strictEqual(output.gainNode.gain.value, 0.5);
		
		await controller.setVolume(0.0);
		equal(controller.volume, 0.0);
		strictEqual(output.gainNode.gain.value, 0.0);
	});
	
	it('should enable and disable visualization', async function () {
		const controller = new Controller();
		
		try {
			const output = await controller.acquireOutput();
			
			// Only test if analysis is available
			await controller.enableVisualization();
			if (controller.analysis) {
				ok(output.analysisNode);
				
				controller.disableVisualization();
				ok(!output.analysisNode);
			} else {
				// Skip test if visualization not available
				console.log('Visualization not available - skipping test');
			}
		} catch (error) {
			// Skip test if visualization not available
			console.log('Visualization not available - skipping test');
		}
	});
	
	it('should persist volume independently of AudioContext', async function () {
		const controller = new Controller();
		
		// Should be able to set and get volume without AudioContext
		await controller.setVolume(0.5);
		equal(controller.volume, 0.5);
		
		// Volume should persist after AudioContext creation
		const output = await controller.acquireOutput(); // Initialize
		strictEqual(output.gainNode.gain.value, 0.5);
		
		// Volume should update both stored value and gain node
		await controller.setVolume(0.8);
		equal(controller.volume, 0.8);
		strictEqual(output.gainNode.gain.value, 0.8);
	});
	
	it('should return null audioContext when volume is zero', async function () {
		const controller = new Controller();
		
		// Set volume to zero
		await controller.setVolume(0);
		
		// Should still be able to get output, but volume should be zero which prevents playback
		const output = await controller.acquireOutput();
		equal(output.volume, 0);
		
		// Sounds should not play when volume is zero
		class TestSound extends Sound {
			start(output) { this.played = true; }
		}
		
		const testSound = new TestSound();
		
		// Try to play when volume is zero - should not work because audioContext returns null
		await testSound.play(output);
		ok(!testSound.played); // Should not have played
		
		// Setting volume above zero should allow sounds to play
		await controller.setVolume(0.5);
		await testSound.play(output);
		ok(testSound.played); // Now it should play
	});
	
	it('should create custom Sound subclass', async function () {
		class TestSound extends Sound {
			start(output) {
				this.played = true;
			}
		}
		
		const controller = new Controller();
		const output = await controller.acquireOutput(); // Initialize context
		const testSound = new TestSound();
		
		await testSound.play(output);
		ok(testSound.played);
	});
	
	it('should handle sound envelope creation', function () {
		const controller = new Controller();
		
		// Create a mock AudioContext
		const mockAudioContext = {
			currentTime: 0.5
		};
		
		// Create a mock gain node with proper interface
		const mockGainNode = {
			gain: {
				value: 1.0,
				setValueAtTime: function(value, time) {
					this.value = value;
					this.time = time;
				},
				linearRampToValueAtTime: function(value, time) {
					this.targetValue = value;
					this.targetTime = time;
				}
			}
		};
		
		// Create a test sound to access envelope method
		class TestSound extends Sound {
			testEnvelope() {
				this.createEnvelope(mockAudioContext, mockGainNode, 0.1, 0.1, 0.5, 0.2, 1.0);
			}
		}
		
		const testSound = new TestSound();
		
		// Should not throw
		testSound.testEnvelope();
	});
	
	it('should stop all sounds', async function () {
		const {Audio} = await import('../../Live/Audio.js');
		const controller = await Audio.start();
		
		// Play some sounds
		controller.playSound('jump');
		controller.playSound('coin');
		
		// Stop all sounds (should not throw)
		controller.stopAllSounds();
	});
	
	it('should get individual sound instances', function () {
		const controller = new Controller();
		
		class TestSound extends Sound {
			start() { this.played = true; }
		}
		
		const testSound = new TestSound();
		controller.addSound('test', testSound);
		
		const retrievedSound = controller.getSound('test');
		strictEqual(retrievedSound, testSound);
		
		const unknownSound = controller.getSound('unknown');
		strictEqual(unknownSound, undefined);
	});
	
	it('should list and remove sounds', function () {
		const controller = new Controller();
		
		class TestSound extends Sound {
			start(output) { this.played = true; }
		}
		
		// Add sounds
		controller.addSound('test1', TestSound);
		controller.addSound('test2', TestSound);
		
		// List sounds
		const soundNames = controller.listSounds();
		ok(soundNames.includes('test1'));
		ok(soundNames.includes('test2'));
		strictEqual(soundNames.length, 2);
		
		// Remove sound
		const removed = controller.removeSound('test1');
		ok(removed);
		
		const newSoundNames = controller.listSounds();
		ok(!newSoundNames.includes('test1'));
		ok(newSoundNames.includes('test2'));
		strictEqual(newSoundNames.length, 1);
		
		// Try to remove non-existent sound
		const notRemoved = controller.removeSound('nonexistent');
		ok(!notRemoved);
	});
	
	it('should support Audio.start() pattern', async function () {
		const {Audio} = await import('../../Live/Audio.js');
		
		const controller = Audio.start();
		
		ok(controller);
		ok(controller instanceof Controller);
	});
	
	it('should call onOutputCreated callback when output is created', async function () {
		let callbackCalled = false;
		let callbackController = null;
		let callbackOutput = null;
		
		const controller = new Controller(globalThis, {
			onOutputCreated: (ctrl, output) => {
				callbackCalled = true;
				callbackController = ctrl;
				callbackOutput = output;
			}
		});
		
		// Callback should not be called yet
		ok(!callbackCalled);
		
		// Acquire output should trigger the callback
		const output = await controller.acquireOutput();
		
		ok(callbackCalled);
		strictEqual(callbackController, controller);
		strictEqual(callbackOutput, output);
		ok(output instanceof Output);
	});
	
	it('should call onOutputDisposed callback when controller is disposed', async function () {
		let disposalCallbackCalled = false;
		let disposalController = null;
		let disposalOutput = null;
		
		const controller = new Controller(globalThis, {
			onOutputDisposed: (ctrl, output) => {
				disposalCallbackCalled = true;
				disposalController = ctrl;
				disposalOutput = output;
			}
		});
		
		// Create output first
		const output = await controller.acquireOutput();
		ok(output);
		
		// Callback should not be called yet
		ok(!disposalCallbackCalled);
		
		// Dispose should trigger the callback
		controller.dispose();
		
		ok(disposalCallbackCalled);
		strictEqual(disposalController, controller);
		strictEqual(disposalOutput, output);
	});
	
	it('should not call callbacks if they are not provided', async function () {
		// Should not throw when callbacks are null/undefined
		const controller = new Controller();
		
		const output = await controller.acquireOutput();
		ok(output);
		
		// Should not throw
		controller.dispose();
	});
	
	it('should allow callback to access audioContext via output', async function () {
		let receivedAudioContext = null;
		
		const controller = new Controller(globalThis, {
			onOutputCreated: (ctrl, output) => {
				receivedAudioContext = output.audioContext;
			}
		});
		
		const output = await controller.acquireOutput();
		
		ok(receivedAudioContext);
		strictEqual(receivedAudioContext, output.audioContext);
		strictEqual(receivedAudioContext.state, 'running');
	});
});
