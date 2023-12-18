const Photo = require('../models/photo.model');
const validator = require('validator');
const requestIp = require('request-ip');
const Voter = require('../models/Voter.model');

/****** SUBMIT PHOTO ********/

exports.add = async (req, res) => {
  try {
    const { title, author, email } = req.fields;
    const file = req.files.file;

    // Check title length
    if (!validator.isLength(title, { max: 25 })) {
      throw new Error('Title length should be 25 characters or less.');
    }

    // Check author length
    if (!validator.isLength(author, { max: 50 })) {
      throw new Error('Author length should be 50 characters or less.');
    }

    // Validate email format
    if (!validator.isEmail(email)) {
      throw new Error('Invalid email format.');
    }

    if (title && author && email && file) { // if fields are not empty...

      // Escape and sanitize input data
      const escapedTitle = validator.escape(title);
      const escapedAuthor = validator.escape(author);
      const escapedEmail = validator.escape(email);

      // Check if the file extension is allowed
      const allowedExtensions = ['gif', 'jpg', 'png'];
      const fileName = file.path.split('/').slice(-1)[0];
      const fileExt = fileName.split('.').slice(-1)[0].toLowerCase();

      if (!allowedExtensions.includes(fileExt)) {
        throw new Error('Invalid file format. Only gif, jpg, and png are allowed.');
      }

      const newPhoto = new Photo({
        title: escapedTitle,
        author: escapedAuthor,
        email: escapedEmail,
        src: fileName,
        votes: 0,
      });

      await newPhoto.save(); // ...save new photo in DB
      res.json(newPhoto);

    } else {
      throw new Error('Wrong input!');
    }

  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

/****** LOAD ALL PHOTOS ********/

exports.loadAll = async (req, res) => {
  try {
    res.json(await Photo.find());
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/****** VOTE FOR PHOTO ********/

exports.vote = async (req, res) => {
  try {
    const photoToUpdate = await Photo.findOne({ _id: req.params.id });
    if (!photoToUpdate) res.status(404).json({ message: 'Not found' });
    else {
      // Validate request IP
      const ipAddress = requestIp.getClientIp(req);
      const voter = await Voter.findOne({ user: ipAddress });

      if (!voter) {
        const newVoter = new Voter({ user: ipAddress });
        await newVoter.save();
      }

      if (!voter.votes.includes(req.params.id)) {
        voter.votes.push(req.params.id);
        await voter.save();

        // Increase the vote count for the photo
        photoToUpdate.votes++;
        await photoToUpdate.save();

        res.send({ message: 'OK' });
      } else {
        res.status(500).json({ message: 'You have already voted for this photo.' });
      }
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};