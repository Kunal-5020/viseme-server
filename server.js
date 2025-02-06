const express = require("express");
const multer = require("multer");
const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");
const os = require("os");
const app = express();
const port = 3000;

// Set up multer storage for handling file uploads (temporary memory storage)
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Middleware to handle JSON requests
app.use(express.json());

// API endpoint to handle viseme generation
app.post("/generate-visemes", upload.single("audio"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No audio file provided" });
  }

  // Temporary file path
  const tempFilePath = path.join(os.tmpdir(), `${Date.now()}.wav`);

  // Write the buffer to a temporary file
  fs.writeFile(tempFilePath, req.file.buffer, (err) => {
    if (err) {
      return res.status(500).json({ error: "Failed to save audio buffer", message: err.message });
    }

    // Run Rhubarb Lip Sync on the temporary file
    const outputFilePath = path.join(os.tmpdir(), `${Date.now()}-output.json`);

    // Rhubarb command to process the audio file and generate visemes
    const command = `rhubarb-lip-sync "${tempFilePath}" -o "${outputFilePath}"`;

    exec(command, (error, stdout, stderr) => {
      if (error) {
        return res.status(500).json({ error: "Failed to generate visemes", message: stderr });
      }

      // Read the generated JSON file and send the data
      fs.readFile(outputFilePath, "utf8", (err, data) => {
        if (err) {
          return res.status(500).json({ error: "Failed to read viseme file", message: err.message });
        }

        // Clean up temporary files
        fs.unlinkSync(tempFilePath);
        fs.unlinkSync(outputFilePath);

        // Send the viseme data as a JSON response
        res.json(JSON.parse(data));
      });
    });
  });
});

app.listen(port, () => {
  console.log(`Viseme server running at http://localhost:${port}`);
});
