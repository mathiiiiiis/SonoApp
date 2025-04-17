// Frequency bands for the equalizer
export const EQUALIZER_BANDS = [
  { frequency: 60, gain: 0 },
  { frequency: 170, gain: 0 },
  { frequency: 310, gain: 0 },
  { frequency: 600, gain: 0 },
  { frequency: 1000, gain: 0 },
  { frequency: 3000, gain: 0 },
  { frequency: 6000, gain: 0 },
  { frequency: 12000, gain: 0 },
  { frequency: 14000, gain: 0 },
  { frequency: 16000, gain: 0 },
];

// Default presets for the equalizer
export const EQUALIZER_PRESETS = {
  flat: EQUALIZER_BANDS.map(band => ({ ...band, gain: 0 })),
  bass: EQUALIZER_BANDS.map((band, i) => ({ ...band, gain: i < 4 ? 6 : 0 })),
  treble: EQUALIZER_BANDS.map((band, i) => ({ ...band, gain: i >= 6 ? 6 : 0 })),
  rock: [6, 4, -2, -4, -1, 3, 5, 6, 6, 6].map((gain, i) => ({ ...EQUALIZER_BANDS[i], gain })),
  pop: [-2, 0, 3, 4, 5, 3, 0, -1, -2, -2].map((gain, i) => ({ ...EQUALIZER_BANDS[i], gain })),
  jazz: [4, 3, 1, 2, -2, -2, 0, 1, 3, 4].map((gain, i) => ({ ...EQUALIZER_BANDS[i], gain })),
  classical: [5, 4, 3, 2, -2, -2, 0, 2, 3, 4].map((gain, i) => ({ ...EQUALIZER_BANDS[i], gain })),
};

class Equalizer {
  constructor() {
    this.bands = [...EQUALIZER_BANDS];
    this.enabled = false;
    this.audioContext = null;
    this.filters = [];
    this.source = null;
    this.destination = null;
  }

  // Initialize the equalizer with a sound object
  async initialize(sound) {
    console.log('Equalizer: Initializing with sound object');

    try {
      // Get the Web Audio API context from the sound object
      if (sound && sound._loaded && sound._loaded._context) {
        this.audioContext = sound._loaded._context;
        this.source = sound._loaded;
        this.destination = this.audioContext.destination;

        // Create filters for each band
        this.createFilters();

        console.log('Equalizer: Initialized successfully');
        return true;
      } else {
        console.warn('Equalizer: Sound object does not have a valid Web Audio context');
        return false;
      }
    } catch (error) {
      console.error('Equalizer: Error initializing:', error);
      return false;
    }
  }

  // Create filters for each band
  createFilters() {
    if (!this.audioContext) {
      return;
    }

    // Clear existing filters
    this.filters = [];

    // Create a filter for each band
    this.bands.forEach(band => {
      const filter = this.audioContext.createBiquadFilter();
      filter.type = 'peaking';
      filter.frequency.value = band.frequency;
      filter.Q.value = 1; // Quality factor (bandwidth)
      filter.gain.value = band.gain;

      this.filters.push(filter);
    });

    // Connect filters in series
    if (this.filters.length > 0) {
      this.source.disconnect();

      // Connect source to first filter
      this.source.connect(this.filters[0]);

      // Connect filters in series
      for (let i = 0; i < this.filters.length - 1; i++) {
        this.filters[i].connect(this.filters[i + 1]);
      }

      // Connect last filter to destination
      this.filters[this.filters.length - 1].connect(this.destination);
    }
  }

  // Apply the current equalizer bands to the sound
  async applyBands(sound) {
    if (!sound || !sound.getStatusAsync) {
      console.warn('Equalizer: Cannot apply bands, invalid sound object.');
      return;
    }

    // Check if sound is loaded
    const status = await sound.getStatusAsync();
    if (!status.isLoaded) {
      console.warn('Equalizer: Cannot apply bands, sound is not loaded.');
      return;
    }

    try {
      // Initialize if not already done
      if (!this.audioContext) {
        await this.initialize(sound);
      }

      if (this.enabled) {
        console.log('Equalizer: Applying bands:', this.bands);

        // Update filter gains
        this.filters.forEach((filter, index) => {
          filter.gain.value = this.bands[index].gain;
        });

        console.log('Equalizer: Effect applied successfully');
      } else {
        console.log('Equalizer: Disabling effects.');

        // Disconnect filters and connect source directly to destination
        if (this.source && this.destination) {
          this.source.disconnect();
          this.source.connect(this.destination);
        }

        console.log('Equalizer: Effect removed successfully');
      }
    } catch (error) {
      console.error('Equalizer: Error applying bands:', error);
    }
  }

  // Update a specific band's gain
  async updateBand(sound, index, gain) {
    if (index >= 0 && index < this.bands.length) {
      this.bands[index] = { ...this.bands[index], gain };
      console.log(`Equalizer: Updated band ${index} gain to ${gain}`);

      if (this.enabled && this.filters[index]) {
        this.filters[index].gain.value = gain;
      }
    }
  }

  // Apply a preset to the equalizer
  async applyPreset(sound, presetName) {
    if (EQUALIZER_PRESETS[presetName]) {
      this.bands = [...EQUALIZER_PRESETS[presetName]];
      console.log(`Equalizer: Applied preset ${presetName}`);

      if (this.enabled) {
        // Update all filter gains
        this.filters.forEach((filter, index) => {
          filter.gain.value = this.bands[index].gain;
        });
      }
    } else {
      console.warn(`Equalizer: Preset ${presetName} not found.`);
    }
  }

  // Reset the equalizer to flat
  async reset(sound) {
    this.bands = [...EQUALIZER_PRESETS.flat];
    console.log('Equalizer: Reset to flat');

    if (this.enabled) {
      // Reset all filter gains to 0
      this.filters.forEach(filter => {
        filter.gain.value = 0;
      });
    }
  }

  // Enable or disable the equalizer
  async setEnabled(sound, enabled) {
    this.enabled = enabled;
    console.log(`Equalizer: Set enabled to ${enabled}`);

    if (enabled) {
      // Initialize if not already done
      if (!this.audioContext) {
        await this.initialize(sound);
      }

      // Apply current bands
      await this.applyBands(sound);
    } else {
      // Disconnect filters and connect source directly to destination
      if (this.source && this.destination) {
        this.source.disconnect();
        this.source.connect(this.destination);
      }
    }
  }

  // Get the current bands configuration
  getBands() {
    return this.bands;
  }
}

const equalizer = new Equalizer();
export default equalizer;
