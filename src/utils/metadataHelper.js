import * as FileSystem from 'expo-file-system';
import { Audio } from 'expo-av';

// Helper function to convert base64 to Uint8Array
const base64ToUint8Array = (base64) => {
    // React Native compatible base64 decoding
    const binaryString = decodeURIComponent(escape(base64));
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
};

export const getAudioMetadata = async (uri) => {
    try {
        // Read the first 1024 bytes of the file to check for ID3v2 header
        const fileInfo = await FileSystem.getInfoAsync(uri);
        if (!fileInfo.exists) {
            console.log(`File does not exist: ${uri}`);
            return {};
        }

        // Initialize metadata object
        const metadata = {
            title: null,
            artist: null,
            album: null,
            year: null,
            genre: null,
            duration: null,
            artwork: null,
        };

        // Try to get duration from file info first
        try {
            const soundPromise = Audio.Sound.createAsync({ uri }, { shouldPlay: false });
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Timeout creating sound object')), 5000)
            );

            const { sound } = await Promise.race([soundPromise, timeoutPromise]);

            if (sound) {
                try {
                    const status = await sound.getStatusAsync();
                    if (status.isLoaded) {
                        metadata.duration = status.durationMillis / 1000; // Convert to seconds
                    }
                } catch (statusError) {
                    console.warn(`Error getting sound status: ${statusError.message}`);
                } finally {
                    try {
                        await sound.unloadAsync();
                    } catch (unloadError) {
                        console.warn(`Error unloading sound: ${unloadError.message}`);
                    }
                }
            }
        } catch (error) {
            console.warn(`Error getting duration: ${error.message}`);
        }

        // Read the file header to check for ID3v2
        let fileContent;
        try {
            fileContent = await FileSystem.readAsStringAsync(uri, {
                encoding: FileSystem.EncodingType.Base64,
                length: 1024,
                position: 0,
            });
        } catch (readError) {
            console.error(`Error reading file content: ${readError.message}`);
            return metadata; // Return with duration only
        }

        if (!fileContent) {
            console.log(`No file content read from: ${uri}`);
            return metadata; // Return with duration only
        }

        // Convert base64 to Uint8Array
        const bytes = base64ToUint8Array(fileContent);

        // Check for ID3v2 header (starts with "ID3")
        if (bytes.length >= 10 && bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33) {
            console.log(`Found ID3v2 header in file: ${uri}`);

            // Get the ID3v2 version
            const version = bytes[3];
            const revision = bytes[4];
            console.log(`ID3v2 version: ${version}.${revision}`);

            // Check if unsynchronization is used - bit 7 of flags
            const flags = bytes[5];
            // eslint-disable-next-line no-bitwise
            const unsync = (flags & 0x80) !== 0;

            // Get the size of the ID3v2 tag (4 bytes, each byte uses only 7 bits)
            // eslint-disable-next-line no-bitwise
            const size = ((bytes[6] & 0x7F) << 21) |
                        // eslint-disable-next-line no-bitwise
                        ((bytes[7] & 0x7F) << 14) |
                        // eslint-disable-next-line no-bitwise
                        ((bytes[8] & 0x7F) << 7) |
                        // eslint-disable-next-line no-bitwise
                        (bytes[9] & 0x7F);

            console.log(`ID3v2 tag size: ${size} bytes, unsync: ${unsync}`);

            // Safety check - if size is too large or zero, use a reasonable default
            const safeSize = size > 0 && size < 5000000 ? size : 10000; // Use 10KB as default if size is invalid

            // Read the entire ID3v2 tag
            let fullTagContent;
            try {
                fullTagContent = await FileSystem.readAsStringAsync(uri, {
                    encoding: FileSystem.EncodingType.Base64,
                    length: safeSize + 10, // 10 bytes for the header
                    position: 0,
                });
            } catch (tagReadError) {
                console.error(`Error reading ID3v2 tag: ${tagReadError.message}`);
                return metadata; // Return with duration only
            }

            if (!fullTagContent) {
                console.log(`No tag content read from: ${uri}`);
                return metadata; // Return with duration only
            }

            const fullBuffer = base64ToUint8Array(fullTagContent);

            // Define frame IDs for different metadata fields based on ID3 version
            const frameIds = {
                title: version < 3 ? 'TT2' : 'TIT2',
                artist: version < 3 ? 'TP1' : 'TPE1',
                album: version < 3 ? 'TAL' : 'TALB',
                year: version < 3 ? 'TYE' : 'TYER',
                genre: version < 3 ? 'TCO' : 'TCON',
            };

            // Parse through the ID3 tag data
            let frameStart = 10; // Start after the ID3 header

            while (frameStart < Math.min(safeSize + 10, fullBuffer.length - 8)) {
                // Check if we've reached padding or end of tag
                if (fullBuffer[frameStart] === 0) {
                    break;
                }

                // Frame ID (3 or 4 chars depending on version)
                const frameIdSize = version < 3 ? 3 : 4;

                // Check if we have enough bytes for a frame header
                if (frameStart + frameIdSize + 4 > fullBuffer.length) {
                    break;
                }

                // Extract current frame ID
                const frameIdBytes = [];
                for (let i = 0; i < frameIdSize; i++) {
                    if (fullBuffer[frameStart + i] === 0) {
                        break;
                    }
                    frameIdBytes.push(fullBuffer[frameStart + i]);
                }

                const currentFrameId = String.fromCharCode(...frameIdBytes);

                // Skip the frame if it doesn't have a valid ID
                if (frameIdBytes.length !== frameIdSize) {
                    frameStart++;
                    continue;
                }

                // Determine frame size based on ID3 version
                let frameSize = 0;
                if (version < 3) {
                    // ID3v2.2: 3 bytes for size
                    // eslint-disable-next-line no-bitwise
                    frameSize = (fullBuffer[frameStart + 3] << 16) |
                        // eslint-disable-next-line no-bitwise
                        (fullBuffer[frameStart + 4] << 8) |
                        fullBuffer[frameStart + 5];
                    frameStart += 6; // Move past frame header
                } else {
                    // ID3v2.3+: 4 bytes for size
                    // eslint-disable-next-line no-bitwise
                    frameSize = (fullBuffer[frameStart + 4] << 24) |
                             // eslint-disable-next-line no-bitwise
                            (fullBuffer[frameStart + 5] << 16) |
                            // eslint-disable-next-line no-bitwise
                            (fullBuffer[frameStart + 6] << 8) |
                            fullBuffer[frameStart + 7];
                    frameStart += 10; // Move past frame header (4 ID + 4 size + 2 flags)
                }

                // Sanity check on frame size
                if (frameSize <= 0 || frameSize > 5000000 || frameStart + frameSize > fullBuffer.length) {
                    console.warn(`Skipping frame ${currentFrameId} with invalid size ${frameSize}`);
                    // Move to next possible frame position
                    frameStart = frameStart + 1;
                    continue;
                }

                // Process known text frames
                const knownFrames = Object.values(frameIds);
                if (knownFrames.includes(currentFrameId)) {
                    try {
                        // Get text encoding (first byte of content)
                        const textEncoding = fullBuffer[frameStart];

                        // Text content starts after encoding byte
                        let content = '';
                        const textStart = frameStart + 1;
                        const textEnd = frameStart + frameSize;

                        // Decode based on encoding
                        if (textEncoding === 0) { // ISO-8859-1 (Latin-1)
                            content = fullBuffer.slice(textStart, textEnd).toString('latin1');
                        } else if (textEncoding === 1) { // UTF-16 with BOM
                            // Check for BOM (Byte Order Mark)
                            if (frameSize > 3 && fullBuffer[textStart] === 0xFF && fullBuffer[textStart + 1] === 0xFE) {
                                content = fullBuffer.slice(textStart + 2, textEnd).toString('utf16le');
                            } else if (frameSize > 3 && fullBuffer[textStart] === 0xFE && fullBuffer[textStart + 1] === 0xFF) {
                                content = fullBuffer.slice(textStart + 2, textEnd).toString('utf16be');
                            } else {
                                // Default to UTF-16LE if no BOM
                                content = fullBuffer.slice(textStart, textEnd).toString('utf16le');
                            }
                        } else if (textEncoding === 2) { // UTF-16BE without BOM
                            content = fullBuffer.slice(textStart, textEnd).toString('utf16be');
                        } else if (textEncoding === 3) { // UTF-8
                            content = fullBuffer.slice(textStart, textEnd).toString('utf8');
                        } else {
                            // Default to Latin-1 for unknown encoding
                            content = fullBuffer.slice(textStart, textEnd).toString('latin1');
                        }

                        // Clean up the content
                        content = content.replace(/\0/g, '').trim();

                        // Assign to appropriate metadata field
                        if (currentFrameId === frameIds.title) {
                            metadata.title = content;
                            console.log(`  Found title: ${content}`);
                        } else if (currentFrameId === frameIds.artist) {
                            metadata.artist = content;
                            console.log(`  Found artist: ${content}`);
                        } else if (currentFrameId === frameIds.album) {
                            metadata.album = content;
                            console.log(`  Found album: ${content}`);
                        } else if (currentFrameId === frameIds.year) {
                            metadata.year = content;
                            console.log(`  Found year: ${content}`);
                        } else if (currentFrameId === frameIds.genre) {
                            metadata.genre = content;
                            console.log(`  Found genre: ${content}`);
                        }
                    } catch (error) {
                        console.error(`Error processing frame ${currentFrameId}:`, error);
                    }
                }

                // Move to the next frame
                frameStart += frameSize;
            }
        }

        console.log(`Processed: ${metadata.title || 'Unknown Title'} - ${metadata.artist || 'Unknown Artist'} - ${metadata.album || 'Unknown Album'}`);
        console.log('Final metadata object in getAudioMetadata:', JSON.stringify(metadata));

        return metadata;
    } catch (error) {
        console.error(`Error extracting metadata from ${uri}:`, error);
        return {
            title: null,
            artist: null,
            album: null,
            year: null,
            genre: null,
            duration: null,
            artwork: null,
        };
    }
};
