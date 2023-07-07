const paymentModel = require("../models/paymentModel");
const stream = require("stream");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const { MulterError } = require("multer");
const { google } = require("googleapis");

global.payId = Math.floor(Math.random() * 100) + 1;

// var newPath = `PayEvi-${payId}-${file.originalname}.${ext}`;

const paymentNotification = async (req, res) => {
  const { studentId, bankName, payeeName, amount, narration, paymentDate } =
    req.body;

  const { uri, name, type, size } = req.file;

  const myExt = type?.split("/")[1];

  paymentModel.findOne({ $and: [{ narration }, { amount }] }, (err, result) => {
    if (result !== null && result !== undefined) {
      console.log({
        msg: `Payment with narration ${narration} and amount ${amount} already exists`,
        result,
      });
      console.log(JSON.stringify(file));
      res.status(400).json({
        msg: `Payment with narration ${narration} and amount ${amount} already exists`,
      });
    } else {
      // Google Upload Begin
      const KEYFILEPATH = path.join(__dirname, "kaycadCredential.json");
      const SCOPES = ["https://www.googleapis.com/auth/drive"];

      const auth = new google.auth.GoogleAuth({
        keyFile: KEYFILEPATH,
        scopes: SCOPES,
      });

      const uploadFile = async (fileObject, myBuffer) => {
        const bufferStream = new stream.PassThrough();
        bufferStream.end(myBuffer);

        const drive = await google.drive({ version: "v3", auth: auth });

        const uploadResponse = await drive.files.create({
          media: {
            mimeType: fileObject.file.mimetype,
            body: bufferStream,
          },
          requestBody: {
            name: fileObject.name,
            parents: ["1oaWZiL8GJF-kHVMJNgk5G5_4sJhN8KB5"],
          },
          fields: "id,name",
        });

        console.log(
          "Uploaded Data: " +
            JSON.stringify({
              data: uploadResponse.data,
              status: uploadResponse.status,
              statusText: uploadResponse.statusText,
            })
        );

        const grantPermissions = await drive.permissions.create({
          fileId: uploadResponse.data.id,
          requestBody: {
            role: "reader",
            type: "anyone",
          },
        });

        const getUploadedUrl = await drive.files.get({
          fileId: uploadResponse.data.id,
          fields: "webViewLink, webContentLink",
        });

        console.log(
          "Uploaded Data Url: " +
            JSON.stringify({
              data: getUploadedUrl.data,
              status: getUploadedUrl.status,
              statusText: getUploadedUrl.statusText,
            })
        );

        return await getUploadedUrl.data;
      };

      try {
        function base64_encode(myfile) {
          const str = fs.readFileSync(myfile, "base64");
          const buffer = Buffer.from(str, "base64");
          return buffer;
        }

        var myBuffer = base64_encode(req.file.path);
        // const convertToBase64 = (imageToConvert) => {
        //   var reader = new FileReader();
        //   reader.readAsDataURL(imageToConvert);
        //   reader.onload = () => {
        //     console.log("file reaer result =" + reader.result);
        //     return reader.result;
        //   };
        //   reader.onerror = (error) => {
        //     console.log("file reaer error =" + error);
        //     return error;
        //   };
        // };

        // const imageUrl = convertToBase64(req.file.path);

        // console.log("image url = " + imageUrl);

        const ext = req.file.mimetype?.split("/")[1];

        fileData = {
          file: req.file,
          name: `PayEvi-${payId}-${studentId}-${paymentDate}-${bankName}.${ext}`,
        };

        console.log("fileData = " + JSON.stringify(fileData));

        uploadFile(fileData, myBuffer).then((result) => {
          paymentModel.create(
            {
              studentId,
              bankName,
              payeeName,
              amount,
              narration,
              paymentEvidence: result.webViewLink,
              // paymentEvidence: JSON.stringify({
              //   fileName: fileData.name,
              //   fileID: result.id,
              // }),
              paymentDate,
            },
            (err, result) => {
              if (err) {
                console.log({
                  msg: "Unable to send Payment Notification, Kindly retry",
                  err,
                });

                res.status(400).json({
                  msg: "Unable to send Payment Notification, Kindly retry",
                });
              } else {
                console.log({
                  msg: "Payment Notification sent successfully",
                });
                res
                  .status(200)
                  .json({ msg: "Payment Notification sent successfully" });
              }
            }
          );
        });
      } catch (error) {
        if (error instanceof multer.MulterError) {
          console.log({ msg: "Payment Evidence Upload failed", error });

          res
            .status(400)
            .json({ msg: "Payment Evidence Upload failed", error });
        } else {
          console.log({
            msg: "Unable to safe uploaded payment evidence ",
            error,
          });

          res
            .status(400)
            .json({ msg: "Unable to safe uploaded payment evidence ", error });
        }
      }
    }
  });
};

const paymentConfirmationRequest = async (req, res) => {
  paymentModel.find({ adminConfirmStatus: "pending" }, (error, response) => {
    if (error) {
      console.log({ msg: "No Payment Notification found", error });
      res.status(400).json({ msg: "No Payment Notification found", error });
    } else {
      console.log({ msg: "Payment Notification fetched ", response });
      res.status(200).json({ msg: "Payment Notification fetched", response });
    }
  });
};

const adminPaymentRequestHistory = async (req, res) => {
  paymentModel.find({}, (error, response) => {
    if (error) {
      console.log({ msg: "No Payment Notification found", error });
      res.status(400).json({ msg: "No Payment Notification found", error });
    } else {
      console.log({ msg: "Payment Notification fetched ", response });
      res.status(200).json({ msg: "Payment Notification fetched", response });
    }
  });
};

const paymentConfirmation = async (req, res) => {
  const { paymentId } = req.params;
  const { adminConfirmStatus, adminName, declineReason } = req.body;
  paymentModel.findOne({ paymentId: paymentId }, (error, result) => {
    if (result === null || result === undefined) {
      console.log({ msg: `No Payment Notification found `, error });
      res.status(400).json({ msg: `No Payment Notification found`, error });
    } else {
      paymentModel.findOneAndUpdate(
        { paymentId: paymentId },
        {
          adminConfirmStatus: adminConfirmStatus,
          adminName: adminName,
          declineReason: declineReason,
        },
        {
          new: true,
          runValidators: true,
        },
        (error, result) => {
          if (error) {
            console.log({
              msg: `Failed to confirm/approve payment`,
              error,
            });
            res.status(400).json({
              msg: `Failed to confirm/approve payment `,
              error,
            });
          } else {
            if (adminConfirmStatus === "approved") {
              console.log({
                msg: `Payment confirmed successfully`,
                result,
              });
              res.status(200).json({
                msg: `Payment confirmed successfully`,
                result,
              });
            } else {
              console.log({
                msg: `Payment declined successfully`,
                result,
              });
              res.status(200).json({
                msg: `Payment declined successfully`,
                result,
              });
            }
          }
        }
      );
    }
  });
};

const paymentNotificationHistory = async (req, res) => {
  const { studentId } = req.params;
  // const { studentId } = req.body
  paymentModel.find({ studentId: studentId }, (error, result) => {
    if (result === null || result === undefined) {
      console.log({ msg: `No Payment Notification found `, error });
      res.status(400).json({ msg: `No Payment Notification found`, error });
    } else {
      console.log({ msg: `Payment Notification fetched `, result });
      res.status(200).json({ msg: `Payment Notification fetched `, result });
    }
  });
};

const userFetchWalletHistory = async (req, res) => {
  const { studentId } = req.params;
  paymentModel.find(
    { $and: [{ studentId: studentId }, { adminConfirmStatus: true }] },
    (error, result) => {
      if (result === null || result === undefined) {
        console.log({ msg: `No Payment history found on your wallet`, error });
        res
          .status(400)
          .json({ msg: `No Payment history found on your wallet`, error });
      } else {
        console.log({ msg: `Wallet history fetched `, result });
        res.status(200).json({ msg: `Wallet history fetched `, result });
      }
    }
  );
};

const searchFetchPayNotification = async (req, res) => {
  const { paymentId } = req.params;
  paymentModel.findOne({ paymentId: paymentId }, (error, result) => {
    if (result == null) {
      console.log({
        msg: `No Payment Notification found for ${paymentId} `,
        error,
      });
      res.status(400).json({
        msg: `No Payment Notification found for ${paymentId} `,
        error,
      });
    } else {
      console.log({
        msg: `Payment Notification fetched for ${paymentId} `,
        result,
      });
      res.status(200).json({
        msg: `Payment Notification fetched for ${paymentId} `,
        result,
      });
    }
  });
};

const delPayNotification = async (req, res) => {
  const { paymentId } = req.params;
  paymentModel.findOneAndDelete({ paymentId: paymentId }, (error, result) => {
    if (error) {
      console.log({
        msg: `Failed to delete payment notification with ${paymentId} `,
        error,
      });
      res.status(400).json({
        msg: `Failed to delete payment notification with ${paymentId} `,
        error,
      });
    } else {
      console.log({
        msg: `Payment notification found and deleted for ${paymentId} `,
        result,
      });
      res.status(200).json({
        msg: `Payment notification found and deleted for ${paymentId} `,
        result,
      });
    }
  });
};

module.exports = {
  paymentNotification,
  paymentConfirmationRequest,
  adminPaymentRequestHistory,
  paymentConfirmation,
  paymentNotificationHistory,
  userFetchWalletHistory,
  searchFetchPayNotification,
  delPayNotification,
};
