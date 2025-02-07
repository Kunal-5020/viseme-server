const express = require("express");
const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");
const os = require("os");

const app = express();
const port = 3000;

// Viseme mapping as provided
const visemeMap = {
  "A": 1,
  "B": 21,
  "C": 5,
  "D": 8,
  "E": 19,
  "F": 18,
  "G": 7,
  "H": 6,
  "X": 0,
};

// Function to transform viseme data using the provided map.
// It assumes each item has a `time` property (in seconds) and a `viseme` letter.
const transformVisemeData = (data, map) => {
  return data.map(item => {
    // Convert time (in seconds) to milliseconds
    const audioOffset = Math.round(parseFloat(item.time) * 1000);
    
    // Map the viseme letter to its corresponding ID
    const visemeID = map[item.viseme] ?? -1; // Defaults to -1 if not found
    
    return [ audioOffset, visemeID]; // Format: [ID, offset]
  });
};

// Middleware to handle JSON requests (with an increased payload limit)
app.use(express.json({ limit: "50mb" }));

// API endpoint to handle viseme generation
app.post("/generate-visemes", async (req, res) => {
  try {
    const { audioBuffer } = req.body;

    if (!audioBuffer) {
      return res.status(400).json({ error: "No audio buffer provided" });
    }

    // Decode the Base64-encoded audio data into a Buffer
    const audioBufferDecoded = Buffer.from(audioBuffer, "base64");

    // Create a file path (using OS temporary directory) to store the audio file
    const audioFilePath = path.join(os.tmpdir(), `${Date.now()}.wav`);

    // Write the decoded audio buffer to a WAV file
    await fs.promises.writeFile(audioFilePath, audioBufferDecoded);

    // Create a file path for Rhubarb's output (plain text file)
    const outputFilePath = path.join(os.tmpdir(), `${Date.now()}-output.txt`);

    // Rhubarb command to process the audio file and generate viseme data


    const command = `/usr/local/bin/rhubarb-lip-sync/rhubarb "${audioFilePath}" -o "${outputFilePath}"`;


    exec(command, async (error, stdout, stderr) => {
      if (error) {
        console.error("Error executing command:", stderr);
        return res.status(500).json({ error: "Failed to generate visemes", message: stderr });
      }

      try {
        // Read the generated output file (plain text)
        const rawData = await fs.promises.readFile(outputFilePath, "utf8");

        // Split the text into lines and parse each line into an object.
        // Assumes each line is of the format: "time   viseme"
        const lines = rawData.split("\n").filter(line => line.trim() !== "");
        const parsedData = lines.map(line => {
          const parts = line.trim().split(/\s+/);
          return {
            time: parts[0],
            viseme: parts[1]
          };
        });

        // Transform the parsed data using the provided viseme map
        const transformedData = transformVisemeData(parsedData, visemeMap);

        // Optionally, if you want to keep the files for debugging, comment out the deletion lines.
        // Clean up temporary files
        await fs.promises.unlink(audioFilePath);
        await fs.promises.unlink(outputFilePath);

        // Send the transformed viseme data as a JSON response
        res.json(transformedData);
      } catch (err) {
        console.error("Error processing output file:", err.message);
        res.status(500).json({ error: "Failed to process viseme file", message: err.message });
      }
    });
  } catch (err) {
    console.error("Server error:", err.message);
    res.status(500).json({ error: "Server error", message: err.message });
  }
});

app.listen(port, () => {
  console.log(`Viseme server running 4 at http://localhost:${port}`);
});
