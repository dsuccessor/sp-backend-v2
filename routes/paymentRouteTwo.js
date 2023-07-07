const {
  paymentNotification,
  paymentConfirmationRequest,
  adminPaymentRequestHistory,
  paymentConfirmation,
  paymentNotificationHistory,
  userFetchWalletHistory,
  searchFetchPayNotification,
  delPayNotification,
} = require("../controls/paymentControlTwo");
const express = require("express");
const multer = require("multer");
const { MulterError } = require("multer");
const router = express.Router();

const multerConfig = multer.diskStorage({});

const isImage = (req, file, cb) => {
  if (file.mimetype.startsWith("image")) {
    cb(null, true);
  } else {
    console.log({
      msg: `Wrong file uploaded, Make sure the file uploaded is an image file`,
    });

    res.status(400).json({
      msg: `Wrong file uploaded, Make sure the file uploaded is an image file`,
    });
  }
};

const postUpload = multer({
  storage: multerConfig,
  fileFilter: isImage,
});

// Already implemented for admin
router.get("/confirmationrequest", paymentConfirmationRequest);

// Already implemented for admin
router.put("/confirmpayment/:paymentId", paymentConfirmation);

// Already implemented for user
router.post(
  "/sendnotification",
  postUpload.single("paymentEvidence"),
  paymentNotification
);

// Already implemented for user
router.get("/history/:studentId", paymentNotificationHistory);

router.get("/userwallethistory/:studentId", userFetchWalletHistory);
router.get("/search/:paymentId", searchFetchPayNotification);
router.delete("/delete/:paymentId", delPayNotification);

module.exports = router;
