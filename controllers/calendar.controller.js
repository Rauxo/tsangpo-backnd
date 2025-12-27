import CalendarSettings from "../models/calendarSettings.model.js";

export const getAvailableDates = async (req, res) => {
  try {
    const calendarSettings = await CalendarSettings.findOne().sort({ createdAt: -1 });
    
    if (!calendarSettings) {
      const defaultSettings = await CalendarSettings.create({
        availableDates: [],
        blockedDates: [],
        bookedDates: []
      });
      return res.status(200).json({
        success: true,
        data: {
          availableDates: [],
          blockedDates: [],
          bookedDates: []
        }
      });
    }
    
    const enabledAvailableDates = calendarSettings.availableDates
      .filter(date => date.available)
      .map(date => date.date);
    
    res.status(200).json({
      success: true,
      data: {
        availableDates: enabledAvailableDates,
        blockedDates: calendarSettings.blockedDates,
        bookedDates: calendarSettings.bookedDates
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching available dates",
      error: error.message
    });
  }
};

export const updateCalendarSettings = async (req, res) => {
  try {
    const { availableDates, blockedDates } = req.body;
    
    const formattedAvailableDates = availableDates.map(dateStr => ({
      date: new Date(dateStr),
      available: true
    }));
    
    const formattedBlockedDates = blockedDates.map(b => ({
      date: new Date(b.date),
      reason: b.reason
    }));
    
    const latestSettings = await CalendarSettings.findOne().sort({ createdAt: -1 });
    
    let calendarSettings;
    if (latestSettings) {
      latestSettings.availableDates = formattedAvailableDates;
      latestSettings.blockedDates = formattedBlockedDates;
      latestSettings.updatedBy = req.userId;
      calendarSettings = await latestSettings.save();
    } else {
      calendarSettings = await CalendarSettings.create({
        availableDates: formattedAvailableDates,
        blockedDates: formattedBlockedDates,
        bookedDates: [],
        updatedBy: req.userId
      });
    }
    
    res.status(200).json({
      success: true,
      message: "Calendar settings updated successfully",
      data: calendarSettings
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error updating calendar settings",
      error: error.message
    });
  }
};

export const checkDateAvailability = async (req, res) => {
  try {
    const { date } = req.params;
    const checkDate = new Date(date);
    
    const calendarSettings = await CalendarSettings.findOne().sort({ createdAt: -1 });
    
    if (!calendarSettings) {
      return res.status(200).json({
        success: true,
        available: false,
        message: "No calendar settings configured"
      });
    }
    
    const isAvailable = calendarSettings.availableDates.some(
      avail => new Date(avail.date).toDateString() === checkDate.toDateString() && avail.available
    );
    
    const isBlocked = calendarSettings.blockedDates.some(
      blocked => new Date(blocked.date).toDateString() === checkDate.toDateString()
    );
    
    const isBooked = calendarSettings.bookedDates.some(
      booked => new Date(booked.date).toDateString() === checkDate.toDateString()
    );
    
    const available = isAvailable && !isBlocked && !isBooked;
    
    res.status(200).json({
      success: true,
      available,
      message: available ? "Date is available" : "Date is not available"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error checking date availability",
      error: error.message
    });
  }
};