const nodemailer = require('nodemailer');
const EmailLog = require('../models/EmailLog');

// Create email transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Format email content based on form type
const formatBookingEmail = (booking) => {
  const date = new Date(booking.date).toLocaleDateString('en-IN');
  
  let emailContent = `
    <h2>New Booking Enquiry - ${booking.formType}</h2>
    <hr>
    <p><strong>Date:</strong> ${date}</p>
    <p><strong>Name:</strong> ${booking.name}</p>
    <p><strong>Phone:</strong> ${booking.phone}</p>
    <p><strong>Email:</strong> ${booking.email}</p>
    <p><strong>Guests:</strong> ${booking.guests}</p>
    <p><strong>Total Price:</strong> ₹${booking.totalPrice}</p>
  `;
  
  // Add form-specific fields
  if (booking.cruiseType) {
    emailContent += `<p><strong>Cruise Type:</strong> ${booking.cruiseType}</p>`;
  }
  
  if (booking.slot) {
    emailContent += `<p><strong>Slot:</strong> ${booking.slot}</p>`;
  }
  
  if (booking.destination) {
    emailContent += `<p><strong>Destination:</strong> ${booking.destination}</p>`;
  }
  
  if (booking.cruise) {
    emailContent += `<p><strong>Cruise Vessel:</strong> ${booking.cruise}</p>`;
  }
  
  if (booking.cabins) {
    emailContent += `<p><strong>Cabins:</strong> ${booking.cabins}</p>`;
  }
  
  if (booking.message) {
    emailContent += `<p><strong>Special Request:</strong> ${booking.message}</p>`;
  }
  
  emailContent += `
    <hr>
    <p><strong>Booking ID:</strong> ${booking._id}</p>
    <p><strong>Submitted:</strong> ${new Date(booking.createdAt).toLocaleString('en-IN')}</p>
    <p><a href="${process.env.FRONTEND_URL}/admin/bookings">View in Admin Panel</a></p>
  `;
  
  return {
    subject: `New ${booking.formType} Booking - ${booking.name}`,
    html: emailContent
  };
};

// Send booking email to owner
exports.sendBookingEmail = async (booking) => {
  try {
    const emailContent = formatBookingEmail(booking);
    
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: process.env.ADMIN_EMAIL,
      subject: emailContent.subject,
      html: emailContent.html
    };
    
    // Log email attempt
    const emailLog = new EmailLog({
      to: process.env.ADMIN_EMAIL,
      subject: emailContent.subject,
      bookingId: booking._id,
      formType: booking.formType,
      status: 'pending'
    });
    
    await emailLog.save();
    
    // Send email
    await transporter.sendMail(mailOptions);
    
    // Update log status
    emailLog.status = 'sent';
    emailLog.sentAt = new Date();
    await emailLog.save();
    
    console.log(`Email sent for booking ${booking._id}`);
    return true;
    
  } catch (error) {
    console.error('Email sending error:', error);
    
    // Update log with error
    if (emailLog) {
      emailLog.status = 'failed';
      emailLog.error = error.message;
      await emailLog.save();
    }
    
    return false;
  }
};