// Live Audio Library
// Web Audio API-based collection for game sounds and background music

import { Controller } from './Audio/Controller.js';

// Export the essential classes for users
export { Controller } from './Audio/Controller.js';
export { Sound } from './Audio/Sound.js';
export { Visualizer } from './Audio/Visualizer.js';
export { Output } from './Audio/Output.js';

// Main Audio namespace with Live.js pattern
export const Audio = {
	start(options = {}) {
		const window = options.window || globalThis;
		return new Controller(window);
	},
	
	// Direct access to Controller for advanced usage
	Controller
};
