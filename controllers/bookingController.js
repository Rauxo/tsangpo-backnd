const Booking = require('../models/Booking');
const PriceConfig = require('../models/PriceConfig');
const CalendarConfig = require('../models/CalendarConfig');
const { sendBookingEmail } = require('./emailController');

// Calculate price based on form type and guest count
const calculatePrice = async (formType, guests, additionalData = {}) => {
  const priceConfig = await PriceConfig.findOne().sort({ updatedAt: -1 });
  if (!priceConfig) return 0;

  let total = priceConfig.basePrice;
  
  // Calculate extra guest charges
  if (guests > priceConfig.includedGuests) {
    const extraGuests = guests - priceConfig.includedGuests;
    total += extraGuests * priceConfig.extraGuestPrice;
  }
  
  // Add form-specific calculations
  switch(formType) {
    case 'PrivateCharterEnquiry':
      if (additionalData.cruiseType === 'short' && additionalData.slot) {
        const slot = priceConfig.shortCruiseSlots.find(s => s.label === additionalData.slot);
        if (slot && slot.enabled) {
          total = slot.price;
          // Add extra guest charges for short cruise
          if (guests > priceConfig.includedGuests) {
            total += (guests - priceConfig.includedGuests) * priceConfig.extraGuestPrice;
          }
        }
      }
      break;
      
    case 'OvernightCruiseEnquiry':
      // Overnight cruise might have different pricing
      // You can add custom logic here
      break;
  }
  
  return total;
};

// Check if date is available
const checkDateAvailability = async (date) => {
  const calendarConfig = await CalendarConfig.findOne().sort({ updatedAt: -1 });
  if (!calendarConfig) return true;

  const checkDate = new Date(date);
  
  // Check if date is in available dates
  const isAvailable = calendarConfig.availableDates.some(availDate => 
    availDate.toDateString() === checkDate.toDateString()
  );
  
  if (!isAvailable) return false;
  
  // Check if date is blocked
  const isBlocked = calendarConfig.blockedDates.some(blocked => 
    blocked.date.toDateString() === checkDate.toDateString()
  );
  
  return !isBlocked;
};

// Submit booking
exports.submitBooking = async (req, res) => {
  try {
    const { formType, formData } = req.body;
    
    // Check date availability
    const isDateAvailable = await checkDateAvailability(formData.date);
    if (!isDateAvailable) {
      return res.status(400).json({
        success: false,
        message: 'Selected date is not available. Please choose another date.'
      });
    }
    
    // Calculate price
    const totalPrice = await calculatePrice(formType, formData.guests, formData);
    
    // Create booking
    const booking = new Booking({
      formType,
      date: formData.date,
      name: formData.name,
      phone: formData.phone,
      email: formData.email,
      guests: formData.guests,
      message: formData.message,
      cruiseType: formData.cruiseType,
      slot: formData.slot,
      destination: formData.destination,
      nights: formData.nights,
      checkIn: formData.checkIn,
      cabins: formData.cabins,
      cruise: formData.cruise,
      basePrice: (await PriceConfig.findOne().sort({ updatedAt: -1 }))?.basePrice || 8000,
      extraGuestPrice: (await PriceConfig.findOne().sort({ updatedAt: -1 }))?.extraGuestPrice || 300,
      totalPrice,
      metadata: {
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      }
    });
    
    await booking.save();
    
    // Send email to owner
    await sendBookingEmail(booking);
    
    res.status(201).json({
      success: true,
      message: 'Booking submitted successfully! We will contact you shortly.',
      bookingId: booking._id,
      totalPrice
    });
    
  } catch (error) {
    console.error('Booking submission error:', error);
    res.status(500).json({
      success: false,
      message: 'Error submitting booking'
    });
  }
};

// Get all bookings (for admin)
exports.getBookings = async (req, res) => {
  try {
    const { formType, status, startDate, endDate } = req.query;
    let filter = {};
    
    if (formType) filter.formType = formType;
    if (status) filter.status = status;
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }
    
    const bookings = await Booking.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, bookings });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching bookings' });
  }
};

// Update booking status
exports.updateBookingStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    const booking = await Booking.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );
    
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }
    
    res.json({ success: true, booking });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error updating booking' });
  }
};