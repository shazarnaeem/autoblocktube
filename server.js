require('dotenv').config();

const express = require('express');
const app = express();
const cors = require('cors');
const { google } = require('googleapis');
const Busboy = require('busboy');
const os = require('os');
const path = require('path');
const fs = require('fs');

app.use(cors());

const oauth2Client = new google.auth.OAuth2(
  '13484909334-c1uj4m10sf46icobumjn54ev6pri7ks3.apps.googleusercontent.com',
  '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'
);

oauth2Client.setCredentials({
  refresh_token: process.env.YT_REFRESH_TOKEN
});

const youtube = google.youtube({ version: 'v3', auth: oauth2Client });

app.post('/upload', (req, res) => {
  const busboy = new Busboy({ headers: req.headers });
  const tmpdir = os.tmpdir();
  const fields = {};
  const uploads = {};

  busboy.on('file', (fieldname, file, filename) => {
    const filepath = path.join(tmpdir, filename);
    uploads[fieldname] = filepath;
    file.pipe(fs.createWriteStream(filepath));
  });

  busboy.on('field', (fieldname, val) => {
    fields[fieldname] = val;
  });

  busboy.on('finish', async () => {
    const filePath = uploads['video'];
    const { title, description, tags, country } = fields;

    try {
      const response = await youtube.videos.insert({
        part: 'snippet,status,contentDetails',
        requestBody: {
          snippet: {
            title,
            description,
            tags: tags.split(',')
          },
          status: {
            privacyStatus: 'public'
          },
          contentDetails: {
            regionRestriction: {
              blocked: [country.toUpperCase()]
            }
          }
        },
        media: {
          body: fs.createReadStream(filePath)
        }
      });

      res.status(200).json({ message: '✅ Video uploaded and blocked in ' + country });
    } catch (error) {
      console.error('❌ Upload error:', error);
      res.status(500).send('Upload failed');
    }
  });

  req.pipe(busboy);
});

app.get('/', (req, res) => {
  res.send('AutoBlockTube backend is running securely!');
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`🚀 Server running securely on port ${PORT}`));
