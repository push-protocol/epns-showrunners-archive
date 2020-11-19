import { Container } from 'typedi';
import config from '../config';

import { Response } from 'express';
export = {
  handleResponse: (res: Response, code: number, success: Boolean, message: String, data: Object) => {
    return res.status(code).json({ status: success == true ? "success" : "failed", message,  data });
  },
  // To Generate Random Password
  generateRandomWord: (length, includeSpecial) => {
     var result           = '';
     var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
     if (includeSpecial) {
       characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()[]{}~<>;:-=';
     }
     var charactersLength = characters.length;
     for ( var i = 0; i < length; i++ ) {
       result += characters.charAt(Math.floor(Math.random() * charactersLength));
     }

     return result;
  },
  // To remove a file
  removeFile: async (filepath) => {
    return await new Promise ((resolve, reject) => {
      require('fs').unlink(path, (err) => {
        if (err) {
          Logger.log(err);
          reject(err);
        }
        else {
          resolve(true);
        }
      });
    });
  },
  // To Handle Base 64 file writing
  writeBase64File: async (base64, filename) => {
    const Logger = Container.get('logger');

    // Remove png or jpg
    var sizeOf = require('image-size');
    var base64Data = base64.split(';base64,').pop();
    var img = Buffer.from(base64Data, 'base64');
    var dimensions = sizeOf(img);

    // Only proceed if image is equal to or less than 128
    if (dimensions.width > 128 || dimensions.height > 128) {
      Logger.error("Image size check failed... returning");
      return false;
    }

    // only proceed if png or jpg
    // This is brilliant: https://stackoverflow.com/questions/27886677/javascript-get-extension-from-base64-image
    // char(0) => '/' : jpg
    // char(0) => 'i' : png
    let fileext;
    console.log(base64Data.charAt(0));
    if (base64Data.charAt(0) == '/') {
      fileext = '.jpg';
    }
    else if (base64Data.charAt(0) == 'i') {
      fileext = '.png';
    }
    else {
      return false;
    }

    const filepath = config.staticCachePath + filename + fileext;

    // Write the file
    return await new Promise ((resolve, reject) => {
      require("fs").writeFile(filepath, base64Data, 'base64', function(err) {
        if (err) {
          Logger.log(err);
          reject(err)
        }
        else {
          resolve(config.fsServerURL + filename + fileext);
        }
      });
    })
  }
};
