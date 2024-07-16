const express = require('express');
const { S3Client, ListObjectsV2Command } = require('@aws-sdk/client-s3');
const multer = require('multer');
const multerS3 = require('multer-s3');
const cors = require('cors');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const upload = multer({
  storage: multerS3({
    s3: s3,
    bucket: process.env.S3_BUCKET_NAME,
    key: function (req, file, cb) {
      cb(null, Date.now().toString() + '-' + file.originalname);
    },
  }),
});

app.post('/upload', upload.single('file'), (req, res) => {
  res.status(200).json({ url: req.file.location });
});

app.get('/most-recent', async (req, res) => {
  try {
    const command = new ListObjectsV2Command({
      Bucket: process.env.S3_BUCKET_NAME,
    });
    const data = await s3.send(command);
    const objects = data.Contents;

    if (!objects || objects.length === 0) {
      return res.status(404).json({ message: 'No objects found' });
    }

    const mostRecentObject = objects.reduce((a, b) => (a.LastModified > b.LastModified ? a : b));
    const mostRecentObjectUrl = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${mostRecentObject.Key}`;

    res.status(200).json({ url: mostRecentObjectUrl });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching the most recent object' });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
