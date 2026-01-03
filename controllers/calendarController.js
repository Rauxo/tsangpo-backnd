const CalendarConfig = require('../models/CalendarConfig');

// Get calendar configuration
exports.getCalendarConfig = async (req, res) => {
  try {
    const config = await CalendarConfig.findOne().sort({ updatedAt: -1 });
    if (!config) {
      // Create default empty config
      const defaultConfig = await CalendarConfig.create({
        availableDates: [],
        blockedDates: []
      });
      return res.json({ success: true, config: defaultConfig });
    }
    
    res.json({ success: true, config });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching calendar config' });
  }
};

// Update calendar configuration
exports.updateCalendarConfig = async (req, res) => {
  try {
    const configData = req.body;
    configData.updatedAt = new Date();
    
    // Convert string dates to Date objects
    if (configData.availableDates) {
      configData.availableDates = configData.availableDates.map(date => new Date(date));
    }
    
    if (configData.blockedDates) {
      configData.blockedDates = configData.blockedDates.map(blocked => ({
        date: new Date(blocked.date),
        reason: blocked.reason
      }));
    }
    
    const config = await CalendarConfig.findOneAndUpdate(
      {},
      configData,
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    
    res.json({ success: true, config });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error updating calendar config' });
  }
};

// Check date availability
exports.checkDateAvailability = async (req, res) => {
  try {
    const { date } = req.params;
    const config = await CalendarConfig.findOne().sort({ updatedAt: -1 });
    
    if (!config) {
      return res.json({ success: true, available: true });
    }
    
    const checkDate = new Date(date);
    
    // Check if date is in available dates
    const isAvailable = config.availableDates.some(availDate => 
      availDate.toDateString() === checkDate.toDateString()
    );
    
    if (!isAvailable) {
      return res.json({ success: true, available: false, reason: 'Date not in available dates' });
    }
    
    // Check if date is blocked
    const isBlocked = config.blockedDates.some(blocked => 
      blocked.date.toDateString() === checkDate.toDateString()
    );
    
    res.json({ 
      success: true, 
      available: !isBlocked,
      reason: isBlocked ? 'Date is blocked' : 'Available'
    });
    
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error checking date availability' });
  }
};