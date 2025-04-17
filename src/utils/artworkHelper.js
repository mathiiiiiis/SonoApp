import * as FileSystem from 'expo-file-system';
import { getCachedArtwork, cacheArtwork } from './cacheManager';
import { base64Encode } from './encodingHelper';

/**
 * Extracts album artwork from an audio file
 * @param {string} uri - The URI of the audio file
 * @returns {Promise<string|null>} - A promise that resolves to the artwork URI or null if no artwork is found
 */
export const getAlbumArtwork = async (uri) => {
  try {
    console.log(`Attempting to extract artwork from: ${uri}`);

    // First check if we have this artwork in cache
    const cachedArtwork = await getCachedArtwork(uri);
    if (cachedArtwork) {
      return cachedArtwork;
    }

    // Read the first 1024 bytes of the file to check for ID3v2 header
    const fileInfo = await FileSystem.getInfoAsync(uri);
    if (!fileInfo.exists) {
      console.log(`File does not exist: ${uri}`);
      return null;
    }

    // Read the first part of the file to check for ID3v2 header
    let fileContent;
    try {
      fileContent = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.UTF8,
        length: 1024,
        position: 0,
      });
    } catch (readError) {
      console.error(`Error reading file content: ${readError.message}`);
      return null;
    }

    if (!fileContent) {
      console.log(`No file content read from: ${uri}`);
      return null;
    }

    // Convert to Uint8Array
    const binaryData = new Uint8Array(fileContent.split('').map(c => c.charCodeAt(0)));

    // Validate buffer length
    if (binaryData.length < 10) {
      console.log(`File too short to contain valid metadata: ${uri}`);
      return null;
    }

    // Check for ID3v2 header (starts with "ID3")
    if (binaryData[0] === 0x49 && binaryData[1] === 0x44 && binaryData[2] === 0x33) {
      console.log(`Found ID3v2 header in file: ${uri}`);

      // Get the ID3v2 version
      const version = binaryData[3];
      const revision = binaryData[4];
      console.log(`ID3v2 version: ${version}.${revision}`);

      // Validate version
      if (version < 2 || version > 4) {
        console.log(`Unsupported ID3v2 version: ${version}`);
        return null;
      }

      // Get the size of the ID3v2 tag (4 bytes, each byte uses only 7 bits)
      // eslint-disable-next-line no-bitwise
      const size = (binaryData[6] << 21) | (binaryData[7] << 14) | (binaryData[8] << 7) | binaryData[9];
      console.log(`ID3v2 tag size: ${size} bytes`);

      // Validate size
      if (size <= 0 || size > 20 * 1024 * 1024) { // Increased max size to 20MB
        console.log(`Invalid ID3v2 tag size: ${size} bytes`);
        return null;
      }

      // Safety check - if size is too large, limit it to prevent memory issues
      const safeSize = Math.min(size, 5 * 1024 * 1024);

      // Read the entire ID3v2 tag
      let fullTagContent;
      try {
        fullTagContent = await FileSystem.readAsStringAsync(uri, {
          encoding: FileSystem.EncodingType.UTF8,
          length: safeSize + 10, // 10 bytes for the header
          position: 0,
        });
      } catch (tagReadError) {
        console.error(`Error reading ID3v2 tag: ${tagReadError.message}`);
        return null;
      }

      if (!fullTagContent) {
        console.log(`No tag content read from: ${uri}`);
        return null;
      }

      const fullBinaryData = new Uint8Array(fullTagContent.split('').map(c => c.charCodeAt(0)));

      // Look for APIC frame (ID3v2.3) or PIC frame (ID3v2.2)
      let frameId = version < 3 ? 'PIC' : 'APIC';
      let frameStart = 10; // Start after the header
      let frameCount = 0;
      const maxFrames = 100;

      while (frameStart < fullBinaryData.length - 10 && frameCount < maxFrames) {
        frameCount++;

        // Check if we've reached the end of the tag
        if (fullBinaryData[frameStart] === 0) {
          break;
        }

        // Get frame ID
        const currentFrameId = String.fromCharCode(
          fullBinaryData[frameStart],
          fullBinaryData[frameStart + 1],
          fullBinaryData[frameStart + 2],
          version >= 3 ? fullBinaryData[frameStart + 3] : 0
        ).replace(/\0/g, '');

        // Get frame size
        let frameSize;
        if (version < 3) {
          // eslint-disable-next-line no-bitwise
          frameSize = (fullBinaryData[frameStart + 3] << 16) |
                    // eslint-disable-next-line no-bitwise
                     (fullBinaryData[frameStart + 4] << 8) |
                     fullBinaryData[frameStart + 5];
          frameStart += 6;
        } else {
          // eslint-disable-next-line no-bitwise
          frameSize = (fullBinaryData[frameStart + 4] << 24) |
                      // eslint-disable-next-line no-bitwise
                     (fullBinaryData[frameStart + 5] << 16) |
                     // eslint-disable-next-line no-bitwise
                     (fullBinaryData[frameStart + 6] << 8) |
                     fullBinaryData[frameStart + 7];
          frameStart += 10;
        }

        // Validate frame size
        if (frameSize <= 0 || frameSize > 5 * 1024 * 1024) { // Increased to 5MB
          console.log(`Large artwork frame: ${currentFrameId}, size: ${frameSize} bytes - will try to process anyway`);
          // Don't skip large frames, try to process them
        }

        // If this is an APIC/PIC frame, extract the artwork
        if (currentFrameId === frameId) {
          console.log(`Found ${frameId} frame, size: ${frameSize} bytes`);

          try {
            // Skip text encoding byte
            frameStart++;

            // For APIC, skip MIME type
            if (frameId === 'APIC') {
              let mimeTypeEnd = frameStart;
              while (fullBinaryData[mimeTypeEnd] !== 0 && mimeTypeEnd < frameStart + frameSize) {
                mimeTypeEnd++;
              }
              frameStart = mimeTypeEnd + 1;

              // Skip picture type byte
              frameStart++;

              // Skip description
              while (fullBinaryData[frameStart] !== 0 && frameStart < frameStart + frameSize) {
                frameStart++;
              }
              frameStart++;
            }

            // The remaining data is the image
            const imageData = fullBinaryData.slice(frameStart, frameStart + frameSize);

            // Validate image data
            if (imageData.length < 10) {
              console.log(`Image data too short: ${imageData.length} bytes`);
              continue;
            }

            // Determine MIME type from the image data
            let mimeType = 'image/jpeg'; // Default
            if (imageData[0] === 0xFF && imageData[1] === 0xD8) {
              mimeType = 'image/jpeg';
            } else if (imageData[0] === 0x89 && imageData[1] === 0x50) {
              mimeType = 'image/png';
            } else {
              console.log(`Unsupported image format, using default: ${mimeType}`);
            }

            // Convert to base64 data URL using our imported function
            const base64Data = base64Encode(imageData);
            const dataUrl = `data:${mimeType};base64,${base64Data}`;

            try {
              // Cache the artwork for future use
              await cacheArtwork(uri, dataUrl);
            } catch (cacheError) {
              console.warn(`Failed to cache artwork for ${uri}:`, cacheError);
              // Continue even if caching fails
            }

            return dataUrl;
          } catch (artworkError) {
            console.error(`Error processing artwork frame: ${artworkError.message}`);
            continue;
          }
        }

        // Move to the next frame
        frameStart += frameSize;
      }
    }

    // Check for FLAC metadata block
    if (binaryData[0] === 0x66 && binaryData[1] === 0x4C && binaryData[2] === 0x61 && binaryData[3] === 0x43) {
      console.log(`Found FLAC header in file: ${uri}`);
      // TODO: FLAC artwork extraction
    }

    // Check for OGG header
    if (binaryData[0] === 0x4F && binaryData[1] === 0x67 && binaryData[2] === 0x67 && binaryData[3] === 0x53) {
      console.log(`Found OGG header in file: ${uri}`);
      // TODO: OGG artwork extraction
    }

    // Check for M4A/M4B header (ftyp)
    if (binaryData[4] === 0x66 && binaryData[5] === 0x74 && binaryData[6] === 0x79 && binaryData[7] === 0x70) {
      console.log(`Found M4A header in file: ${uri}`);

      // Read more of the file to find the moov atom
      let m4aContent;
      try {
        m4aContent = await FileSystem.readAsStringAsync(uri, {
          encoding: FileSystem.EncodingType.UTF8,
          length: 1024 * 1024, // Read up to 1MB to find the moov atom
          position: 0,
        });
      } catch (readError) {
        console.error(`Error reading M4A file content: ${readError.message}`);
        return null;
      }

      if (!m4aContent) {
        console.log(`No file content read from M4A: ${uri}`);
        return null;
      }

      const m4aBuffer = new Uint8Array(m4aContent.split('').map(c => c.charCodeAt(0)));

      // Look for the moov atom which contains metadata
      let offset = 0;
      while (offset < m4aBuffer.length - 8) {
        // eslint-disable-next-line no-bitwise
        const size = (m4aBuffer[offset] << 24) | (m4aBuffer[offset + 1] << 16) |
                    // eslint-disable-next-line no-bitwise
                    (m4aBuffer[offset + 2] << 8) | m4aBuffer[offset + 3];
        const type = String.fromCharCode(
          m4aBuffer[offset + 4],
          m4aBuffer[offset + 5],
          m4aBuffer[offset + 6],
          m4aBuffer[offset + 7]
        );

        if (type === 'moov') {
          console.log(`Found moov atom at offset ${offset}, size: ${size}`);

          // Read the moov atom content
          try {
            const moovContent = await FileSystem.readAsStringAsync(uri, {
              encoding: FileSystem.EncodingType.UTF8,
              length: size,
              position: offset,
            });

            if (!moovContent) {
              console.log(`No moov content read from: ${uri}`);
              return null;
            }

            const moovBuffer = new Uint8Array(moovContent.split('').map(c => c.charCodeAt(0)));

            // Look for the udta atom which contains the artwork
            let udtaOffset = 8;
            while (udtaOffset < moovBuffer.length - 8) {
              // eslint-disable-next-line no-bitwise
              const udtaSize = (moovBuffer[udtaOffset] << 24) | (moovBuffer[udtaOffset + 1] << 16) |
                              // eslint-disable-next-line no-bitwise
                             (moovBuffer[udtaOffset + 2] << 8) | moovBuffer[udtaOffset + 3];
              const udtaType = String.fromCharCode(
                moovBuffer[udtaOffset + 4],
                moovBuffer[udtaOffset + 5],
                moovBuffer[udtaOffset + 6],
                moovBuffer[udtaOffset + 7]
              );

              if (udtaType === 'udta') {
                console.log(`Found udta atom, size: ${udtaSize}`);

                // Extract the artwork data
                const artworkData = moovBuffer.slice(udtaOffset + 8, udtaOffset + udtaSize);

                // Convert to base64 data URL
                const base64Data = base64Encode(artworkData);
                const dataUrl = `data:image/jpeg;base64,${base64Data}`;

                try {
                  // Cache the artwork for future use
                  await cacheArtwork(uri, dataUrl);
                } catch (cacheError) {
                  console.warn(`Failed to cache M4A artwork for ${uri}:`, cacheError);
                  // Continue even if caching fails
                }

                return dataUrl;
              }

              udtaOffset += udtaSize;
            }
          } catch (moovError) {
            console.error(`Error reading moov atom: ${moovError.message}`);
            return null;
          }
        }

        offset += size;
      }
    }

    console.log(`No artwork found in file: ${uri}`);
    return null;
  } catch (error) {
    console.error(`Error extracting artwork from ${uri}:`, error);
    return null;
  }
};
