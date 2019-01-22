var config={
	siteId:'default',
	manager: {
		
	},
	services: {
		HermodMicrophone: {
		},
		HermodSpeaker: {
		},
		HermodTts: {
		},
		HermodHotword: {
			models: [{
			  file: './node_modules/snowboy/resources/models/snowboy.umdl',
			  sensitivity: '0.5',
			  hotwords : 'snowboy'
			}],
			detector: {
			  resource: "./node_modules/snowboy/resources/common.res",
			  audioGain: 2.0,
			  applyFrontend: true
			}
		},
		HermodDeepSpeechAsrService: {
			// These constants control the beam search decoder
			// These constants are tied to the shape of the graph used (changing them changes
			// the geometry of the first layer), so make sure you use the same constants that
			// were used during training
			BEAM_WIDTH : 500, // Beam width used in the CTC decoder when building candidate transcriptions
			LM_ALPHA : 0.75, // The alpha hyperparameter of the CTC decoder. Language Model weight
			LM_BETA : 1.85, // The beta hyperparameter of the CTC decoder. Word insertion bonus.
			N_FEATURES : 26, // Number of MFCC features to use
			N_CONTEXT : 9, // Size of the context window used for producing timesteps in the input vector
			files: {
				model :"/models/output_graph.pb",
				alphabet: "/models/alphabet.txt",
				lm: "/models/lm.binary",
				trie: "/models/trie"
			},
			maxProcesses: 2
		}
	}
}

module.exports = config;
