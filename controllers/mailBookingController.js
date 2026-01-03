import MailBooking from '../models/MailBooking.js';
import PriceConfig from '../models/PriceConfig.js';
import CalendarConfig from '../models/CalendarConfig.js';
import nodemailer from 'nodemailer';

// Email transporter setup
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});
// PRICE CONFIGURATION FUNCTIONS
export const getPriceConfig = async (req, res) => {
  try {
    const priceConfig = await PriceConfig.findOne().sort({ createdAt: -1 });
    
    if (!priceConfig) {
      const defaultConfig = await PriceConfig.create({
        basePrice: 8000,
        includedGuests: 1,
        extraGuestPrice: 300,
        maxGuests: 150,
        shortCruiseSlots: [
          { label: "Midway Dining Cruise", time: "12:30 PM – 02:30 PM", price: 5000, enabled: true },
          { label: "Sunset Serenity Cruise", time: "03:30 PM – 05:00 PM", price: 6000, enabled: true },
          { label: "Moonlight Cruise", time: "07:00 PM – 09:00 PM", price: 7000, enabled: true }
        ],
        addons: {
          decoration: { label: "Special Decoration", price: 2000, enabled: true },
          photography: { label: "Professional Photography", price: 3000, enabled: true },
          catering: { label: "Premium Catering", price: 5000, enabled: true }
        },
        formSpecificPricing: {
          tsangpoImperialPrivate: { basePrice: 12000 },
          publicCharterLong: { basePrice: 15000 },
          privateCharter: { basePrice: 10000, shortCruisePrice: 6000 },
          overnightCruise: { basePrice: 25000, perCabinPrice: 5000 },
          privateCruiseBooking: { basePrice: 18000 }
        }
      });
      return res.status(200).json({
        success: true,
        config: defaultConfig
      });
    }
    
    res.status(200).json({
      success: true,
      config: priceConfig
    });
  } catch (error) {
    console.error("Error fetching price config:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching price configuration",
      error: error.message
    });
  }
};

export const updatePriceConfig = async (req, res) => {
  try {
    const updates = req.body;
    
    let priceConfig = await PriceConfig.findOne().sort({ createdAt: -1 });
    
    if (!priceConfig) {
      priceConfig = await PriceConfig.create(updates);
    } else {
      // Update existing config
      Object.keys(updates).forEach(key => {
        if (key === 'shortCruiseSlots' && Array.isArray(updates[key])) {
          priceConfig.shortCruiseSlots = updates[key];
        } else if (key === 'addons' && typeof updates[key] === 'object') {
          priceConfig.addons = updates[key];
        } else if (key === 'formSpecificPricing' && typeof updates[key] === 'object') {
          priceConfig.formSpecificPricing = updates[key];
        } else {
          priceConfig[key] = updates[key];
        }
      });
      await priceConfig.save();
    }
    
    res.status(200).json({
      success: true,
      message: "Price configuration updated successfully",
      config: priceConfig
    });
  } catch (error) {
    console.error("Error updating price config:", error);
    res.status(500).json({
      success: false,
      message: "Error updating price configuration",
      error: error.message
    });
  }
};

// CALENDAR CONFIGURATION FUNCTIONS
export const getCalendarConfig = async (req, res) => {
  try {
    const calendarConfig = await CalendarConfig.findOne().sort({ createdAt: -1 });
    
    if (!calendarConfig) {
      const defaultConfig = await CalendarConfig.create({
        availableDates: [],
        blockedDates: [],
        settings: {
          minAdvanceDays: 1,
          maxAdvanceDays: 365,
          allowSameDay: false
        }
      });
      return res.status(200).json({
        success: true,
        config: defaultConfig
      });
    }
    
    res.status(200).json({
      success: true,
      config: calendarConfig
    });
  } catch (error) {
    console.error("Error fetching calendar config:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching calendar configuration",
      error: error.message
    });
  }
};

export const updateCalendarConfig = async (req, res) => {
  try {
    const updates = req.body;
    
    let calendarConfig = await CalendarConfig.findOne().sort({ createdAt: -1 });
    
    if (!calendarConfig) {
      calendarConfig = await CalendarConfig.create(updates);
    } else {
      Object.keys(updates).forEach(key => {
        calendarConfig[key] = updates[key];
      });
      await calendarConfig.save();
    }
    
    res.status(200).json({
      success: true,
      message: "Calendar configuration updated successfully",
      config: calendarConfig
    });
  } catch (error) {
    console.error("Error updating calendar config:", error);
    res.status(500).json({
      success: false,
      message: "Error updating calendar configuration",
      error: error.message
    });
  }
};

export const addAvailableDate = async (req, res) => {
  try {
    const { date } = req.body;
    
    if (!date) {
      return res.status(400).json({
        success: false,
        message: "Date is required"
      });
    }
    
    let calendarConfig = await CalendarConfig.findOne().sort({ createdAt: -1 });
    
    if (!calendarConfig) {
      calendarConfig = await CalendarConfig.create({
        availableDates: [new Date(date)],
        blockedDates: [],
        settings: { minAdvanceDays: 1, maxAdvanceDays: 365, allowSameDay: false }
      });
    } else {
      // Check if date already exists
      const dateExists = calendarConfig.availableDates.some(d => 
        new Date(d).toDateString() === new Date(date).toDateString()
      );
      
      if (!dateExists) {
        calendarConfig.availableDates.push(new Date(date));
        calendarConfig.availableDates.sort((a, b) => new Date(a) - new Date(b));
        await calendarConfig.save();
      }
    }
    
    res.status(200).json({
      success: true,
      message: "Available date added successfully",
      config: calendarConfig
    });
  } catch (error) {
    console.error("Error adding available date:", error);
    res.status(500).json({
      success: false,
      message: "Error adding available date",
      error: error.message
    });
  }
};

export const removeAvailableDate = async (req, res) => {
  try {
    const { index } = req.params;
    
    const calendarConfig = await CalendarConfig.findOne().sort({ createdAt: -1 });
    
    if (!calendarConfig) {
      return res.status(404).json({
        success: false,
        message: "Calendar configuration not found"
      });
    }
    
    if (index >= 0 && index < calendarConfig.availableDates.length) {
      calendarConfig.availableDates.splice(index, 1);
      await calendarConfig.save();
    }
    
    res.status(200).json({
      success: true,
      message: "Available date removed successfully",
      config: calendarConfig
    });
  } catch (error) {
    console.error("Error removing available date:", error);
    res.status(500).json({
      success: false,
      message: "Error removing available date",
      error: error.message
    });
  }
};

export const addBlockedDate = async (req, res) => {
  try {
    const { date, reason } = req.body;
    
    if (!date) {
      return res.status(400).json({
        success: false,
        message: "Date is required"
      });
    }
    
    let calendarConfig = await CalendarConfig.findOne().sort({ createdAt: -1 });
    
    if (!calendarConfig) {
      calendarConfig = await CalendarConfig.create({
        availableDates: [],
        blockedDates: [{ date: new Date(date), reason: reason || "Maintenance" }],
        settings: { minAdvanceDays: 1, maxAdvanceDays: 365, allowSameDay: false }
      });
    } else {
      // Check if date already blocked
      const dateExists = calendarConfig.blockedDates.some(b => 
        new Date(b.date).toDateString() === new Date(date).toDateString()
      );
      
      if (!dateExists) {
        calendarConfig.blockedDates.push({
          date: new Date(date),
          reason: reason || "Maintenance"
        });
        calendarConfig.blockedDates.sort((a, b) => new Date(a.date) - new Date(b.date));
        await calendarConfig.save();
      }
    }
    
    res.status(200).json({
      success: true,
      message: "Blocked date added successfully",
      config: calendarConfig
    });
  } catch (error) {
    console.error("Error adding blocked date:", error);
    res.status(500).json({
      success: false,
      message: "Error adding blocked date",
      error: error.message
    });
  }
};

export const removeBlockedDate = async (req, res) => {
  try {
    const { index } = req.params;
    
    const calendarConfig = await CalendarConfig.findOne().sort({ createdAt: -1 });
    
    if (!calendarConfig) {
      return res.status(404).json({
        success: false,
        message: "Calendar configuration not found"
      });
    }
    
    if (index >= 0 && index < calendarConfig.blockedDates.length) {
      calendarConfig.blockedDates.splice(index, 1);
      await calendarConfig.save();
    }
    
    res.status(200).json({
      success: true,
      message: "Blocked date removed successfully",
      config: calendarConfig
    });
  } catch (error) {
    console.error("Error removing blocked date:", error);
    res.status(500).json({
      success: false,
      message: "Error removing blocked date",
      error: error.message
    });
  }
};

// Calculate dynamic price based on form type
const calculateDynamicPrice = async (formType, formData) => {
  try {
    // Get latest price config
    const priceConfig = await PriceConfig.findOne().sort({ updatedAt: -1 });
    if (!priceConfig) {
      throw new Error('Price configuration not found');
    }

    const guests = parseInt(formData.guests) || 1;
    let totalPrice = 0;
    let basePrice = priceConfig.basePrice;
    const extraGuestPrice = priceConfig.extraGuestPrice;
    const includedGuests = priceConfig.includedGuests || 1;
    
    const priceBreakdown = {
      baseAmount: 0,
      extraGuests: 0,
      extraGuestsAmount: 0,
      slotPrice: 0,
      cabinPrice: 0
    };

    // Calculate based on form type
    switch(formType) {
      case 'tsangpo-imperial-private':
        basePrice = priceConfig.formSpecificPricing?.tsangpoImperialPrivate?.basePrice || basePrice;
        priceBreakdown.baseAmount = basePrice;
        totalPrice = basePrice;
        
        // Add extra guests charge
        if (guests > includedGuests) {
          const extraGuests = guests - includedGuests;
          priceBreakdown.extraGuests = extraGuests;
          priceBreakdown.extraGuestsAmount = extraGuests * extraGuestPrice;
          totalPrice += priceBreakdown.extraGuestsAmount;
        }
        break;

      case 'public-charter-long':
        basePrice = priceConfig.formSpecificPricing?.publicCharterLong?.basePrice || basePrice;
        priceBreakdown.baseAmount = basePrice;
        totalPrice = basePrice;
        
        // Add extra guests charge
        if (guests > includedGuests) {
          const extraGuests = guests - includedGuests;
          priceBreakdown.extraGuests = extraGuests;
          priceBreakdown.extraGuestsAmount = extraGuests * extraGuestPrice;
          totalPrice += priceBreakdown.extraGuestsAmount;
        }
        break;

      case 'private-charter':
        basePrice = priceConfig.formSpecificPricing?.privateCharter?.basePrice || basePrice;
        
        // If it's a short cruise with slot
        if (formData.cruiseType === 'short' && formData.slot) {
          const slot = priceConfig.shortCruiseSlots?.find(s => s.label === formData.slot);
          if (slot && slot.enabled) {
            priceBreakdown.baseAmount = slot.price;
            priceBreakdown.slotPrice = slot.price;
            totalPrice = slot.price;
          } else {
            priceBreakdown.baseAmount = basePrice;
            totalPrice = basePrice;
          }
        } else {
          priceBreakdown.baseAmount = basePrice;
          totalPrice = basePrice;
        }
        
        // Add extra guests charge
        if (guests > includedGuests) {
          const extraGuests = guests - includedGuests;
          priceBreakdown.extraGuests = extraGuests;
          priceBreakdown.extraGuestsAmount = extraGuests * extraGuestPrice;
          totalPrice += priceBreakdown.extraGuestsAmount;
        }
        break;

      case 'overnight-cruise':
        basePrice = priceConfig.formSpecificPricing?.overnightCruise?.basePrice || basePrice;
        const perCabinPrice = priceConfig.formSpecificPricing?.overnightCruise?.perCabinPrice || 0;
        
        priceBreakdown.baseAmount = basePrice;
        totalPrice = basePrice;
        
        // Add cabin charges
        const cabins = parseInt(formData.cabins) || 1;
        if (cabins > 1 && perCabinPrice > 0) {
          priceBreakdown.cabinPrice = (cabins - 1) * perCabinPrice;
          totalPrice += priceBreakdown.cabinPrice;
        }
        
        // Add extra guests charge
        if (guests > includedGuests) {
          const extraGuests = guests - includedGuests;
          priceBreakdown.extraGuests = extraGuests;
          priceBreakdown.extraGuestsAmount = extraGuests * extraGuestPrice;
          totalPrice += priceBreakdown.extraGuestsAmount;
        }
        break;

      case 'private-cruise-booking':
        basePrice = priceConfig.formSpecificPricing?.privateCruiseBooking?.basePrice || basePrice;
        priceBreakdown.baseAmount = basePrice;
        totalPrice = basePrice;
        
        // Add extra guests charge
        if (guests > includedGuests) {
          const extraGuests = guests - includedGuests;
          priceBreakdown.extraGuests = extraGuests;
          priceBreakdown.extraGuestsAmount = extraGuests * extraGuestPrice;
          totalPrice += priceBreakdown.extraGuestsAmount;
        }
        break;

      default:
        priceBreakdown.baseAmount = basePrice;
        totalPrice = basePrice;
    }

    return {
      basePrice: basePrice,
      extraGuestPrice: extraGuestPrice,
      perGuestPrice: extraGuestPrice,
      totalPrice: Math.round(totalPrice),
      priceBreakdown: priceBreakdown
    };

  } catch (error) {
    console.error('Price calculation error:', error);
    // Return default price if calculation fails
    return {
      basePrice: 8000,
      extraGuestPrice: 300,
      perGuestPrice: 300,
      totalPrice: 8000 + (Math.max((parseInt(formData.guests) || 1) - 1, 0) * 300),
      priceBreakdown: {
        baseAmount: 8000,
        extraGuests: Math.max((parseInt(formData.guests) || 1) - 1, 0),
        extraGuestsAmount: Math.max((parseInt(formData.guests) || 1) - 1, 0) * 300
      }
    };
  }
};

// Check date availability dynamically
const checkDateAvailability = async (date) => {
  try {
    const calendarConfig = await CalendarConfig.findOne().sort({ updatedAt: -1 });
    if (!calendarConfig) return { available: true, reason: 'No calendar restrictions' };

    const checkDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check if date is in the past
    if (checkDate < today) {
      return { available: false, reason: 'Date is in the past' };
    }

    // Check min advance days
    const minAdvanceDays = calendarConfig.settings?.minAdvanceDays || 1;
    const minDate = new Date(today);
    minDate.setDate(today.getDate() + minAdvanceDays);
    
    if (checkDate < minDate && !calendarConfig.settings?.allowSameDay) {
      return { available: false, reason: `Booking must be made at least ${minAdvanceDays} day(s) in advance` };
    }

    // Check max advance days
    const maxAdvanceDays = calendarConfig.settings?.maxAdvanceDays || 365;
    const maxDate = new Date(today);
    maxDate.setDate(today.getDate() + maxAdvanceDays);
    
    if (checkDate > maxDate) {
      return { available: false, reason: `Booking cannot be made more than ${maxAdvanceDays} days in advance` };
    }

    // Check available dates
    if (calendarConfig.availableDates && calendarConfig.availableDates.length > 0) {
      const isAvailable = calendarConfig.availableDates.some(availDate => 
        new Date(availDate).toDateString() === checkDate.toDateString()
      );
      
      if (!isAvailable) {
        return { available: false, reason: 'Date not in available dates' };
      }
    }

    // Check blocked dates
    if (calendarConfig.blockedDates && calendarConfig.blockedDates.length > 0) {
      const isBlocked = calendarConfig.blockedDates.some(blocked => 
        new Date(blocked.date).toDateString() === checkDate.toDateString()
      );
      
      if (isBlocked) {
        const blockedReason = calendarConfig.blockedDates.find(b => 
          new Date(b.date).toDateString() === checkDate.toDateString()
        )?.reason || 'Date is blocked';
        return { available: false, reason: blockedReason };
      }
    }

    return { available: true, reason: 'Date is available' };

  } catch (error) {
    console.error('Date check error:', error);
    return { available: true, reason: 'Error checking date, proceeding with booking' };
  }
};

// Send email to owner with price details
const sendOwnerEmail = async (booking, priceData) => {
  try {
    const formNames = {
      'tsangpo-imperial-private': 'Tsangpo Imperial Private Booking',
      'public-charter-long': 'Public Charter Long Cruise Enquiry',
      'private-charter': 'Private Charter Enquiry',
      'overnight-cruise': 'Overnight Cruise Enquiry',
      'private-cruise-booking': 'Private Cruise Booking Form'
    };

    const mailOptions = {
      from: `"Cruise Booking System" <${process.env.EMAIL_USER}>`,
      to: process.env.OWNER_EMAIL || process.env.EMAIL_USER,
      subject: `📧 New ${formNames[booking.formType]} - ${booking.name} - ₹${priceData.totalPrice}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1e40af;">New Cruise Booking Enquiry</h2>
          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #374151;">${formNames[booking.formType]}</h3>
            <hr style="border: 1px solid #d1d5db;">
            
            <h4 style="color: #4b5563;">👤 Customer Details</h4>
            <p><strong>Name:</strong> ${booking.name}</p>
            <p><strong>Phone:</strong> ${booking.phone}</p>
            <p><strong>Email:</strong> ${booking.email}</p>
            
            <h4 style="color: #4b5563; margin-top: 20px;">💰 Price Details</h4>
            <div style="background: white; padding: 15px; border-radius: 6px; margin: 10px 0;">
              <p><strong>Base Price:</strong> ₹${priceData.basePrice}</p>
              <p><strong>Extra Guest Price:</strong> ₹${priceData.extraGuestPrice} per guest</p>
              <p><strong>Total Guests:</strong> ${booking.guests}</p>
              <p><strong>Extra Guests:</strong> ${priceData.priceBreakdown.extraGuests || 0}</p>
              <p><strong>Extra Guests Amount:</strong> ₹${priceData.priceBreakdown.extraGuestsAmount || 0}</p>
              ${priceData.priceBreakdown.slotPrice ? `<p><strong>Slot Price:</strong> ₹${priceData.priceBreakdown.slotPrice}</p>` : ''}
              ${priceData.priceBreakdown.cabinPrice ? `<p><strong>Extra Cabin Price:</strong> ₹${priceData.priceBreakdown.cabinPrice}</p>` : ''}
              <hr style="margin: 15px 0;">
              <p style="font-size: 18px; font-weight: bold; color: #059669;">
                <strong>Total Price:</strong> ₹${priceData.totalPrice}
              </p>
            </div>
            
            <h4 style="color: #4b5563; margin-top: 20px;">📅 Booking Details</h4>
            <p><strong>Date:</strong> ${new Date(booking.date).toLocaleDateString('en-IN')}</p>
            <p><strong>Guests:</strong> ${booking.guests}</p>
            
            ${booking.cruiseType ? `<p><strong>Cruise Type:</strong> ${booking.cruiseType}</p>` : ''}
            ${booking.slot ? `<p><strong>Slot:</strong> ${booking.slot}</p>` : ''}
            ${booking.destination ? `<p><strong>Destination:</strong> ${booking.destination}</p>` : ''}
            ${booking.cabins ? `<p><strong>Cabins:</strong> ${booking.cabins}</p>` : ''}
            ${booking.cruise ? `<p><strong>Cruise:</strong> ${booking.cruise}</p>` : ''}
            
            ${booking.message ? `
            <h4 style="color: #4b5563; margin-top: 20px;">📝 Special Request</h4>
            <p style="background: white; padding: 10px; border-radius: 4px;">${booking.message}</p>
            ` : ''}
          </div>
          
          <div style="margin-top: 30px; padding: 15px; background: #dbeafe; border-radius: 6px;">
            <p><strong>Booking ID:</strong> ${booking._id}</p>
            <p><strong>Form Type:</strong> ${formNames[booking.formType]}</p>
            <p><strong>Submitted:</strong> ${new Date(booking.createdAt).toLocaleString('en-IN')}</p>
            <p><strong>Status:</strong> ${booking.status}</p>
          </div>
          
          <div style="margin-top: 30px; color: #6b7280; font-size: 12px;">
            <p>This email was sent automatically from your website booking form.</p>
            <p>Price calculated based on current configuration.</p>
          </div>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Email sent to owner for booking ${booking._id}`);
    return true;
  } catch (error) {
    console.error('❌ Email sending failed:', error);
    return false;
  }
};

// Submit booking with dynamic pricing
export const submitBooking = async (req, res) => {
  try {
    const {
      formType,
      date,
      name,
      phone,
      email,
      guests,
      message,
      cruiseType,
      slot,
      destination,
      nights,
      checkIn,
      cabins,
      cruise
    } = req.body;

    // Validate required fields
    if (!formType || !date || !name || !phone || !email || !guests) {
      return res.status(400).json({
        success: false,
        message: 'Please fill all required fields'
      });
    }

    // Check date availability
    const dateAvailability = await checkDateAvailability(date);
    if (!dateAvailability.available) {
      return res.status(400).json({
        success: false,
        message: dateAvailability.reason
      });
    }

    // Calculate dynamic price
    const priceData = await calculateDynamicPrice(formType, {
      guests,
      cruiseType,
      slot,
      cabins,
      destination
    });

    // Create booking with price data
    const booking = new MailBooking({
      formType,
      date: new Date(date),
      name,
      phone,
      email,
      guests: parseInt(guests),
      message,
      cruiseType,
      slot,
      destination,
      nights,
      checkIn,
      cabins: cabins ? parseInt(cabins) : undefined,
      cruise,
      priceCalculation: priceData
    });

    await booking.save();

    // Send email to owner with price details
    await sendOwnerEmail(booking, priceData);

    res.status(201).json({
      success: true,
      message: 'Booking enquiry submitted successfully! We will contact you shortly.',
      bookingId: booking._id,
      price: priceData.totalPrice,
      priceBreakdown: priceData.priceBreakdown
    });

  } catch (error) {
    console.error('Booking submission error:', error);
    res.status(500).json({
      success: false,
      message: 'Error submitting booking. Please try again.'
    });
  }
};

// Get dynamic price calculation for a form (for frontend preview)
export const getPriceCalculation = async (req, res) => {
  try {
    const { formType, guests, cruiseType, slot, cabins, destination } = req.body;

    if (!formType || !guests) {
      return res.status(400).json({
        success: false,
        message: 'Form type and guests are required'
      });
    }

    const priceData = await calculateDynamicPrice(formType, {
      guests,
      cruiseType,
      slot,
      cabins,
      destination
    });

    res.json({
      success: true,
      priceData
    });
  } catch (error) {
    console.error('Price calculation error:', error);
    res.status(500).json({
      success: false,
      message: 'Error calculating price'
    });
  }
};

// Get date availability for frontend
export const checkDate = async (req, res) => {
  try {
    const { date } = req.params;
    
    if (!date) {
      return res.status(400).json({
        success: false,
        message: 'Date is required'
      });
    }

    const availability = await checkDateAvailability(date);
    
    res.json({
      success: true,
      ...availability
    });
  } catch (error) {
    console.error('Date check error:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking date availability'
    });
  }
};

// Get all bookings for admin
export const getBookings = async (req, res) => {
  try {
    const { page = 1, limit = 20, formType, status, fromDate, toDate } = req.query;
    
    const query = {};
    if (formType) query.formType = formType;
    if (status) query.status = status;
    
    if (fromDate || toDate) {
      query.date = {};
      if (fromDate) query.date.$gte = new Date(fromDate);
      if (toDate) query.date.$lte = new Date(toDate);
    }

    const bookings = await MailBooking.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await MailBooking.countDocuments(query);

    res.json({
      success: true,
      bookings,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get bookings error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching bookings'
    });
  }
};

// Update booking status
export const updateBookingStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminNotes } = req.body;

    const updateData = { 
      status, 
      updatedAt: new Date() 
    };
    
    if (adminNotes) {
      updateData.adminNotes = adminNotes;
    }

    const booking = await MailBooking.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    );

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    res.json({
      success: true,
      booking
    });
  } catch (error) {
    console.error('Update booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating booking'
    });
  }
};

// Get booking statistics
export const getBookingStats = async (req, res) => {
  try {
    const totalBookings = await MailBooking.countDocuments();
    const pendingBookings = await MailBooking.countDocuments({ status: 'pending' });
    const confirmedBookings = await MailBooking.countDocuments({ status: 'confirmed' });
    
    // Get total revenue
    const revenueResult = await MailBooking.aggregate([
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$priceCalculation.totalPrice' }
        }
      }
    ]);

    // Get bookings by form type
    const bookingsByType = await MailBooking.aggregate([
      {
        $group: {
          _id: '$formType',
          count: { $sum: 1 },
          totalRevenue: { $sum: '$priceCalculation.totalPrice' }
        }
      }
    ]);

    // Get recent bookings
    const recentBookings = await MailBooking.find()
      .sort({ createdAt: -1 })
      .limit(5);

    res.json({
      success: true,
      stats: {
        totalBookings,
        pendingBookings,
        confirmedBookings,
        totalRevenue: revenueResult[0]?.totalRevenue || 0,
        bookingsByType,
        recentBookings
      }
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching statistics'
    });
  }
};