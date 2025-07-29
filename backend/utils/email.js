// helpers/email.js
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.ADMIN_EMAIL,
    pass: process.env.ADMIN_PASS,
  }
});

exports.sendEmailToAdmin = async (data) => {
  const mailOptions = {
    from: process.env.ADMIN_EMAIL,
    to: 'admin@joannaholidays.com',
    subject: `New Booking - ${data.packageName}`,
    text: `
New Tour Package Booking:

Name: ${data.name}
Email: ${data.email}
Phone: ${data.mobile}
Date: ${data.date || 'N/A'}
Adults: ${data.adults}
Children: ${data.children}
Package: ${data.packageName}
Category: ${data.categoryName}
Additional Details: ${data.additionalDetails}
    `.trim()
  };

  await transporter.sendMail(mailOptions);
};
